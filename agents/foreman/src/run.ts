/**
 * Verification job runner — the heart of the Lead Verifier.
 *
 * Flow:
 *   1. Decompose criteria into one subtask per Criterion bucket.
 *   2. For each subtask:
 *        a. Look up the right specialist via SPECIALIST_REGISTRY.
 *        b. POST /work → 402 → paidPost handles the x402 retry.
 *        c. Specialist returns a signed Verdict.
 *   3. Aggregate: pass iff ALL specialist verdicts pass.
 *   4. Call Escrow.submitVerdict(jobId, passed, verdictURI). The contract
 *      auto-releases USDC on pass.
 *   5. Write reputation feedback for each specialist + the freelancer.
 *   6. Emit `job.completed` with the aggregate verdict + escrow tx.
 */
import type { Hex } from "viem";
import {
  VerdictSchema,
  type AggregateVerdict,
  type JobRequest,
  type JobResult,
  type SwarmEvent,
  type Bid,
} from "@herd/shared/types";
import { decompose } from "./decompose.js";
import { solicitBids, rankBids } from "./dispatch.js";
import { paidPost } from "./pay.js";
import { submitVerdict } from "./release.js";
import { postFeedback } from "./feedback.js";

type Emit = (e: SwarmEvent) => void;

export async function runJob(
  jobId: string,
  req: JobRequest,
  emit: Emit,
): Promise<JobResult> {
  emit({
    type: "job.created",
    jobId,
    escrowJobId: req.escrowJobId,
    criteria: req.criteria,
    at: Date.now(),
  });

  // 1. Decompose criteria into subtasks
  const subtasks = await decompose({
    escrowJobId: req.escrowJobId,
    deliverableUrl: req.deliverableUrl,
    deliverableHash: req.deliverableHash,
    criteria: req.criteria,
  });
  emit({ type: "job.decomposed", jobId, subtasks, at: Date.now() });

  // 2. Dispatch specialists (in parallel for speed — the demo lives or dies here)
  const ledger: JobResult["ledger"] = [];
  const verdicts: AggregateVerdict["verdicts"] = [];
  let totalFees = 0n;

  for (const st of subtasks) {
    const bids = await solicitBids(st);
    for (const bid of bids) {
      emit({ type: "bid.received", jobId, subtaskId: st.id, bid, at: Date.now() });
    }
    if (bids.length === 0) {
      throw new Error(`no specialist for ${st.id} (${st.skill})`);
    }
    const winner: Bid = await rankBids(bids);
    emit({ type: "bid.selected", jobId, subtaskId: st.id, winner, at: Date.now() });

    emit({
      type: "payment.required",
      jobId,
      subtaskId: st.id,
      specialist: st.skill,
      amountUsdc: winner.priceUsdc,
      payTo: winner.agentAddress as `0x${string}`,
      at: Date.now(),
    });

    const { data, settlement } = await paidPost<{ verdict: unknown }>(
      `${winner.endpoint}/work`,
      { spec: st.spec },
      { maxPriceUsdc: winner.priceUsdc },
    );

    if (settlement.txHash) {
      emit({
        type: "payment.settled",
        jobId,
        subtaskId: st.id,
        specialist: st.skill,
        txHash: settlement.txHash as `0x${string}`,
        blockNumber: settlement.blockNumber,
        at: Date.now(),
      });
    }

    const verdictParsed = VerdictSchema.safeParse(data.verdict);
    if (!verdictParsed.success) {
      throw new Error(
        `specialist ${st.skill} returned invalid verdict: ${verdictParsed.error.message}`,
      );
    }
    const verdict = verdictParsed.data;

    emit({
      type: "verdict.received",
      jobId,
      subtaskId: st.id,
      specialist: st.skill,
      verdict,
      at: Date.now(),
    });

    verdicts.push({ subtaskId: st.id, skill: st.skill, verdict });
    ledger.push({
      subtaskId: st.id,
      skill: st.skill,
      specialistAgentId: winner.agentId,
      verdict,
      settlement,
    });
    totalFees += BigInt(Math.round(Number(winner.priceUsdc) * 1_000_000));
  }

  // 3. Aggregate
  const allPass = verdicts.every((v) => v.verdict.pass);
  const reasoning = allPass
    ? "All specialist verdicts passed; releasing escrow."
    : `Failed criteria: ${verdicts.filter((v) => !v.verdict.pass).map((v) => v.skill).join(", ")}.`;
  const aggregate: AggregateVerdict = { pass: allPass, verdicts, reasoning };

  // 4. Submit to escrow (auto-releases on pass)
  const escrowJobIdBig = BigInt(req.escrowJobId);
  let escrowTxHash: Hex | undefined;
  let releasedAmountUsdc: string | undefined;
  try {
    const r = await submitVerdict(escrowJobIdBig, aggregate);
    escrowTxHash = r.txHash;
    releasedAmountUsdc = r.releasedAmountUsdc;
    if (allPass) {
      emit({
        type: "escrow.released",
        jobId,
        escrowJobId: req.escrowJobId,
        amountUsdc: releasedAmountUsdc ?? "0",
        freelancer: "0x0000000000000000000000000000000000000000",
        txHash: r.txHash,
        at: Date.now(),
      });
    } else {
      emit({
        type: "escrow.disputed",
        jobId,
        escrowJobId: req.escrowJobId,
        reason: reasoning,
        txHash: r.txHash,
        at: Date.now(),
      });
    }
  } catch (err) {
    console.warn("[lead-verifier] escrow submitVerdict failed:", err);
  }

  // 5. Reputation feedback (best-effort — never blocks the demo)
  for (const entry of ledger) {
    try {
      const { txHash } = await postFeedback(
        BigInt(entry.specialistAgentId),
        entry.skill,
        entry.verdict.pass,
      );
      emit({
        type: "feedback.posted",
        jobId,
        agentId: entry.specialistAgentId,
        role: "specialist",
        txHash,
        value: entry.verdict.pass ? 100 : -50,
        at: Date.now(),
      });
    } catch (err) {
      console.warn("[lead-verifier] feedback failed:", err);
    }
  }

  // 6. Compile result
  const totalFeesUsdc = formatUsdc(totalFees);
  const result: JobResult = {
    jobId,
    escrowJobId: req.escrowJobId,
    verdict: aggregate,
    ledger,
    totalSpecialistFeesUsdc: totalFeesUsdc,
    escrowTxHash,
    releasedAmountUsdc,
  };

  emit({
    type: "job.completed",
    jobId,
    verdict: aggregate,
    escrowTxHash,
    releasedAmount: releasedAmountUsdc,
    at: Date.now(),
  });

  return result;
}

function formatUsdc(amount: bigint): string {
  const s = amount.toString().padStart(7, "0");
  return `${s.slice(0, -6)}.${s.slice(-6).replace(/0+$/, "") || "0"}`;
}
