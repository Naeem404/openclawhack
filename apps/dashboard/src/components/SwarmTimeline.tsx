"use client";

import { useEffect, useRef } from "react";
import {
  Sparkles,
  ListChecks,
  Gavel,
  Wallet,
  CheckCircle2,
  Star,
  XCircle,
  PartyPopper,
  ShieldCheck,
  Upload,
  Banknote,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import type { SwarmEvent } from "@herd/shared/types";
import clsx from "clsx";

interface SwarmTimelineProps {
  events: SwarmEvent[];
}

type IconCmp = React.ComponentType<{ className?: string }>;

const ICON_MAP: Record<SwarmEvent["type"], IconCmp> = {
  "job.created":       Sparkles,
  "job.decomposed":    ListChecks,
  "job.completed":     PartyPopper,
  "job.failed":        XCircle,
  "bid.received":      Gavel,
  "bid.selected":      Gavel,
  "payment.required":  Wallet,
  "payment.settled":   CheckCircle2,
  "verdict.received":  ClipboardCheck,
  "escrow.funded":     ShieldCheck,
  "escrow.delivered":  Upload,
  "escrow.released":   Banknote,
  "escrow.disputed":   AlertTriangle,
  "feedback.posted":   Star,
};

const LABEL_MAP: Record<SwarmEvent["type"], string> = {
  "job.created":       "Verification job created",
  "job.decomposed":    "Criteria decomposed",
  "job.completed":     "Job completed",
  "job.failed":        "Job failed",
  "bid.received":      "Specialist quoted",
  "bid.selected":      "Specialist chosen",
  "payment.required":  "Payment required (HTTP 402)",
  "payment.settled":   "x402 payment settled",
  "verdict.received":  "Specialist verdict",
  "escrow.funded":     "Escrow funded",
  "escrow.delivered":  "Deliverable marked on-chain",
  "escrow.released":   "Escrow released to freelancer",
  "escrow.disputed":   "Escrow held for dispute",
  "feedback.posted":   "Reputation updated",
};

function explorerLink(txHash: string): string {
  return `https://explorer.testnet3.goat.network/tx/${txHash}`;
}

function shortAddr(s: string): string {
  return s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function EventDetail({ e }: { e: SwarmEvent }): React.ReactElement | null {
  switch (e.type) {
    case "job.created":
      return (
        <span className="text-zinc-400">
          escrow #{e.escrowJobId} · {e.criteria.length} criteria
        </span>
      );
    case "job.decomposed":
      return (
        <span className="text-zinc-400">
          {e.subtasks.length} specialist call{e.subtasks.length === 1 ? "" : "s"}: {e.subtasks.map((s) => s.skill).join(" + ")}
        </span>
      );
    case "bid.received":
      return (
        <span className="text-zinc-400">
          {e.bid.skill} · ${e.bid.priceUsdc} · agent #{e.bid.agentId}
        </span>
      );
    case "bid.selected":
      return (
        <span className="text-zinc-400">
          {e.winner.skill} @ ${e.winner.priceUsdc} (agent #{e.winner.agentId})
        </span>
      );
    case "payment.required":
      return (
        <span className="text-zinc-400">
          {e.specialist} requires ${e.amountUsdc} → <span className="font-mono text-xs">{shortAddr(e.payTo)}</span>
        </span>
      );
    case "payment.settled":
      return (
        <span className="text-zinc-400">
          {e.specialist} paid ·{" "}
          <a href={explorerLink(e.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-goat-gold hover:underline">
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "verdict.received":
      return (
        <span className={e.verdict.pass ? "text-emerald-300" : "text-red-300"}>
          {e.specialist}: {e.verdict.pass ? "✓ pass" : "✗ fail"} (conf {(e.verdict.confidence * 100).toFixed(0)}%) — {e.verdict.reasoning}
        </span>
      );
    case "escrow.funded":
      return (
        <span className="text-zinc-400">
          {e.amountUsdc} USDC locked ·{" "}
          <a href={explorerLink(e.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-goat-gold hover:underline">
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "escrow.delivered":
      return (
        <span className="text-zinc-400">
          deliverable URI captured on-chain ·{" "}
          <a href={explorerLink(e.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-goat-gold hover:underline">
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "escrow.released":
      return (
        <span className="text-emerald-300">
          {e.amountUsdc} USDC → freelancer ·{" "}
          <a href={explorerLink(e.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-goat-gold hover:underline">
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "escrow.disputed":
      return (
        <span className="text-amber-300">
          {e.reason} ·{" "}
          <a href={explorerLink(e.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-goat-gold hover:underline">
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "feedback.posted":
      return (
        <span className="text-zinc-400">
          {e.role} agent #{e.agentId} · {e.value > 0 ? `+${e.value}` : e.value} rep ·{" "}
          <a href={explorerLink(e.txHash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-goat-gold hover:underline">
            {shortAddr(e.txHash)} ↗
          </a>
        </span>
      );
    case "job.completed":
      return (
        <span className="text-zinc-400">
          {e.verdict.pass ? "all criteria passed" : "criteria failed"}
          {e.releasedAmount ? ` · released $${e.releasedAmount}` : ""}
        </span>
      );
    case "job.failed":
      return <span className="text-red-400">{e.error}</span>;
    default:
      return null;
  }
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
        Awaiting deliverable. Standing by.
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
