import { NextResponse } from "next/server";
import { caseStore } from "@/lib/store/cases";
import { reputation } from "@/lib/store/reputation";

export const dynamic = "force-dynamic";

export async function GET() {
  const cases = caseStore.list();
  const resolved = cases.filter((c) =>
    ["resolved_refund", "resolved_replacement", "resolved_partial"].includes(c.status),
  );
  const open = cases.filter((c) =>
    !["resolved_refund", "resolved_replacement", "resolved_partial", "rejected", "fraud_blocked"].includes(
      c.status,
    ),
  );
  const totalRecovered = resolved.reduce((s, c) => s + c.recoveredAmountUsd, 0);
  const totalFees = resolved.reduce((s, c) => s + c.feeUsd, 0);
  const avgConfidence =
    cases.length === 0
      ? 0
      : cases.reduce((s, c) => s + c.confidence, 0) / cases.length;

  return NextResponse.json({
    counts: {
      total: cases.length,
      open: open.length,
      resolved: resolved.length,
    },
    money: {
      totalRecoveredUsd: +totalRecovered.toFixed(2),
      totalFeesUsd: +totalFees.toFixed(2),
      avgRecoveryUsd:
        resolved.length === 0
          ? 0
          : +(totalRecovered / resolved.length).toFixed(2),
    },
    averages: {
      confidence: +avgConfidence.toFixed(2),
      hoursSavedPerCase: 1.4, // conservative human-equivalent estimate
    },
    reputation: reputation.current(),
  });
}
