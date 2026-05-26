"use client";
import {
  Bot,
  ChevronRight,
  Mail,
  Search,
  Network,
  Sparkles,
  AlertOctagon,
  ShieldCheck,
  Coins,
  Hash,
  Check,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { shortHash, formatRelative } from "@/lib/utils";
import type { AgentAction } from "@/lib/types";

const iconByKind: Record<AgentAction["kind"], React.ComponentType<{ className?: string }>> = {
  intake: Search,
  track: Search,
  classify: Brain,
  plan: Sparkles,
  draft_email: Mail,
  send_email: Mail,
  send_a2a: Network,
  await: ChevronRight,
  parse_response: Mail,
  negotiate: Bot,
  escalate: AlertOctagon,
  fraud_check: ShieldCheck,
  settle_payment: Coins,
  register_identity: Hash,
  update_reputation: Sparkles,
  decide: Brain,
  complete: Check,
};

export function ActionList({ actions }: { actions: AgentAction[] }) {
  return (
    <div className="space-y-2">
      {actions.length === 0 && (
        <p className="text-sm text-muted-foreground">No actions yet.</p>
      )}
      {actions.map((a) => {
        const Icon = iconByKind[a.kind] ?? Bot;
        return (
          <div
            key={a.id}
            className="rounded-md border border-border bg-card/40 px-3 py-2.5 flex items-start gap-3 hover:bg-secondary/40 transition-colors"
          >
            <div className="p-1.5 rounded border border-border bg-rex-orange/10 text-rex-orange shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {formatRelative(a.ts)}
                </span>
              </div>
              {a.detail && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {a.detail}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={a.ok ? "success" : "danger"}>
                  {a.kind.replace(/_/g, " ")}
                </Badge>
                {typeof a.confidence === "number" && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    conf {(a.confidence * 100).toFixed(0)}%
                  </span>
                )}
                {a.txHash && (
                  <a
                    href={`https://explorer.goat.network/tx/${a.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-rex-cyan hover:underline"
                  >
                    {shortHash(a.txHash, 8, 4)}
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
