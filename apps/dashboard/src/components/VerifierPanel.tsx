"use client";

/**
 * VerifierPanel — center column of the demo.
 *
 * Shows four agent cards (Lead + 3 specialists), each transitioning through:
 *   idle → paying → verifying → pass/fail
 *
 * Derived entirely from the streamed SwarmEvent[] — no extra fetches.
 */
import { useMemo } from "react";
import { Shield, Ruler, Palette, Eye, CheckCircle2, XCircle, Loader2, Bot } from "lucide-react";
import type { SwarmEvent, Verdict } from "@herd/shared/types";
import type { StreamStatus } from "@/hooks/useJobStream";

interface VerifierPanelProps {
  events: SwarmEvent[];
  status: StreamStatus;
}

type StageId = "filespec" | "colorvision" | "aesthetic";

interface SpecialistView {
  id: StageId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  priceUsdc: string;
  state: "idle" | "paying" | "paid" | "verifying" | "pass" | "fail";
  verdict?: Verdict;
  paymentTx?: string;
}

const STAGES: Pick<SpecialistView, "id" | "label" | "description" | "icon" | "priceUsdc">[] = [
  { id: "filespec",    label: "FileSpec",       description: "Type · size · pixels",  icon: Ruler,   priceUsdc: "0.02" },
  { id: "colorvision", label: "ColorVision",    description: "Brand colors present",  icon: Palette, priceUsdc: "0.03" },
  { id: "aesthetic",   label: "AestheticJudge", description: "Looks like the brief",  icon: Eye,     priceUsdc: "0.05" },
];

function skillToStage(skill: string): StageId | null {
  if (skill.includes("filespec")) return "filespec";
  if (skill.includes("colorvision")) return "colorvision";
  if (skill.includes("aesthetic")) return "aesthetic";
  return null;
}

function computeViews(events: SwarmEvent[]): SpecialistView[] {
  const views: Record<StageId, SpecialistView> = {
    filespec:    { ...STAGES[0]!, state: "idle" },
    colorvision: { ...STAGES[1]!, state: "idle" },
    aesthetic:   { ...STAGES[2]!, state: "idle" },
  };

  for (const e of events) {
    switch (e.type) {
      case "payment.required": {
        const id = skillToStage(e.specialist);
        if (id) views[id].state = "paying";
        break;
      }
      case "payment.settled": {
        const id = skillToStage(e.specialist);
        if (id) {
          views[id].state = "verifying";
          views[id].paymentTx = e.txHash;
        }
        break;
      }
      case "verdict.received": {
        const id = skillToStage(e.specialist);
        if (id) {
          views[id].state = e.verdict.pass ? "pass" : "fail";
          views[id].verdict = e.verdict;
        }
        break;
      }
    }
  }

  return [views.filespec, views.colorvision, views.aesthetic];
}

function StatePill({ state }: { state: SpecialistView["state"] }) {
  switch (state) {
    case "paying":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
          <Loader2 className="h-3 w-3 animate-spin" /> paying via x402
        </span>
      );
    case "paid":
    case "verifying":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-300 ring-1 ring-blue-500/20">
          <Loader2 className="h-3 w-3 animate-spin" /> verifying
        </span>
      );
    case "pass":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> pass
        </span>
      );
    case "fail":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-300 ring-1 ring-red-500/20">
          <XCircle className="h-3 w-3" /> fail
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 ring-1 ring-zinc-700">
          idle
        </span>
      );
  }
}

export default function VerifierPanel({ events, status }: VerifierPanelProps) {
  const views = useMemo(() => computeViews(events), [events]);
  const completed = events.find(
    (e): e is Extract<SwarmEvent, { type: "job.completed" }> => e.type === "job.completed",
  );
  const escrowReleased = events.find(
    (e): e is Extract<SwarmEvent, { type: "escrow.released" }> => e.type === "escrow.released",
  );
  const escrowDisputed = events.find(
    (e): e is Extract<SwarmEvent, { type: "escrow.disputed" }> => e.type === "escrow.disputed",
  );

  const leadState: SpecialistView["state"] =
    completed?.verdict?.pass ? "pass" :
    completed && !completed.verdict?.pass ? "fail" :
    status === "streaming" ? "verifying" :
    "idle";

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-glow backdrop-blur">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">PaidProof</div>
          <h3 className="mt-1 text-lg font-semibold">Lead Verifier</h3>
          <p className="text-xs text-zinc-500">
            Orchestrates 3 specialists via x402. Signs the escrow release.
          </p>
        </div>
        <StatePill state={leadState} />
      </header>

      {/* Lead Verifier card */}
      <div className={`mb-3 rounded-xl border p-3 transition ${
        leadState === "pass"
          ? "border-emerald-500/40 bg-emerald-500/[0.04]"
          : leadState === "fail"
            ? "border-red-500/40 bg-red-500/[0.04]"
            : leadState === "verifying"
              ? "border-goat-gold/30 bg-goat-gold/[0.04]"
              : "border-zinc-800 bg-zinc-950/40"
      }`}>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-goat-gold/10 p-1.5 text-goat-gold ring-1 ring-goat-gold/30">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Lead Verifier</div>
            <div className="text-[11px] text-zinc-500">verify.lead · own ERC-8004 identity · release authority</div>
          </div>
        </div>
      </div>

      {/* Specialist cards */}
      <div className="space-y-2">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <div
              key={v.id}
              className={`rounded-xl border p-3 transition ${
                v.state === "pass"
                  ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                  : v.state === "fail"
                    ? "border-red-500/40 bg-red-500/[0.04]"
                    : v.state !== "idle"
                      ? "border-zinc-700 bg-zinc-950/60"
                      : "border-zinc-800 bg-zinc-950/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-1.5 ring-1 ${
                  v.state === "pass"
                    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                    : v.state === "fail"
                      ? "bg-red-500/10 text-red-300 ring-red-500/30"
                      : "bg-zinc-800/60 text-zinc-300 ring-zinc-700"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{v.label}</div>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
                      ${v.priceUsdc}
                    </span>
                    <div className="ml-auto"><StatePill state={v.state} /></div>
                  </div>
                  <div className="text-[11px] text-zinc-500">{v.description}</div>
                  {v.verdict && (
                    <div className="mt-1 text-[11px] text-zinc-400">{v.verdict.reasoning}</div>
                  )}
                  {v.paymentTx && (
                    <a
                      href={`https://explorer.testnet3.goat.network/tx/${v.paymentTx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block font-mono text-[10px] text-goat-gold hover:underline"
                    >
                      x402 tx · {v.paymentTx.slice(0, 8)}…{v.paymentTx.slice(-4)} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final verdict banner */}
      {(escrowReleased || escrowDisputed || completed) && (
        <div className={`mt-4 rounded-xl border p-3 text-center ${
          escrowReleased
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-amber-500/40 bg-amber-500/10"
        }`}>
          <div className={`text-sm font-semibold uppercase tracking-wider ${
            escrowReleased ? "text-emerald-300" : "text-amber-200"
          }`}>
            {escrowReleased ? "✓ Verified · Escrow Released" : "Disputed · Escrow Held"}
          </div>
          {completed?.verdict && (
            <div className="mt-1 text-[11px] text-zinc-300">{completed.verdict.reasoning}</div>
          )}
          {escrowReleased && (
            <a
              href={`https://explorer.testnet3.goat.network/tx/${escrowReleased.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-[10px] text-emerald-400 hover:underline"
            >
              release tx · {escrowReleased.txHash.slice(0, 10)}…{escrowReleased.txHash.slice(-6)} ↗
            </a>
          )}
        </div>
      )}

      {events.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
          <Bot className="h-3.5 w-3.5" />
          Standing by. Awaiting deliverable.
        </div>
      )}
    </div>
  );
}
