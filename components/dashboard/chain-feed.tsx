"use client";
import { ExternalLink, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePoll } from "@/lib/hooks/use-poll";
import { shortHash, formatRelative } from "@/lib/utils";
import type { ChainEvent } from "@/lib/types";

const typeLabel: Record<ChainEvent["type"], { label: string; tone: "default" | "cyan" | "success" | "warning" | "purple" }> = {
  erc8004_register: { label: "ERC-8004", tone: "purple" },
  erc8004_uri_update: { label: "URI", tone: "purple" },
  x402_payment: { label: "x402", tone: "cyan" },
  reputation_update: { label: "REPUTATION", tone: "warning" },
  settlement: { label: "SETTLE", tone: "success" },
  transfer: { label: "TRANSFER", tone: "default" },
};

export function ChainFeed() {
  const { data } = usePoll<{ events: ChainEvent[] }>("/api/chain/events", 2000);
  const events = data?.events ?? [];

  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-rex-cyan" />
          <h3 className="font-semibold text-sm">Live chain feed</h3>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          GOAT chain {`{2345}`}
        </span>
      </div>
      <div
        className="overflow-y-auto"
        style={{ maxHeight: 360 }}
      >
        {events.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            No on-chain activity yet.
          </div>
        )}
        {events.map((e) => (
          <div
            key={e.hash}
            className="px-5 py-2.5 border-b border-border/60 last:border-0 hover:bg-secondary/40 animate-fade-in-up grid grid-cols-12 gap-2 items-center"
          >
            <div className="col-span-2">
              <Badge variant={typeLabel[e.type].tone}>{typeLabel[e.type].label}</Badge>
            </div>
            <div className="col-span-4 font-mono text-xs">
              {shortHash(e.hash, 10, 6)}
            </div>
            <div className="col-span-2 text-xs">
              {e.amount ? `${e.amount} ${e.token ?? ""}` : "—"}
            </div>
            <div className="col-span-2 text-[11px] text-muted-foreground">
              blk #{e.block.toLocaleString()}
            </div>
            <div className="col-span-1 text-[11px]">
              {e.status === "confirmed" ? (
                <span className="text-emerald-300">●</span>
              ) : (
                <span className="text-amber-300 animate-pulse">◐</span>
              )}{" "}
              <span className="text-muted-foreground">{e.status}</span>
            </div>
            <div className="col-span-1 text-right">
              <a
                href={e.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="col-span-12 text-[10px] text-muted-foreground font-mono">
              {formatRelative(e.ts)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
