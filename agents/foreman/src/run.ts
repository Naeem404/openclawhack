/**
 * Job runner — the heart of the Foreman.
 * Implements packets P06 + P07.
 *
 * Sub-agent task list:
 *   1. Topologically sort subtasks by `dependsOn`.
 *   2. For each subtask in order:
 *      a. solicitBids → rankBids → winner
 *      b. Merge subtask.spec with parent artifacts (key by dependsOn id → artifact)
 *      c. paidPost(`${winner.endpoint}/work`, { spec }, { maxPriceUsdc, wallet })
 *      d. Emit events: bid.received (per bid), bid.selected, payment.required,
 *         payment.settled, artifact.produced.
 *      e. Track totalSpentUsdc — abort if it would exceed budget.
 *   3. After loop: emit feedback.posted per specialist (call postFeedback).
 *   4. Emit job.completed with the final deliverable.
 */
import { randomUUID } from "node:crypto";
import type { Hex } from "viem";
import {
  type JobRequest,
  type JobResult,
  type SwarmEvent,
  type Subtask,
  type Bid,
} from "@herd/shared/types";
import { decompose } from "./decompose.js";
import { solicitBids, rankBids } from "./dispatch.js";
import { paidPost } from "./pay.js";
import { postFeedback } from "./feedback.js";

type Emit = (e: SwarmEvent) => void;

export async function runJob(
  jobId: string,
  req: JobRequest,
  emit: Emit,
): Promise<JobResult> {
  emit({ type: "job.created", jobId, brief: req.brief, budgetUsdc: req.budgetUsdc, at: Date.now() });

  // 1. Decompose
  const subtasks = await decompose(req.brief, req.budgetUsdc);
  emit({ type: "job.decomposed", jobId, subtasks, at: Date.now() });

  // 2. Topological order
  const ordered = topoSort(subtasks);

  // 3. Execute
  const ledger: JobResult["ledger"] = [];
  const artifactsById = new Map<string, unknown>();
  let totalSpent = 0;
  const budget = Number(req.budgetUsdc);

  for (const st of ordered) {
    // Solicit + rank
    const bids = await solicitBids(st);
    for (const bid of bids) {
      emit({ type: "bid.received", jobId, subtaskId: st.id, bid, at: Date.now() });
    }
    if (bids.length === 0) {
      throw new Error(`no bids for subtask ${st.id} (${st.skill})`);
    }
    const winner: Bid = await rankBids(bids);
    emit({ type: "bid.selected", jobId, subtaskId: st.id, winner, at: Date.now() });

    // Budget guard
    const price = Number(winner.priceUsdc);
    if (totalSpent + price > budget) {
      throw new Error(`budget exceeded: ${totalSpent + price} > ${budget} USDC`);
    }

    // Build spec with parent artifacts
    const parentSpecs: Record<string, unknown> = {};
    for (const dep of st.dependsOn) {
      parentSpecs[dep] = artifactsById.get(dep);
    }
    const spec = { ...st.spec, _inputs: parentSpecs };

    emit({
      type: "payment.required",
      jobId,
      subtaskId: st.id,
      amountUsdc: winner.priceUsdc,
      payTo: winner.agentAddress as `0x${string}`,
      at: Date.now(),
    });

    const { data, settlement } = await paidPost<{ artifact: unknown }>(
      `${winner.endpoint}/work`,
      { spec },
      { maxPriceUsdc: winner.priceUsdc },
    );

    if (settlement.txHash) {
      emit({
        type: "payment.settled",
        jobId,
        subtaskId: st.id,
        txHash: settlement.txHash as `0x${string}`,
        blockNumber: settlement.blockNumber,
        at: Date.now(),
      });
    }
    emit({ type: "artifact.produced", jobId, subtaskId: st.id, artifact: data.artifact, at: Date.now() });

    artifactsById.set(st.id, data.artifact);
    ledger.push({
      subtaskId: st.id,
      agentId: winner.agentId,
      artifact: data.artifact,
      settlement,
    });
    totalSpent += price;
  }

  // 4. Reputation feedback
  const startedAt = Date.now();
  for (const entry of ledger) {
    const st = ordered.find((s) => s.id === entry.subtaskId);
    if (!st) continue;
    try {
      const { txHash } = await postFeedback(BigInt(entry.agentId), st.skill, true, Date.now() - startedAt);
      emit({ type: "feedback.posted", jobId, specialistAgentId: entry.agentId, txHash, value: 100, at: Date.now() });
    } catch (err) {
      console.warn("[foreman] feedback failed:", err);
    }
  }

  // 5. Compile deliverable: last artifact wins
  const last = ledger[ledger.length - 1];
  const deliverable = last?.artifact ?? null;
  const receipts = ledger.map((l) => l.settlement.txHash).filter(Boolean) as Hex[];

  const result: JobResult = {
    jobId,
    deliverable,
    ledger,
    totalSpentUsdc: totalSpent.toFixed(6),
  };
  emit({
    type: "job.completed",
    jobId,
    deliverable,
    totalSpentUsdc: result.totalSpentUsdc,
    receipts,
    at: Date.now(),
  });

  return result;
}

/** Kahn's algorithm. */
function topoSort(subtasks: Subtask[]): Subtask[] {
  const byId = new Map(subtasks.map((s) => [s.id, s]));
  const indeg = new Map<string, number>();
  for (const s of subtasks) indeg.set(s.id, s.dependsOn.length);
  const queue = subtasks.filter((s) => (indeg.get(s.id) ?? 0) === 0).map((s) => s.id);
  const out: Subtask[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const s = byId.get(id);
    if (s) out.push(s);
    for (const other of subtasks) {
      if (other.dependsOn.includes(id)) {
        const next = (indeg.get(other.id) ?? 0) - 1;
        indeg.set(other.id, next);
        if (next === 0) queue.push(other.id);
      }
    }
  }
  if (out.length !== subtasks.length) throw new Error("subtask cycle detected");
  return out;
}

export { randomUUID };
