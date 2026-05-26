/**
 * RefundRex orchestrator — the autonomous control loop.
 *
 * Pipeline per case:
 *   intake → track → classify → fraud-check → contact merchant
 *          → await response → parse → (negotiate | escalate | settle)
 *          → on-chain receipt → x402 fee capture → reputation update.
 *
 * Each step:
 *   1. Asks the planner what's next.
 *   2. Dispatches the corresponding OpenClaw skill or chain call.
 *   3. Records an AgentAction + timeline event + emits live logs.
 *   4. Persists structured facts into agent memory.
 *
 * Designed to be safe to call multiple times — the planner is idempotent
 * relative to case.status, and steps that already ran are no-ops.
 */
import { nanoid } from "nanoid";
import { caseStore } from "@/lib/store/cases";
import { log } from "@/lib/store/events";
import { memory } from "@/lib/agent/memory";
import { planner, type PlannedAction } from "@/lib/agent/planner";
import { fraudCheck } from "@/lib/agent/fraud";
import { runtime } from "@/lib/openclaw/runtime";
import { ensureSkillsRegistered } from "@/lib/openclaw/skills";
import { x402 } from "@/lib/chain/x402";
import { merchantApi } from "@/lib/merchant/mock";
import { merchantsById } from "@/data/seed-merchants";
import { sleep, randomBetween } from "@/lib/utils";
import { config } from "@/lib/config";
import type {
  AgentAction,
  CaseStatus,
  DisputeCase,
  IssueCategory,
} from "@/lib/types";

ensureSkillsRegistered();

interface StepResult {
  action: AgentAction;
  nextStatus: CaseStatus;
  terminal: boolean;
}

async function pause() {
  if (!config.demo.enabled) return;
  await sleep(randomBetween(config.demo.actionDelayMs[0], config.demo.actionDelayMs[1]));
}

async function settleInline(caseId: string, fee: number) {
  const receipt = await runtime.dispatch<
    { caseId: string; amount: number; payer?: string },
    Awaited<ReturnType<typeof x402.charge>>
  >("x402_settle", { caseId, amount: fee }, caseId);
  pushAction(caseId, "settle_payment", `x402 fee captured · $${fee.toFixed(2)}`, {
    detail: `paymentId=${receipt.paymentId} · ${receipt.token}`,
    confidence: 1,
    txHash: receipt.txHash,
  });
  caseStore.pushTimeline(caseId, {
    type: "payment",
    title: `x402 payment captured · $${fee.toFixed(2)} ${receipt.token}`,
    body: `tx=${receipt.txHash}`,
    actorRole: "chain",
    meta: { paymentId: receipt.paymentId, txHash: receipt.txHash },
  });
  pushAction(caseId, "complete", "Case closed", {
    detail: "Resolution finalized + on-chain receipt anchored.",
    confidence: 1,
  });
}

function pushAction(
  caseId: string,
  kind: AgentAction["kind"],
  title: string,
  partial: Partial<AgentAction> = {},
): AgentAction {
  const a: AgentAction = {
    id: "act_" + nanoid(8),
    caseId,
    ts: new Date().toISOString(),
    kind,
    title,
    ok: true,
    ...partial,
  };
  caseStore.pushAction(caseId, a);
  return a;
}

export const orchestrator = {
  /** Single step. Returns whether the case has reached a terminal state. */
  async step(caseId: string): Promise<{
    done: boolean;
    action?: AgentAction;
    state: CaseStatus;
  }> {
    const c = caseStore.get(caseId);
    if (!c) throw new Error("case not found");
    if (isTerminal(c.status)) {
      return { done: true, state: c.status };
    }

    const mem = memory.get(c.agentMemoryKey);
    const merchant = merchantsById[c.order.merchantId];
    const planned = planner.next(c, {
      attempts: mem.attempts,
      acceptsA2A: !!merchant?.agentEndpoint,
      merchantFriendliness: merchant?.refundFriendliness,
      fraudFlagged: !!mem.facts.fraudFlagged,
    });

    log("planner", "think", `🧠  ${planned.kind} — ${planned.reason}`, c.id);
    await pause();

    const result = await dispatch(c, planned);
    const next = result.nextStatus;

    caseStore.update(caseId, { status: next });
    caseStore.pushTimeline(caseId, {
      type: "agent_action",
      title: result.action.title,
      body: result.action.detail,
      actorRole: "agent",
      meta: { kind: result.action.kind, txHash: result.action.txHash },
    });
    return { done: result.terminal, action: result.action, state: next };
  },

  /** Run autonomous loop with sane bounded iterations. */
  async run(caseId: string, maxSteps = 14): Promise<DisputeCase> {
    for (let i = 0; i < maxSteps; i++) {
      const { done } = await this.step(caseId);
      if (done) break;
    }
    return caseStore.get(caseId)!;
  },
};

function isTerminal(status: CaseStatus): boolean {
  return [
    "resolved_refund",
    "resolved_replacement",
    "resolved_partial",
    "rejected",
    "fraud_blocked",
  ].includes(status);
}

async function dispatch(c: DisputeCase, action: PlannedAction): Promise<StepResult> {
  switch (action.kind) {
    case "track_shipment": {
      const shipment = await runtime.dispatch<
        { tracking: string; carrier: string },
        Awaited<ReturnType<typeof merchantApi.trackShipment>>
      >("track_shipment", {
        tracking: c.order.trackingNumber,
        carrier: c.order.carrier,
      }, c.id);
      caseStore.update(c.id, { shipment });
      const a = pushAction(c.id, "track", "Tracked shipment", {
        detail: `Carrier status: ${shipment.status} · last event: ${shipment.events.at(-1)?.status ?? "n/a"}`,
        confidence: 0.95,
      });
      memory.remember(c.agentMemoryKey, {
        shipmentStatus: shipment.status,
      });
      return { action: a, nextStatus: "investigating", terminal: false };
    }

    case "classify": {
      const cls = await runtime.dispatch<
        { note: string; order: typeof c.order; shipment: typeof c.shipment },
        {
          category: IssueCategory;
          severity: typeof c.severity;
          confidence: number;
          successProbability: number;
          reasoning: string;
        }
      >("classify_issue", {
        note: c.customerNote ?? "",
        order: c.order,
        shipment: c.shipment,
      }, c.id);
      caseStore.update(c.id, {
        category: cls.category,
        severity: cls.severity,
        confidence: cls.confidence,
        successProbability: cls.successProbability,
      });
      const a = pushAction(c.id, "classify", `Classified as ${cls.category}`, {
        detail: `${cls.reasoning} · severity=${cls.severity} · p(success)=${(cls.successProbability * 100).toFixed(0)}%`,
        confidence: cls.confidence,
      });
      memory.remember(c.agentMemoryKey, { category: cls.category });
      return { action: a, nextStatus: "investigating", terminal: false };
    }

    case "fraud_check": {
      const f = fraudCheck(c);
      memory.remember(c.agentMemoryKey, { fraudFlagged: f.flagged, fraudSignals: f.signals });
      const a = pushAction(c.id, "fraud_check", f.flagged ? "Fraud check FAILED" : "Fraud check passed", {
        detail: f.signals.length ? `Signals: ${f.signals.join(" · ")} (score ${f.score})` : `Score ${f.score}`,
        confidence: 0.9,
        ok: !f.flagged,
      });
      if (f.flagged) {
        caseStore.update(c.id, { status: "fraud_blocked", resolution: "denied" });
        return { action: a, nextStatus: "fraud_blocked", terminal: true };
      }
      return { action: a, nextStatus: "contacting_merchant", terminal: false };
    }

    case "contact_merchant": {
      const merchant = merchantsById[c.order.merchantId];
      const supportEmail = merchant?.supportEmail ?? "support@unknown";
      const draft = await runtime.dispatch<
        { order: typeof c.order; category: IssueCategory; tone: typeof action.tone; attempt: number },
        { subject: string; body: string; tone: string }
      >("draft_support_email", {
        order: c.order,
        category: c.category,
        tone: action.tone,
        attempt: action.attempt,
      }, c.id);

      pushAction(c.id, "draft_email", `Drafted ${draft.tone} email`, {
        detail: draft.subject,
        confidence: 0.88,
      });

      let outboundTitle = "";
      let outboundDetail = "";
      if (action.channel === "a2a" && merchant?.agentEndpoint) {
        const a2a = await runtime.dispatch<
          { merchantId: string; endpoint: string; payload: Record<string, unknown> },
          { accepted: boolean; counterOffer?: { type: string; amount?: number }; requestId: string; signature: string }
        >("agent_to_agent", {
          merchantId: merchant.id,
          endpoint: merchant.agentEndpoint,
          payload: {
            orderId: c.order.id,
            category: c.category,
            amount: c.order.amountUsd,
            tone: draft.tone,
            agent: "refundrex_bot",
          },
        }, c.id);
        outboundTitle = `Sent A2A dispute to ${merchant.name}`;
        outboundDetail = `signature=${a2a.signature.slice(0, 14)}… · request=${a2a.requestId} · accepted=${a2a.accepted}`;
        memory.remember(c.agentMemoryKey, {
          merchantOffer: a2a.counterOffer,
          a2aSignature: a2a.signature,
        });
      } else {
        await runtime.dispatch<
          { to: string; subject: string; body: string; orderId: string },
          { threadId: string; status: "sent" }
        >("send_support_email", {
          to: supportEmail,
          subject: draft.subject,
          body: draft.body,
          orderId: c.order.id,
        }, c.id);
        outboundTitle = `Emailed ${supportEmail}`;
        outboundDetail = `Tone: ${draft.tone} · attempt #${action.attempt}`;
      }

      memory.bumpAttempts(c.agentMemoryKey);
      const a = pushAction(c.id, "send_email", outboundTitle, {
        detail: outboundDetail,
        confidence: 0.86,
      });
      return { action: a, nextStatus: "awaiting_response", terminal: false };
    }

    case "await_response": {
      await pause();
      // Simulate parsing an inbound merchant reply. Use merchant friendliness.
      const merchant = merchantsById[c.order.merchantId];
      const friendliness = merchant?.refundFriendliness ?? 0.6;
      const rand = Math.random();
      let body = "";
      if (rand < friendliness * 0.7) {
        body = `Hi RefundRex,\n\nWe've approved a full refund of $${c.order.amountUsd.toFixed(2)} ${c.order.currency} for order ${c.order.id}. The refund has been processed to the original payment method.\n\n— ${merchant?.name ?? "Support"}`;
      } else if (rand < friendliness) {
        body = `Hello,\n\nUnfortunately we can only offer a partial refund of $${(c.order.amountUsd * 0.5).toFixed(2)} or a replacement. Please advise.\n\nThanks.`;
      } else if (rand < friendliness + 0.15) {
        body = `Hi,\n\nWe can offer store credit equivalent to $${c.order.amountUsd.toFixed(2)} but not a cash refund per policy.\n\nRegards.`;
      } else {
        body = `Per our policy, we cannot issue a refund for this order. The case is closed on our end.`;
      }
      const parsed = await runtime.dispatch<
        { body: string },
        ReturnType<typeof import("@/lib/merchant/parser").parseMerchantReply>
      >("parse_merchant_reply", { body }, c.id);

      memory.remember(c.agentMemoryKey, { lastMerchantBody: body, parsed });

      // Record both a merchant_message + a parse action
      caseStore.pushTimeline(c.id, {
        type: "merchant_message",
        title: `Reply from ${merchant?.name ?? "merchant"}`,
        body,
        actorRole: "merchant",
      });
      const a = pushAction(c.id, "parse_response", `Parsed merchant reply: ${parsed.decision}`, {
        detail: parsed.rationale,
        confidence: 0.8,
      });

      // Decide next status
      let nextStatus: CaseStatus = "negotiating";
      if (parsed.decision === "refund") nextStatus = "resolved_refund";
      else if (parsed.decision === "replacement") nextStatus = "resolved_replacement";
      else if (parsed.decision === "partial") nextStatus = "negotiating";
      else if (parsed.decision === "credit") nextStatus = "negotiating";
      else if (parsed.decision === "denied") nextStatus = "escalating";

      if (nextStatus === "resolved_refund" || nextStatus === "resolved_replacement") {
        const recovered = nextStatus === "resolved_refund" ? c.order.amountUsd : 0;
        const fee = x402.quote(Math.max(recovered, c.order.amountUsd * 0.25));
        caseStore.update(c.id, {
          status: nextStatus,
          resolution: nextStatus === "resolved_refund" ? "full_refund" : "replacement",
          recoveredAmountUsd: recovered,
          feeUsd: fee,
        });
        await settleInline(c.id, fee);
        return { action: a, nextStatus, terminal: true };
      }

      return { action: a, nextStatus, terminal: false };
    }

    case "negotiate": {
      const a = pushAction(c.id, "negotiate", "Counter-offer drafted", {
        detail:
          "Pushed back on partial offer with carrier evidence + ERC-8004 reputation proof.",
        confidence: 0.7,
      });
      // 65% the merchant accepts after a counter
      if (Math.random() < 0.65) {
        const fee = x402.quote(c.order.amountUsd);
        caseStore.update(c.id, {
          status: "resolved_refund",
          resolution: "full_refund",
          recoveredAmountUsd: c.order.amountUsd,
          feeUsd: fee,
        });
        await settleInline(c.id, fee);
        return { action: a, nextStatus: "resolved_refund", terminal: true };
      }
      const recovered = +(c.order.amountUsd * 0.5).toFixed(2);
      const fee = x402.quote(recovered);
      caseStore.update(c.id, {
        status: "resolved_partial",
        resolution: "partial_refund",
        recoveredAmountUsd: recovered,
        feeUsd: fee,
      });
      await settleInline(c.id, fee);
      return { action: a, nextStatus: "resolved_partial", terminal: true };
    }

    case "escalate": {
      const a = pushAction(c.id, "escalate", `Escalated to L${action.level}`, {
        detail:
          action.level === 3
            ? "Filed chargeback intent + posted reputation update on-chain."
            : action.level === 2
              ? "Routed to merchant's escalations channel with case dossier."
              : "Pinged secondary support address with sentiment-adjusted tone.",
        confidence: 0.75,
      });
      // L3 → resolve with partial
      if (action.level >= 3) {
        const recovered = +(c.order.amountUsd * 0.6).toFixed(2);
        const fee = x402.quote(recovered);
        caseStore.update(c.id, {
          status: "resolved_partial",
          resolution: "partial_refund",
          recoveredAmountUsd: recovered,
          feeUsd: fee,
        });
        await settleInline(c.id, fee);
        return { action: a, nextStatus: "resolved_partial", terminal: true };
      }
      return { action: a, nextStatus: "contacting_merchant", terminal: false };
    }

    case "settle_payment": {
      // Settlement is invoked inline by resolution branches (await_response,
      // negotiate, escalate). This branch exists for completeness if the
      // planner ever returns settle_payment standalone — replay last fee.
      const fee = c.feeUsd > 0 ? c.feeUsd : x402.quote(c.recoveredAmountUsd);
      await settleInline(c.id, fee);
      const a: AgentAction = {
        id: "act_settle",
        caseId: c.id,
        ts: new Date().toISOString(),
        kind: "settle_payment",
        title: `x402 replay · $${fee.toFixed(2)}`,
        ok: true,
        confidence: 1,
      };
      return { action: a, nextStatus: c.status, terminal: true };
    }

    case "register_identity": {
      const r = await runtime.dispatch<
        Record<string, never>,
        Awaited<ReturnType<typeof import("@/lib/chain/erc8004").erc8004.register>>
      >("erc8004_register", {}, c.id);
      const a = pushAction(c.id, "register_identity", "Registered on ERC-8004", {
        detail: `agentId=#${r.agentId} · ${r.txHash.slice(0, 12)}…`,
        txHash: r.txHash,
        confidence: 1,
      });
      return { action: a, nextStatus: c.status, terminal: false };
    }

    case "complete":
    case "noop":
    default: {
      const a = pushAction(c.id, "complete", "Case closed", {
        detail: "No further action required.",
        confidence: 1,
      });
      return { action: a, nextStatus: c.status, terminal: true };
    }
  }
}

