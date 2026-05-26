"use client";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils";
import type { CaseTimelineEvent } from "@/lib/types";
import {
  Bot,
  User,
  Store,
  Link as LinkIcon,
  CreditCard,
  ActivityIcon,
} from "lucide-react";

const actorIcon = {
  agent: Bot,
  customer: User,
  merchant: Store,
  chain: LinkIcon,
  system: ActivityIcon,
} as const;
const actorTone = {
  agent: "from-rex-orange/40 to-rex-amber/20 border-rex-orange/40",
  customer: "from-violet-500/30 to-violet-500/10 border-violet-500/30",
  merchant: "from-rose-500/30 to-rose-500/10 border-rose-500/30",
  chain: "from-cyan-400/30 to-cyan-400/10 border-cyan-400/30",
  system: "from-zinc-500/30 to-zinc-500/10 border-zinc-500/30",
} as const;

export function CaseTimeline({ events }: { events: CaseTimelineEvent[] }) {
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-rex-orange via-border to-rex-cyan" />
      <ol className="space-y-3">
        {events.map((e) => {
          const Icon =
            e.type === "payment"
              ? CreditCard
              : actorIcon[e.actorRole] ?? ActivityIcon;
          return (
            <li
              key={e.id}
              className="relative pl-12 animate-fade-in-up"
            >
              <span
                className={cn(
                  "absolute left-0 top-0 grid place-items-center h-7 w-7 rounded-full border bg-gradient-to-br",
                  actorTone[e.actorRole],
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="rounded-md border border-border bg-card/50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{e.title}</p>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatRelative(e.ts)}
                  </span>
                </div>
                {e.body && (
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                    {e.body}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
