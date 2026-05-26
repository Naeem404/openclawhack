import type { AgentReputation, DisputeCase } from "@/lib/types";
import { caseStore } from "@/lib/store/cases";
import { chainStore } from "@/lib/store/chain";

function computeReputation(cases: DisputeCase[]): AgentReputation {
  const wallet = chainStore.getWallet();
  const resolved = cases.filter((c) =>
    ["resolved_refund", "resolved_replacement", "resolved_partial"].includes(
      c.status,
    ),
  );
  const handled = cases.length;
  const refunds = resolved.length;
  const totalRecovered = resolved.reduce(
    (s, c) => s + (c.recoveredAmountUsd || 0),
    0,
  );
  const successRate = handled > 0 ? refunds / handled : 0;
  const avgHours =
    resolved.length === 0
      ? 0
      : resolved.reduce((s, c) => {
          const opened = new Date(c.openedAt).getTime();
          const closed = new Date(c.updatedAt).getTime();
          return s + (closed - opened) / 36e5;
        }, 0) / resolved.length;
  // Trust score: weighted blend, scaled to 0..100
  const trustScore = Math.round(
    Math.min(
      100,
      55 +
        successRate * 30 +
        Math.min(refunds, 30) * 0.5 +
        Math.min(totalRecovered / 50, 8),
    ),
  );

  return {
    agentId: "refundrex_bot",
    walletAddress: wallet.address,
    erc8004Id: wallet.erc8004Id,
    casesHandled: handled,
    refundsRecovered: refunds,
    totalRecoveredUsd: +totalRecovered.toFixed(2),
    successRate: +successRate.toFixed(3),
    averageResolutionHours: +avgHours.toFixed(1),
    stars: +(3.5 + successRate * 1.5).toFixed(1),
    endorsements: refunds * 3 + Math.floor(totalRecovered / 25),
    trustScore,
  };
}

export const reputation = {
  current(): AgentReputation {
    return computeReputation(caseStore.list());
  },
};
