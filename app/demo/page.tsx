"use client";
import * as React from "react";
import Link from "next/link";
import { Play, Zap, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/shared/glow-card";
import { TerminalLog } from "@/components/shared/terminal-log";
import { CaseList } from "@/components/dashboard/case-list";
import { ChainFeed } from "@/components/dashboard/chain-feed";
import { usePoll } from "@/lib/hooks/use-poll";
import type { DemoScenario } from "@/data/demo-scenarios";

export default function DemoPage() {
  const [running, setRunning] = React.useState<string | undefined>();
  const { data } = usePoll<{ scenarios: DemoScenario[] }>(
    "/api/demo/run",
    10_000,
  );
  const scenarios = data?.scenarios ?? [];

  async function runScenario(slug: string) {
    setRunning(slug);
    await fetch("/api/demo/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    // Let the cinematic loop play out for visual effect, then clear state.
    setTimeout(() => setRunning(undefined), 22_000);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Badge variant="warning" className="font-mono mb-3">
            🎬 demo mode · cinematic logs
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Run a scenario</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Each scenario opens a fresh dispute case, lets RefundRex work it
            end-to-end, and shows you everything — agent reasoning, merchant
            communication, on-chain settlements.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/pitch">
            <Rocket className="h-3.5 w-3.5 mr-1.5" />
            Jump to pitch mode
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <GlowCard key={s.slug} tone="orange">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="default" className="font-mono">
                {s.slug}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground">
                ~{Math.round(s.expectedDurationMs / 1000)}s
              </span>
            </div>
            <p className="font-semibold mt-1">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {s.blurb}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <KV label="merchant" value={s.order.merchantName} />
              <KV label="value" value={`$${s.order.amountUsd.toFixed(2)}`} />
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-[10px] font-mono text-muted-foreground">
                {s.order.carrier} · {s.order.trackingNumber}
              </span>
              <Button
                size="sm"
                onClick={() => runScenario(s.slug)}
                disabled={!!running}
              >
                {running === s.slug ? (
                  <>
                    <Zap className="h-3.5 w-3.5 mr-1 animate-pulse" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Run scenario
                  </>
                )}
              </Button>
            </div>
          </GlowCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <TerminalLog height={400} />
          <CaseList />
        </div>
        <ChainFeed />
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Need a customer experience? <Link href="/dashboard" className="text-rex-cyan hover:underline">Open the dashboard <ArrowRight className="h-3 w-3 inline" /></Link>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </p>
      <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}
