import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "orange" | "cyan" | "emerald" | "violet" | "rose";

export function GlowCard({
  className,
  tone = "orange",
  children,
}: {
  className?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  const glow = {
    orange: "from-rex-orange/30 via-rex-amber/10 to-transparent",
    cyan: "from-rex-cyan/30 via-rex-cyan/10 to-transparent",
    emerald: "from-emerald-500/30 via-emerald-500/10 to-transparent",
    violet: "from-violet-500/30 via-violet-500/10 to-transparent",
    rose: "from-rose-500/30 via-rose-500/10 to-transparent",
  }[tone];

  return (
    <div className={cn("relative group", className)}>
      <div
        className={cn(
          "absolute -inset-px rounded-xl bg-gradient-to-br opacity-60 blur-md transition-opacity group-hover:opacity-100",
          glow,
        )}
      />
      <div className="relative rounded-xl border border-border bg-card/80 backdrop-blur-xl p-5">
        {children}
      </div>
    </div>
  );
}
