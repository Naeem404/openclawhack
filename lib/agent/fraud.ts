/**
 * Lightweight fraud + abuse pre-flight. Real prod would call a risk model;
 * the demo uses deterministic signals: claim frequency, account age proxy,
 * and disproportionate amount.
 */
import type { DisputeCase } from "@/lib/types";

const claimCountByEmail = new Map<string, number>();

export function fraudCheck(c: DisputeCase): {
  flagged: boolean;
  score: number;
  signals: string[];
} {
  const signals: string[] = [];
  let score = 0;

  // 1. Same-customer claim velocity
  const seen = (claimCountByEmail.get(c.order.customerEmail) ?? 0) + 1;
  claimCountByEmail.set(c.order.customerEmail, seen);
  if (seen > 3) {
    score += 0.4;
    signals.push(`${seen} active claims from this email`);
  }

  // 2. Disproportionate refund vs order
  if (c.order.amountUsd > 1000) {
    score += 0.15;
    signals.push("High order value — manual review recommended");
  }

  // 3. Note contains red-flag phrases
  const note = (c.customerNote ?? "").toLowerCase();
  if (
    note.includes("urgent") &&
    note.includes("crypto") &&
    !c.order.merchantName.toLowerCase().includes("crypto")
  ) {
    score += 0.25;
    signals.push("Unusual urgency + off-platform payment language");
  }

  // 4. Brand-new tracking number that already says delivered
  if (
    c.shipment.events.length < 2 &&
    c.shipment.status === "delivered"
  ) {
    score += 0.15;
    signals.push("Sparse tracking history with delivered status");
  }

  return {
    flagged: score >= 0.55,
    score: +score.toFixed(2),
    signals,
  };
}
