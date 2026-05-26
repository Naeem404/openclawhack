"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { AgentLogLine } from "@/lib/types";
import { useAgentLogs } from "@/lib/hooks/use-agent-logs";

const levelStyles: Record<AgentLogLine["level"], string> = {
  info: "text-zinc-300",
  warn: "text-amber-300",
  error: "text-rose-400",
  success: "text-emerald-300",
  think: "text-rex-cyan",
};
const levelBadge: Record<AgentLogLine["level"], string> = {
  info: "INFO",
  warn: "WARN",
  error: "FAIL",
  success: " OK ",
  think: "PLAN",
};

export function TerminalLog({
  height = 360,
  caseId,
  className,
}: {
  height?: number;
  caseId?: string;
  className?: string;
}) {
  const logs = useAgentLogs();
  const filtered = caseId ? logs.filter((l) => l.caseId === caseId) : logs;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [filtered.length]);

  return (
    <div
      className={cn(
        "scanline relative rounded-lg border border-border bg-black/60 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-gradient-to-r from-rex-orange/10 via-transparent to-rex-cyan/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground ml-3">
            refundrex@goat-mainnet:~$ tail -f /var/log/agent.log
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {filtered.length} events
        </span>
      </div>
      <div
        ref={ref}
        className="terminal p-3 overflow-y-auto"
        style={{ height }}
      >
        {filtered.length === 0 ? (
          <div className="text-muted-foreground typing">
            awaiting agent activity
          </div>
        ) : (
          filtered.map((l) => (
            <div key={l.id} className="terminal-line animate-fade-in-up">
              <span className="font-mono text-muted-foreground text-[10px]">
                {new Date(l.ts).toLocaleTimeString("en-US", {
                  hour12: false,
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 rounded border",
                  l.level === "success" && "border-emerald-500/40 text-emerald-300",
                  l.level === "info" && "border-zinc-700 text-zinc-400",
                  l.level === "warn" && "border-amber-500/40 text-amber-300",
                  l.level === "error" && "border-rose-500/40 text-rose-300",
                  l.level === "think" && "border-cyan-400/40 text-cyan-300",
                )}
              >
                {levelBadge[l.level]}
              </span>
              <span className={cn(levelStyles[l.level])}>
                <span className="text-muted-foreground">[{l.source}]</span>{" "}
                {l.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
