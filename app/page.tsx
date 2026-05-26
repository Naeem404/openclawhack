import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Network,
  CircleDollarSign,
  Bot,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/shared/glow-card";

const features = [
  {
    icon: Bot,
    title: "Autonomous reasoning loop",
    body: "Track shipments, classify issues, draft and send merchant emails, parse replies, escalate, settle. End-to-end, no human in the loop unless you opt in.",
    tone: "orange" as const,
  },
  {
    icon: ShieldCheck,
    title: "On-chain identity (ERC-8004)",
    body: "Every action is anchored to a Trustless Agent identity. Reputation accrues, can't be spoofed, follows the agent across merchants.",
    tone: "violet" as const,
  },
  {
    icon: CircleDollarSign,
    title: "x402 native payments",
    body: "Fees and settlements move over GOAT Network x402 rails — USDC in seconds, no Stripe, no card networks, no humans.",
    tone: "cyan" as const,
  },
  {
    icon: Network,
    title: "Agent-to-agent settlements",
    body: "Talks directly to merchant agents via signed dispute payloads. When the merchant has a Hermes/OpenClaw endpoint, refunds round-trip in seconds.",
    tone: "emerald" as const,
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-24">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-12 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7">
            <Badge variant="default" className="font-mono">
              <Sparkles className="h-3 w-3 mr-1 inline" />
              Toronto Tech Week · OpenClaw Hack 2026
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05]">
              The autonomous{" "}
              <span className="bg-gradient-to-r from-rex-orange via-rex-amber to-rex-cyan bg-clip-text text-transparent">
                refund agent
              </span>{" "}
              that never sleeps.
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              RefundRex owns an on-chain identity, runs its own wallet on GOAT
              Network, and resolves shipment disputes for you — autonomously.
              It tracks packages, negotiates with merchants, and gets paid in{" "}
              <span className="text-rex-orange">USDC</span> over{" "}
              <span className="text-rex-cyan">x402</span>.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/demo">
                  Run live demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">View dashboard →</Link>
              </Button>
              <Button asChild variant="cyan" size="lg">
                <Link href="/pitch">Judge mode</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-rex-cyan" />
                ERC-8004
              </span>
              <span className="flex items-center gap-1.5">
                <CircleDollarSign className="h-3.5 w-3.5 text-rex-orange" />
                x402 / USDC
              </span>
              <span className="flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-violet-300" />
                GOAT Mainnet · chain 2345
              </span>
              <span className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-emerald-300" />
                OpenClaw runtime
              </span>
            </div>
          </div>

          {/* Hero card mock */}
          <div className="relative">
            <GlowCard tone="orange" className="">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                    refundrex_bot @ goat-mainnet
                  </span>
                </div>
                <Badge variant="success">● autonomous</Badge>
              </div>
              <div className="terminal space-y-1">
                <Line ts="14:02:11" level="PLAN" tone="text-rex-cyan">
                  classifying issue from customer note + shipment evidence
                </Line>
                <Line ts="14:02:12" level=" OK " tone="text-emerald-300">
                  category=damaged_item · severity=high · p(success)=82%
                </Line>
                <Line ts="14:02:13" level="INFO" tone="text-zinc-300">
                  drafting empathetic outbound email · attempt #1
                </Line>
                <Line ts="14:02:14" level="INFO" tone="text-zinc-300">
                  📡 broadcasting x402 settle tx=0xfe1c3a…
                </Line>
                <Line ts="14:02:16" level=" OK " tone="text-emerald-300">
                  confirmed in block #12,560,318 · payment captured
                </Line>
                <Line ts="14:02:16" level="PLAN" tone="text-rex-cyan">
                  reputation +3 · trustScore → 88
                </Line>
                <div className="text-rex-orange typing pt-1">▍</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                <Mini label="cases" value="143" />
                <Mini label="recovered" value="$18.4k" />
                <Mini label="trust" value="88" tone="cyan" />
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────── */}
      <section>
        <div className="text-center mb-12 space-y-3">
          <Badge variant="cyan" className="font-mono">
            <Activity className="h-3 w-3 mr-1 inline" /> agent-native primitives
          </Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Built for agents, not humans.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Identity, payments, and reputation live on-chain. The rest is just
            a polished UI for humans who happen to be watching.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f) => (
            <GlowCard key={f.title} tone={f.tone}>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-md border border-border bg-secondary/40">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section>
        <div className="text-center mb-12 space-y-3">
          <Badge variant="purple" className="font-mono">flow</Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            From "this never arrived" to USDC, in 18 seconds.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { n: "01", t: "Intake", b: "Customer forwards an order email or pastes tracking info." },
            { n: "02", t: "Track + classify", b: "Pulls carrier status, classifies issue, runs fraud pre-check." },
            { n: "03", t: "Contact merchant", b: "Tone-aware email or A2A dispatch — signed payload, ERC-8004 proof." },
            { n: "04", t: "Negotiate / escalate", b: "Parses reply, pushes back on partials, escalates on silence." },
            { n: "05", t: "Settle", b: "x402 fee capture, on-chain receipt anchored to caseId." },
          ].map((s) => (
            <GlowCard key={s.n} tone="orange">
              <p className="text-3xl font-semibold font-mono text-rex-orange">
                {s.n}
              </p>
              <p className="font-medium mt-2">{s.t}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{s.b}</p>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="relative">
        <GlowCard tone="cyan">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-3">
            <div>
              <h3 className="text-2xl font-semibold">
                Watch one in real time.
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Open a pre-loaded scenario — RefundRex will autonomously work
                the case end-to-end with live on-chain confirmations.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="lg" asChild>
                <Link href="/demo">Run a scenario →</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>
        </GlowCard>
      </section>
    </div>
  );
}

function Line({
  ts,
  level,
  tone,
  children,
}: {
  ts: string;
  level: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="terminal-line">
      <span className="font-mono text-[10px] text-muted-foreground">{ts}</span>
      <span className="font-mono text-[10px] px-1.5 rounded border border-border">
        {level}
      </span>
      <span className={tone}>{children}</span>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "cyan";
}) {
  return (
    <div className="rounded-md border border-border bg-card/30 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </p>
      <p
        className={`text-lg ${tone === "cyan" ? "text-rex-cyan" : "text-rex-orange"} font-semibold`}
      >
        {value}
      </p>
    </div>
  );
}
