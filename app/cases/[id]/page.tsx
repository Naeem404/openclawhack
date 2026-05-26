"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  ExternalLink,
  Bot,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlowCard } from "@/components/shared/glow-card";
import { TerminalLog } from "@/components/shared/terminal-log";
import { CaseTimeline } from "@/components/case/timeline";
import { ActionList } from "@/components/case/action-list";
import { usePoll } from "@/lib/hooks/use-poll";
import { formatRelative, shortHash } from "@/lib/utils";
import type { DisputeCase } from "@/lib/types";

const statusColors: Record<string, "default" | "success" | "warning" | "danger" | "cyan" | "purple"> = {
  intake: "purple",
  investigating: "cyan",
  contacting_merchant: "cyan",
  negotiating: "warning",
  awaiting_response: "warning",
  escalating: "danger",
  resolved_refund: "success",
  resolved_replacement: "success",
  resolved_partial: "success",
  rejected: "danger",
  fraud_blocked: "danger",
};

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, reload } = usePoll<{ case: DisputeCase }>(
    `/api/cases/${params.id}`,
    1500,
  );
  const c = data?.case;
  const [stepping, setStepping] = React.useState(false);

  async function step() {
    setStepping(true);
    try {
      await fetch("/api/agent/step", {
        method: "POST",
        body: JSON.stringify({ caseId: params.id }),
        headers: { "content-type": "application/json" },
      });
      reload();
    } finally {
      setStepping(false);
    }
  }
  async function runFull() {
    setStepping(true);
    try {
      await fetch("/api/agent/run", {
        method: "POST",
        body: JSON.stringify({ caseId: params.id }),
        headers: { "content-type": "application/json" },
      });
      reload();
    } finally {
      setStepping(false);
    }
  }

  if (!c) {
    return (
      <div className="text-muted-foreground p-12 text-center">
        Loading case…
      </div>
    );
  }

  const terminal = [
    "resolved_refund",
    "resolved_replacement",
    "resolved_partial",
    "rejected",
    "fraud_blocked",
  ].includes(c.status);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> back to dashboard
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Header / order info ─────────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          <GlowCard tone="orange">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <Badge variant={statusColors[c.status] ?? "default"} className="mb-2">
                  {c.status.replace(/_/g, " ")}
                </Badge>
                <h1 className="text-2xl font-semibold">{c.order.itemName}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {c.order.merchantName} · order {c.order.id}
                </p>
                {c.customerNote && (
                  <p className="text-sm mt-3 leading-relaxed bg-secondary/40 rounded p-3 border border-border">
                    “{c.customerNote}”
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Button
                  onClick={runFull}
                  disabled={stepping || terminal}
                  size="sm"
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {terminal ? "Closed" : "Run to completion"}
                </Button>
                <Button
                  onClick={step}
                  disabled={stepping || terminal}
                  variant="outline"
                  size="sm"
                >
                  <Bot className="h-3.5 w-3.5 mr-1" />
                  Step once
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <KV label="Amount" value={`$${c.order.amountUsd.toFixed(2)} ${c.order.currency}`} />
              <KV label="Category" value={c.category.replace(/_/g, " ")} />
              <KV label="Severity" value={c.severity} />
              <KV label="Opened" value={formatRelative(c.openedAt)} />
              <KV
                label="Recovered"
                value={`$${c.recoveredAmountUsd.toFixed(2)}`}
                tone={c.recoveredAmountUsd > 0 ? "emerald" : undefined}
              />
              <KV label="Fee (x402)" value={`$${c.feeUsd.toFixed(2)}`} />
              <KV
                label="Confidence"
                value={`${(c.confidence * 100).toFixed(0)}%`}
              />
              <KV
                label="P(success)"
                value={`${(c.successProbability * 100).toFixed(0)}%`}
                tone="cyan"
              />
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono mb-1.5">
                <span>resolution progress</span>
                <span>
                  {Math.round(
                    progressFromStatus(c.status) * 100,
                  )}
                  %
                </span>
              </div>
              <Progress value={progressFromStatus(c.status) * 100} />
            </div>
          </GlowCard>

          {/* Tabs */}
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="actions">Agent actions</TabsTrigger>
              <TabsTrigger value="onchain">On-chain</TabsTrigger>
              <TabsTrigger value="shipment">Shipment</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <CaseTimeline events={c.timeline} />
            </TabsContent>
            <TabsContent value="actions">
              <ActionList actions={c.actions} />
            </TabsContent>
            <TabsContent value="onchain">
              <div className="space-y-2">
                {c.txHashes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No on-chain receipts anchored yet.
                  </p>
                )}
                {c.txHashes.map((h) => (
                  <a
                    key={h}
                    href={`https://explorer.goat.network/tx/${h}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2 hover:bg-secondary/40"
                  >
                    <span className="font-mono text-xs">{shortHash(h, 14, 8)}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      GOAT explorer{" "}
                      <ExternalLink className="inline h-3 w-3" />
                    </span>
                  </a>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="shipment">
              <div className="rounded-md border border-border bg-card/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-rex-cyan" />
                    <span className="font-medium text-sm">
                      {c.shipment.carrier} · {c.shipment.trackingNumber}
                    </span>
                  </div>
                  <Badge variant={c.shipment.status === "delivered" ? "success" : c.shipment.status === "lost" ? "danger" : "warning"}>
                    {c.shipment.status}
                  </Badge>
                </div>
                <ol className="relative pl-6 space-y-2">
                  <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
                  {c.shipment.events.map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[18px] top-1 h-2.5 w-2.5 rounded-full bg-rex-cyan" />
                      <p className="text-sm">{e.status}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {e.location} · {new Date(e.ts).toLocaleString()}
                      </p>
                      {e.detail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {e.detail}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-5">
          <GlowCard tone="cyan">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Order
            </p>
            <p className="text-sm mt-1">{c.order.itemName}</p>
            <p className="text-xs text-muted-foreground">SKU {c.order.itemSku}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <KV label="customer" value={c.order.customerName} compact />
              <KV label="email" value={c.order.customerEmail} compact />
              <KV
                label="ordered"
                value={new Date(c.order.orderedAt).toLocaleDateString()}
                compact
              />
              <KV
                label="ETA"
                value={new Date(c.order.expectedDeliveryAt).toLocaleDateString()}
                compact
              />
            </div>
          </GlowCard>

          <GlowCard tone="violet">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Agent memory key
            </p>
            <p className="font-mono text-xs mt-1">{c.agentMemoryKey}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Persistent context bucket for this case — preserved across retries
              and escalations.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <KV label="actions" value={c.actions.length.toString()} compact />
              <KV label="tx anchored" value={c.txHashes.length.toString()} compact />
            </div>
          </GlowCard>

          <TerminalLog caseId={c.id} height={260} />
        </div>
      </div>
    </div>
  );
}

function KV({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "cyan";
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-md border border-border bg-card/40 p-2.5"}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-medium ${tone === "emerald" ? "text-emerald-300" : tone === "cyan" ? "text-rex-cyan" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function progressFromStatus(status: string): number {
  const order = [
    "intake",
    "investigating",
    "contacting_merchant",
    "awaiting_response",
    "negotiating",
    "escalating",
    "resolved_refund",
  ];
  const i = order.indexOf(status);
  if (i < 0) return 1;
  return (i + 1) / order.length;
}
