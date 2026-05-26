/**
 * Refund strategy engine + action planner.
 *
 * Pure function: given a case snapshot, returns the next best action.
 * The orchestrator loops calling planner.next() until it returns a terminal
 * action (`complete`, `escalate_final`, or `fraud_block`).
 */
import type { CaseStatus, DisputeCase, ResolutionType } from "@/lib/types";

export type PlannedAction =
  | { kind: "track_shipment"; reason: string }
  | { kind: "classify"; reason: string }
  | { kind: "fraud_check"; reason: string }
  | { kind: "contact_merchant"; tone: "professional" | "firm" | "empathetic"; channel: "email" | "a2a"; attempt: number; reason: string }
  | { kind: "await_response"; expectMs: number; reason: string }
  | { kind: "negotiate"; counterTarget: ResolutionType; reason: string }
  | { kind: "escalate"; level: 1 | 2 | 3; reason: string }
  | { kind: "settle_payment"; amount: number; reason: string }
  | { kind: "register_identity"; reason: string }
  | { kind: "complete"; resolution: ResolutionType; reason: string }
  | { kind: "noop"; reason: string };

export interface PlannerState {
  attempts: number;            // how many merchant contacts so far
  lastDecisionTs?: number;
  merchantFriendliness?: number; // 0..1
  acceptsA2A?: boolean;
  fraudFlagged?: boolean;
}

export const planner = {
  next(c: DisputeCase, state: PlannerState): PlannedAction {
    if (state.fraudFlagged) {
      return {
        kind: "complete",
        resolution: "denied",
        reason: "Fraud signals exceeded threshold — case auto-blocked.",
      };
    }

    switch (c.status) {
      case "intake":
        return {
          kind: "track_shipment",
          reason: "Confirm latest carrier status before contacting merchant.",
        };
      case "investigating":
        if (!c.category || c.category === "other")
          return { kind: "classify", reason: "Issue category not yet classified." };
        return {
          kind: "fraud_check",
          reason: "Run fraud + abuse pre-checks before outbound contact.",
        };
      case "contacting_merchant": {
        const attempt = state.attempts + 1;
        const channel = state.acceptsA2A ? "a2a" : "email";
        const tone =
          attempt >= 3 ? "firm" : attempt === 2 ? "professional" : "empathetic";
        return {
          kind: "contact_merchant",
          tone,
          channel,
          attempt,
          reason: `Attempt #${attempt} via ${channel.toUpperCase()} (tone: ${tone}).`,
        };
      }
      case "awaiting_response":
        // After waiting, the orchestrator will move us forward.
        return {
          kind: "await_response",
          expectMs: 1200,
          reason: "Waiting for merchant reply window.",
        };
      case "negotiating":
        return {
          kind: "negotiate",
          counterTarget: "full_refund",
          reason: "Push back on partial offer; target full refund.",
        };
      case "escalating": {
        const level = state.attempts >= 4 ? 3 : state.attempts >= 3 ? 2 : 1;
        return {
          kind: "escalate",
          level: level as 1 | 2 | 3,
          reason: `Escalation level ${level} — merchant unresponsive.`,
        };
      }
      case "resolved_refund":
      case "resolved_replacement":
      case "resolved_partial":
        return {
          kind: "settle_payment",
          amount: c.feeUsd > 0 ? c.feeUsd : 0.1,
          reason: "Capture resolution fee via x402.",
        };
      default:
        return { kind: "noop", reason: "Terminal state — nothing to plan." };
    }
  },

  /** Suggest the next CaseStatus after a given action. */
  advance(c: DisputeCase, action: PlannedAction): CaseStatus {
    if (action.kind === "track_shipment") return "investigating";
    if (action.kind === "classify") return "investigating";
    if (action.kind === "fraud_check") return "contacting_merchant";
    if (action.kind === "contact_merchant") return "awaiting_response";
    if (action.kind === "await_response") return "negotiating";
    if (action.kind === "negotiate") return c.status;
    if (action.kind === "escalate") return "escalating";
    if (action.kind === "settle_payment") return c.status;
    if (action.kind === "complete") {
      if (action.resolution === "full_refund") return "resolved_refund";
      if (action.resolution === "replacement") return "resolved_replacement";
      if (action.resolution === "partial_refund") return "resolved_partial";
      if (action.resolution === "denied") return "rejected";
      return c.status;
    }
    return c.status;
  },
};
