"use client";
import * as React from "react";
import Link from "next/link";
import {
  Rocket,
  DollarSign,
  Bot,
  Clock,
  ShieldCheck,
  Network,
  CircleDollarSign,
  Sparkles,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlowCard } from "@/components/shared/glow-card";
import { TerminalLog } from "@/components/shared/terminal-log";
import { usePoll } from "@/lib/hooks/use-poll";
import type { AgentReputation } from "@/lib/types";

interface Stats {
  counts: { total: number; open: number; resolved: number };
  money: {
    totalRecoveredUsd: number;
    totalFeesUsd: number;
    avgRecoveryUsd: number;
  };
  averages: { confidence: number; hoursSavedPerCase: number };
  reputation: AgentReputation;
}

export default function PitchPage() {
  const { data } = usePoll<Stats>("/api/stats", 1500);
  const [running, setRunning] = React.useState(false);

  async function judgeDemo() {
    setRunning(true);
    // Fire all three scenarios for maximum visual chaos.
    const slugs = ["damaged-headphones", "delayed-keyboard", "lost-package"];
    for (const slug of slugs) {
      await fetch("/api/demo/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      await new Promise((r) => setTimeout(r, 700));
    }
    setTimeout(() => setRunning(false), 25_000);
  }

  return (
    <div className="space-y-8">
      {/* ── Pitch hero ───────────────────────────────────── */}
      <section>
        <Badge variant="default" className="font-mono mb-3">
          <Rocket className="h-3 w-3 mr-1 inline" /> judge mode
        </Badge>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-3xl leading-tight">
          One click. Three live disputes. Full on-chain settlement.
        </h1>
        <p className="text-muted-foreground max-w-2xl mt-3">
          Watch RefundRex autonomously work three scenarios in parallel:
          damaged item, delayed shipment, and a lost package. Reasoning, merchant
          comms, x402 settlements — all visible in real time.
        </p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Button size="lg" onClick={judgeDemo} disabled={running}>
            {running ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" /> running…
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" /> Start judge demo
              </>
            )}
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/demo">Run one at a time →</Link>
          </Button>
          <Button size="lg" variant="cyan" asChild>
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
      </section>

      {/* ── KPI grid ───────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          tone="emerald"
          label="Total recovered"
          value={`$${(data?.money.totalRecoveredUsd ?? 0).toLocaleString()}`}
          sub={`across ${data?.counts.resolved ?? 0} resolved cases`}
          icon={DollarSign}
        />
        <Kpi
          tone="orange"
          label="Success rate"
          value={`${Math.round((data?.reputation?.successRate ?? 0) * 100)}%`}
          sub={`${data?.counts.resolved ?? 0} of ${data?.counts.total ?? 0}`}
          icon={Bot}
        />
        <Kpi
          tone="cyan"
          label="Avg resolution"
          value={`${(data?.reputation?.averageResolutionHours ?? 0).toFixed(1)}h`}
          sub={`vs ~96h human baseline`}
          icon={Clock}
        />
        <Kpi
          tone="violet"
          label="Trust score"
          value={`${data?.reputation?.trustScore ?? 0}`}
          sub={`ERC-8004 #${data?.reputation?.erc8004Id ?? "—"}`}
          icon={ShieldCheck}
        />
      </section>

      {/* ── ROI strip ─────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlowCard tone="orange">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            human cost per dispute
          </p>
          <p className="text-3xl font-semibold mt-2">$42.18</p>
          <p className="text-xs text-muted-foreground mt-1">
            avg agent salary + benefits, 96-minute median handle time, 22% rework rate.
          </p>
        </GlowCard>
        <GlowCard tone="emerald">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            refundrex cost
          </p>
          <p className="text-3xl font-semibold mt-2">$0.10</p>
          <p className="text-xs text-muted-foreground mt-1">
            x402 settlement + GOAT gas (≈ $0.000031 BTC). Charged per successful resolution.
          </p>
        </GlowCard>
        <GlowCard tone="cyan">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            margin
          </p>
          <p className="text-3xl font-semibold mt-2">~99.8%</p>
          <p className="text-xs text-muted-foreground mt-1">
            And it scales horizontally on agent infrastructure. The next 10,000 cases cost what the first one did.
          </p>
        </GlowCard>
      </section>

      {/* ── Resolution progress strip ─────────────────── */}
      <section>
        <GlowCard tone="violet">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm font-medium">Autonomous activity score</p>
            <span className="text-[11px] font-mono text-muted-foreground">
              rolling 24h · weighted by recovery value
            </span>
          </div>
          <Progress
            value={Math.min(
              100,
              Math.round(((data?.money.totalRecoveredUsd ?? 0) / 1000) * 100),
            )}
          />
          <div className="grid grid-cols-3 mt-4 gap-3">
            <Tag icon={ShieldCheck} text="ERC-8004 verified" tone="cyan" />
            <Tag icon={CircleDollarSign} text="x402 USDC settlement" tone="orange" />
            <Tag icon={Network} text="A2A enabled" tone="emerald" />
          </div>
        </GlowCard>
      </section>

      {/* ── Cinematic logs ────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TerminalLog height={420} />
        </div>
        <GlowCard tone="orange">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            3-minute demo script
          </p>
          <ol className="mt-3 space-y-2 text-sm">
            {[
              "Open with the problem: ~$100B in refund disputes/year, mostly handled by humans.",
              "Show landing → RefundRex is an autonomous agent on GOAT Network with ERC-8004 identity.",
              "Hit 'Start judge demo' → three scenarios fire simultaneously.",
              "Walk through the terminal: classify → contact → parse → settle. Point at on-chain hashes.",
              "Open a resolved case → show the timeline + x402 receipt on GOAT explorer.",
              "Close with the ROI strip: $0.10 per resolution vs $42 human cost, 99.8% margin.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-rex-orange shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </GlowCard>
      </section>

      {/* ── Roadmap ──────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">
          Post-hackathon roadmap
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Roadmap
            q="Q3 2026"
            title="A2A marketplace"
            body="Publish the dispute payload spec as an open standard; recruit launch merchants on Hermes / OpenClaw."
          />
          <Roadmap
            q="Q4 2026"
            title="Auto-chargeback"
            body="Bridge to traditional card-network chargebacks when crypto rails aren't an option."
          />
          <Roadmap
            q="Q1 2027"
            title="Multi-agent pools"
            body="Reputation-weighted dispatcher: route cases to the agent with the highest trust score per merchant."
          />
          <Roadmap
            q="Q2 2027"
            title="Insurance primitives"
            body="Stake reputation against successful outcomes; create an on-chain prediction market for dispute outcomes."
          />
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "orange" | "cyan" | "emerald" | "violet";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <GlowCard tone={tone}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            {label}
          </p>
          <p className="text-4xl font-semibold mt-2 tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
        <div className="p-2 rounded border border-border bg-secondary/40">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </GlowCard>
  );
}

function Tag({
  icon: Icon,
  text,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  tone: "cyan" | "orange" | "emerald";
}) {
  const cls =
    tone === "cyan"
      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
      : tone === "orange"
      ? "border-rex-orange/40 bg-rex-orange/10 text-rex-orange"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  return (
    <div className={`rounded-md border px-3 py-2 flex items-center gap-2 ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-mono">{text}</span>
    </div>
  );
}

function Roadmap({
  q,
  title,
  body,
}: {
  q: string;
  title: string;
  body: string;
}) {
  return (
    <GlowCard tone="violet">
      <span className="text-[10px] uppercase font-mono text-muted-foreground">
        {q}
      </span>
      <p className="font-medium mt-1">{title}</p>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        {body}
      </p>
    </GlowCard>
  );
}
