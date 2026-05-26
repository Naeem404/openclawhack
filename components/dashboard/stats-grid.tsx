"use client";
import {
  Briefcase,
  DollarSign,
  Bot,
  Clock,
} from "lucide-react";
import { StatTile } from "@/components/shared/stat-tile";
import { usePoll } from "@/lib/hooks/use-poll";

interface Stats {
  counts: { total: number; open: number; resolved: number };
  money: { totalRecoveredUsd: number; totalFeesUsd: number; avgRecoveryUsd: number };
  averages: { confidence: number; hoursSavedPerCase: number };
}

export function StatsGrid() {
  const { data } = usePoll<Stats>("/api/stats", 3000);
  const s = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile
        label="Active cases"
        value={s?.counts.open ?? 0}
        hint={`${s?.counts.resolved ?? 0} resolved / ${s?.counts.total ?? 0} total`}
        tone="orange"
        icon={Briefcase}
      />
      <StatTile
        label="Recovered (USD)"
        value={`$${(s?.money.totalRecoveredUsd ?? 0).toLocaleString()}`}
        hint={`avg $${(s?.money.avgRecoveryUsd ?? 0).toFixed(2)} / case`}
        tone="emerald"
        delta="+12.4% / day"
        icon={DollarSign}
      />
      <StatTile
        label="Agent confidence"
        value={`${Math.round((s?.averages.confidence ?? 0) * 100)}%`}
        hint="rolling avg across open cases"
        tone="cyan"
        icon={Bot}
      />
      <StatTile
        label="Hours saved"
        value={`${((s?.counts.total ?? 0) * (s?.averages.hoursSavedPerCase ?? 0)).toFixed(1)}h`}
        hint="vs. manual human dispute"
        tone="violet"
        icon={Clock}
      />
    </div>
  );
}
