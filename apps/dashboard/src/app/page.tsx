"use client";

/**
 * HERD dashboard — main demo screen.
 * Implements packets P09, P10, P11.
 *
 * Sub-agent task list:
 *   1. Wire JobForm.onSubmit → POST /api/jobs → receive { jobId }.
 *   2. Pass jobId into useJobStream(jobId) for live SwarmEvents.
 *   3. Render SwarmTimeline with the streamed events.
 *   4. Pop TxToast on payment.settled events with explorer links.
 *   5. Show AgentCard badges for Foreman / Researcher / Writer on the right rail
 *      (fetch identity from each agent at mount).
 */
import { useState } from "react";
import { Bot, Sparkles, ScrollText } from "lucide-react";
import JobForm from "@/components/JobForm";
import SwarmTimeline from "@/components/SwarmTimeline";
import AgentCard from "@/components/AgentCard";
import TxToast from "@/components/TxToast";
import { useJobStream } from "@/hooks/useJobStream";

export default function HomePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const { events, status } = useJobStream(jobId);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-goat-gold/10 p-2 ring-1 ring-goat-gold/30">
            <Bot className="h-6 w-6 text-goat-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">HERD</h1>
            <p className="text-xs text-zinc-400">Where AI agents earn their keep.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400 ring-1 ring-zinc-800">
          <Sparkles className="h-3.5 w-3.5 text-goat-gold" />
          GOAT Testnet3 · Chain 48816
        </div>
      </header>

      {/* Pitch */}
      <section className="mb-8">
        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
          One prompt in. <span className="text-goat-gold">A swarm of agents</span> earns its keep on Bitcoin.
        </h2>
        <p className="mt-3 max-w-3xl text-zinc-400">
          The Foreman decomposes your brief, solicits bids from specialist agents, dispatches work,
          and settles every micro-payment on-chain via <span className="font-mono">x402</span>.
          ERC-8004 reputation decides who gets hired next time.
        </p>
      </section>

      {/* Grid: form + timeline (left) · agent rail (right) */}
      <section className="grid gap-8 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <JobForm
            disabled={status === "streaming"}
            onSubmitted={(id) => setJobId(id)}
          />
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
              <ScrollText className="h-4 w-4" />
              <span>Swarm timeline</span>
              <span className="ml-auto rounded-full bg-zinc-900 px-2 py-0.5 text-xs">
                {status}
              </span>
            </div>
            <SwarmTimeline events={events} />
          </div>
        </div>

        <aside className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Registered agents</h3>
          <AgentCard name="Foreman"    role="orchestrator"  endpoint="/api/agents/foreman" />
          <AgentCard name="Researcher" role="research.web"  endpoint="/api/agents/researcher" />
          <AgentCard name="Writer"     role="write.brief"   endpoint="/api/agents/writer" />
        </aside>
      </section>

      <TxToast events={events} />
    </main>
  );
}
