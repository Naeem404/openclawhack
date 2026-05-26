"use client";

/**
 * ClientPanel — the "Marcus" side of the demo.
 *
 * Shows the client's wallet balance, the agreed criteria card, and a single
 * "Fund Escrow" button. When clicked it POSTs to /api/escrow/fund which (in
 * mock mode) synthesises a tx hash + escrowJobId, then the parent state
 * unlocks the freelancer's Deliver button.
 */
import { useMemo, useState } from "react";
import { Wallet, ShieldCheck, Loader2, FileImage, Palette, Eye } from "lucide-react";
import type { SwarmEvent, Criterion } from "@herd/shared/types";

interface PreparedJob {
  escrowJobId: string;
  amountUsdc: string;
  criteria: unknown[];
}

interface ClientPanelProps {
  events: SwarmEvent[];
  escrowJob: PreparedJob | null;
  onFunded: (j: PreparedJob) => void;
  disabled: boolean;
}

const STARTING_BALANCE_USDC = 250;
const ESCROW_AMOUNT_USDC = 200;

const SAMPLE_CRITERIA: Criterion[] = [
  {
    kind: "filespec",
    mime: "image/png",
    widthPx: 1024,
    heightPx: 1024,
    minBytes: 4_000,
    maxBytes: 5_000_000,
  },
  {
    kind: "colorvision",
    brandColors: ["#FF5733", "#1A1A1A"],
    toleranceChannel: 32,
  },
  {
    kind: "aesthetic",
    prompt: "A clean, modern logo for a fintech startup. Bold geometric mark. No placeholder text, no AI artifacts.",
    minConfidence: 0.6,
  },
];

function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h;
}

export default function ClientPanel({ events, escrowJob, onFunded, disabled }: ClientPanelProps) {
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrowTx, setEscrowTx] = useState<string | null>(null);

  // Track released event so we can fade the client balance correctly.
  const released = useMemo(
    () => events.find((e) => e.type === "escrow.released" || e.type === "escrow.disputed"),
    [events],
  );

  const balance = escrowJob ? STARTING_BALANCE_USDC - ESCROW_AMOUNT_USDC : STARTING_BALANCE_USDC;

  async function handleFund(): Promise<void> {
    setFunding(true);
    setError(null);
    try {
      const res = await fetch("/api/escrow/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsdc: ESCROW_AMOUNT_USDC.toString(), criteria: SAMPLE_CRITERIA }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { escrowJobId: string; txHash?: string };
      setEscrowTx(data.txHash ?? null);
      onFunded({
        escrowJobId: data.escrowJobId,
        amountUsdc: ESCROW_AMOUNT_USDC.toString(),
        criteria: SAMPLE_CRITERIA,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Funding failed");
    } finally {
      setFunding(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-glow backdrop-blur">
      <header className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Client</div>
        <h3 className="mt-1 text-lg font-semibold">Marcus · Toronto</h3>
        <p className="text-xs text-zinc-500">Hiring a logo. Funds escrow up front.</p>
      </header>

      {/* Wallet balance */}
      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Wallet className="h-3.5 w-3.5" />
          USDC balance
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">${balance.toFixed(2)}</div>
        {escrowJob && (
          <div className="mt-1 text-[11px] text-zinc-500">
            ${ESCROW_AMOUNT_USDC.toFixed(2)} locked in escrow #{escrowJob.escrowJobId}
          </div>
        )}
      </div>

      {/* Criteria */}
      <div className={`mb-4 rounded-xl border p-4 transition ${
        escrowJob ? "border-goat-gold/30 bg-goat-gold/[0.04]" : "border-dashed border-zinc-800 bg-zinc-950/40"
      }`}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Criteria</div>
          {escrowJob && (
            <span className="text-[10px] uppercase tracking-wider text-goat-gold">locked</span>
          )}
        </div>
        <ul className="space-y-2 text-xs text-zinc-300">
          <li className="flex items-start gap-2">
            <FileImage className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span>1024 × 1024 <span className="font-mono">PNG</span> (4 KB – 5 MB)</span>
          </li>
          <li className="flex items-start gap-2">
            <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span>
              Brand colors{" "}
              <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: "#FF5733" }} />{" "}
              <span className="font-mono text-[11px]">#FF5733</span>{" "}+
              <span className="ml-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "#1A1A1A" }} />{" "}
              <span className="font-mono text-[11px]">#1A1A1A</span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span>Clean, modern fintech logo. No placeholder. No AI artifacts.</span>
          </li>
        </ul>
      </div>

      {/* Fund button */}
      {!escrowJob ? (
        <button
          type="button"
          onClick={handleFund}
          disabled={funding || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-goat-gold px-4 py-3 text-sm font-medium text-goat-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {funding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {funding ? "Funding escrow…" : `Fund $${ESCROW_AMOUNT_USDC} Escrow`}
        </button>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
          <div className="font-medium">Escrow funded · waiting for delivery</div>
          {escrowTx && (
            <a
              href={`https://explorer.testnet3.goat.network/tx/${escrowTx}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-mono text-[10px] text-emerald-400/80 hover:underline"
            >
              {shortHash(escrowTx)} ↗
            </a>
          )}
        </div>
      )}

      {released?.type === "escrow.released" && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
          Job settled. Reputation tick up incoming.
        </div>
      )}
      {released?.type === "escrow.disputed" && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          Verdict failed. Escrow held for dispute.
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-400">Error: {error}</p>}
    </div>
  );
}
