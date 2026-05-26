import { GlowCard } from "@/components/shared/glow-card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: string;
  tone?: "orange" | "cyan" | "emerald" | "violet" | "rose";
  icon?: LucideIcon;
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  tone = "orange",
  icon: Icon,
}: StatTileProps) {
  return (
    <GlowCard tone={tone}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            {label}
          </p>
          <p className="text-3xl font-semibold mt-2 tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {Icon && (
            <div
              className={cn(
                "p-2 rounded-md border border-border",
                tone === "orange" && "bg-rex-orange/10 text-rex-orange",
                tone === "cyan" && "bg-rex-cyan/10 text-rex-cyan",
                tone === "emerald" && "bg-emerald-500/10 text-emerald-300",
                tone === "violet" && "bg-violet-500/10 text-violet-300",
                tone === "rose" && "bg-rose-500/10 text-rose-300",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
          {delta && (
            <span className="text-[10px] font-mono text-emerald-300">
              {delta}
            </span>
          )}
        </div>
      </div>
    </GlowCard>
  );
}
