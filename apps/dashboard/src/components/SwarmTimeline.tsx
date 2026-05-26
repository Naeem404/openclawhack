"use client";

import { useEffect, useRef } from "react";
import {
  Sparkles,
  ListChecks,
  Gavel,
  Wallet,
  CheckCircle2,
  FileText,
  Star,
  XCircle,
  PartyPopper,
} from "lucide-react";
import type { SwarmEvent } from "@herd/shared/types";
import clsx from "clsx";

interface SwarmTimelineProps {
  events: SwarmEvent[];
}

const ICON_MAP: Record<SwarmEvent["type"], React.ComponentType<{ className?: string }>> = {
  "job.created":        Sparkles,
  "job.decomposed":     ListChecks,
  "bid.received":       Gavel,
  "bid.selected":       Gavel,
  "payment.required":   Wallet,
  "payment.settled":    CheckCircle2,
  "artifact.produced":  FileText,
  "feedback.posted":    Star,
  "job.completed":      PartyPopper,
  "job.failed":         XCircle,
};

const LABEL_MAP: Record<SwarmEvent["type"], string> = {
  "job.created":       "Job created",
  "job.decomposed":    "Plan decomposed",
  "bid.received":      "Bid received",
  "bid.selected":      "Bid selected",
  "payment.required":  "Payment required (HTTP 402)",
  "payment.settled":   "Payment settled on-chain",
  "artifact.produced": "Artifact delivered",
  "feedback.posted":   "Reputation feedback posted",
  "job.completed":     "Job completed",
  "job.failed":        "Job failed",
};

function explorerLink(txHash: string): string {
  return `https://explorer.testnet3.goat.network/tx/${txHash}`;
}

function EventDetail({ e }: { e: SwarmEvent }): React.ReactElement | null {
  switch (e.type) {
    case "job.created":
      return <span className="text-zinc-400">budget {e.budgetUsdc} USDC · &ldquo;{e.brief}&rdquo;</span>;
    case "job.decomposed":
      return (
        <span className="text-zinc-400">
          {e.subtasks.length} subtasks: {e.subtasks.map((s) => s.skill).join(" → ")}
        </span>
      );
    case "bid.received":
      return (
        <span className="text-zinc-400">
          {e.bid.skill} · {e.bid.priceUsdc} USDC · agent #{e.bid.agentId}
        </span>
      );
    case "bid.selected":
      return (
        <span className="text-zinc-400">
          winner {e.winner.skill} @ {e.winner.priceUsdc} USDC (agent #{e.winner.agentId})
        </span>
      );
    case "payment.required":
      return (
        <span className="text-zinc-400">
          {e.amountUsdc} USDC → <span className="font-mono text-xs">{shortAddr(e.payTo)}</span>
        </span>
      );
    case "payment.settled":
      return (
        <a
          href={explorerLink(e.txHash)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-goat-gold hover:underline"
        >
          {shortAddr(e.txHash)} ↗
        </a>
      );
    case "artifact.produced":
      return <span className="text-zinc-400">subtask {e.subtaskId} returned</span>;
    case "feedback.posted":
      return (
        <span className="text-zinc-400">
          agent #{e.specialistAgentId} · value {e.value} ·{" "}
          <a
            href={explorerLink(e.txHash)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-goat-gold hover:underline"
          >
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "job.completed":
      return (
        <span className="text-zinc-400">
          spent {e.totalSpentUsdc} USDC · {e.receipts.length} on-chain receipts
        </span>
      );
    case "job.failed":
      return <span className="text-red-400">{e.error}</span>;
    default:
      return null;
  }
}

function shortAddr(s: string): string {
  return s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

export default function SwarmTimeline({ events }: SwarmTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
        Awaiting prompt. The swarm sleeps.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[60vh] space-y-3 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur"
    >
      {events.map((e, i) => {
        const Icon = ICON_MAP[e.type];
        const isTerminal = e.type === "job.completed" || e.type === "job.failed";
        return (
          <div key={i} className="flex items-start gap-3">
            <div
              className={clsx(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
                isTerminal
                  ? "bg-goat-gold/15 text-goat-gold ring-goat-gold/40"
                  : "bg-zinc-800/60 text-zinc-300 ring-zinc-700",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{LABEL_MAP[e.type]}</div>
              <div className="mt-0.5 break-all text-xs">
                <EventDetail e={e} />
              </div>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">
              {new Date(e.at).toLocaleTimeString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
