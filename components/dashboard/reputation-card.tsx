"use client";
import { Star, Award, TrendingUp } from "lucide-react";
import { GlowCard } from "@/components/shared/glow-card";
import { Progress } from "@/components/ui/progress";
import { usePoll } from "@/lib/hooks/use-poll";
import type { AgentReputation } from "@/lib/types";

export function ReputationCard() {
  const { data } = usePoll<{ reputation: AgentReputation }>(
    "/api/wallet",
    3000,
  );
  const r = data?.reputation;
  if (!r) return null;

  return (
    <GlowCard tone="violet">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            On-chain Reputation
          </p>
          <p className="text-3xl font-semibold mt-2">{r.trustScore}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ERC-8004 · agentId #{r.erc8004Id ?? "—"}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < Math.round(r.stars) ? "text-rex-amber fill-rex-amber" : "text-zinc-700"}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 font-mono">
            {r.stars.toFixed(1)} / 5.0
          </span>
        </div>
      </div>

      <Progress value={r.trustScore} className="mb-4" />

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <Award className="h-3.5 w-3.5 mx-auto text-rex-amber" />
          <p className="text-base font-semibold mt-1">{r.endorsements}</p>
          <p className="text-[10px] uppercase font-mono text-muted-foreground">
            endorsements
          </p>
        </div>
        <div>
          <TrendingUp className="h-3.5 w-3.5 mx-auto text-emerald-300" />
          <p className="text-base font-semibold mt-1">
            {(r.successRate * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] uppercase font-mono text-muted-foreground">
            success rate
          </p>
        </div>
        <div>
          <Star className="h-3.5 w-3.5 mx-auto text-rex-cyan" />
          <p className="text-base font-semibold mt-1">
            {r.averageResolutionHours.toFixed(1)}h
          </p>
          <p className="text-[10px] uppercase font-mono text-muted-foreground">
            avg resolve
          </p>
        </div>
      </div>
    </GlowCard>
  );
}
