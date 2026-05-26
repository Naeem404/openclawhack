"use client";

/**
 * PaidProof dashboard — split-screen demo.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │  Header: PaidProof · Network · explorer link │
 *   ├──────────┬──────────────────┬────────────────┤
 *   │ Client   │ Lead Verifier +  │ Freelancer     │
 *   │ panel    │ Specialist cards │ panel          │
 *   │ + Fund   │ + Timeline       │ + Upload       │
 *   └──────────┴──────────────────┴────────────────┘
 */
import { useState } from "react";
import { Shield, Sparkles, ScrollText } from "lucide-react";
import ClientPanel from "@/components/ClientPanel";
import VerifierPanel from "@/components/VerifierPanel";
import FreelancerPanel from "@/components/FreelancerPanel";
import SwarmTimeline from "@/components/SwarmTimeline";
import TxToast from "@/components/TxToast";
import { useJobStream } from "@/hooks/useJobStream";

interface PreparedJob {
  escrowJobId: string;
  amountUsdc: string;
  criteria: unknown[];
}

export default function HomePage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [escrowJob, setEscrowJob] = useState<PreparedJob | null>(null);
  const { events, status } = useJobStream(jobId);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-goat-gold/10 p-2 ring-1 ring-goat-gold/30">
            <Shield className="h-6 w-6 text-goat-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">PaidProof</h1>
            <p className="text-xs text-zinc-400">
              Work delivered. Money settled. In 30 seconds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400 ring-1 ring-zinc-800">
          <Sparkles className="h-3.5 w-3.5 text-goat-gold" />
          Bitcoin-secured escrow · agent-released
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
          The middleman <span className="text-goat-gold">was the bug.</span>
        </h2>
        <p className="mt-3 max-w-3xl text-zinc-400">
          A client funds escrow. A freelancer delivers. Four AI agents verify the work autonomously
          via <span className="font-mono">x402</span>. The Lead Verifier signs the on-chain release.
          No 30-day wait, no 10% fee.
        </p>
      </section>

      {/* Three-column demo */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <ClientPanel
          events={events}
          onFunded={(j) => setEscrowJob(j)}
          escrowJob={escrowJob}
          disabled={status === "streaming"}
        />
        <VerifierPanel events={events} status={status} />
        <FreelancerPanel
          events={events}
          escrowJob={escrowJob}
          disabled={status === "streaming" || !escrowJob}
          onSubmitted={(id) => setJobId(id)}
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
          <ScrollText className="h-4 w-4" />
          <span>On-chain timeline</span>
          <span className="ml-auto rounded-full bg-zinc-900 px-2 py-0.5 text-xs">{status}</span>
        </div>
        <SwarmTimeline events={events} />
      </section>

      <TxToast events={events} />
    </main>
  );
}
