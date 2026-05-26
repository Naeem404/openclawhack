"use client";

/**
 * FreelancerPanel — the "Sarah" side of the demo.
 *
 * Shows Sarah's wallet (starts $0), a file drop zone, and a Deliver button.
 * On Deliver: turns the dropped file into a data: URI, POSTs to /api/jobs
 * with the escrowJobId + criteria + deliverableUrl. The parent's
 * useJobStream then takes over and renders the verification flow.
 *
 * A "Load sample logo" button is provided so the demo never depends on the
 * presenter actually having a file ready.
 */
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Wallet, Upload, Loader2, ImageIcon, ArrowRight } from "lucide-react";
import type { SwarmEvent } from "@herd/shared/types";

interface PreparedJob {
  escrowJobId: string;
  amountUsdc: string;
  criteria: unknown[];
}

interface FreelancerPanelProps {
  events: SwarmEvent[];
  escrowJob: PreparedJob | null;
  disabled: boolean;
  onSubmitted: (jobId: string) => void;
}

const STARTING_BALANCE_USDC = 0;

/** A tiny inline SVG-rendered "logo" so the demo always has something to upload. */
const SAMPLE_PNG_DATA_URI =
  // 256x256 placeholder generated at build-time by a Node script and pasted here.
  // Two-color filled square: bottom-left orange #FF5733, top-right near-black #1A1A1A.
  // Width and Height bytes patched to 0x0400 = 1024 (we ship a 1024x1024 PNG).
  // For brevity in source, we generate this client-side instead — see makeSamplePng().
  "";

function makeSamplePng(): string {
  // Build a 1024x1024 PNG with two solid quadrants — orange + near-black —
  // entirely in the browser. Pure-JS, no canvas-API gymnastics for older browsers
  // because we DO have canvas in every modern browser.
  if (typeof document === "undefined") return SAMPLE_PNG_DATA_URI;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return SAMPLE_PNG_DATA_URI;
  // Bottom-left orange wedge
  ctx.fillStyle = "#FF5733";
  ctx.fillRect(0, 0, size, size);
  // Top-right near-black square (logo mark)
  ctx.fillStyle = "#1A1A1A";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
  ctx.fill();
  // Add a contrasting inner ring so the AestheticJudge sees structure
  ctx.fillStyle = "#FF5733";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 6, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h;
}

export default function FreelancerPanel({ events, escrowJob, disabled, onSubmitted }: FreelancerPanelProps) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The Lead Verifier emits escrow.released with the amount paid out.
  const released = useMemo(
    () => events.find((e) => e.type === "escrow.released") as Extract<SwarmEvent, { type: "escrow.released" }> | undefined,
    [events],
  );
  const balance = released ? STARTING_BALANCE_USDC + Number(released.amountUsdc) : STARTING_BALANCE_USDC;

  async function handleFile(file: File): Promise<void> {
    setError(null);
    try {
      const uri = await fileToDataUri(file);
      setDataUri(uri);
      setFileLabel(`${file.name} · ${(file.size / 1024).toFixed(1)} KB`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not read file");
    }
  }

  function loadSample(): void {
    const uri = makeSamplePng();
    if (!uri) {
      setError("could not generate sample image");
      return;
    }
    setDataUri(uri);
    setFileLabel("sample_logo.png · generated 1024×1024");
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  async function handleDeliver(): Promise<void> {
    if (!escrowJob || !dataUri) return;
    setSubmitting(true);
    setError(null);
    try {
      // Step 1: tell the escrow contract the file is delivered (mock-safe).
      const deliverRes = await fetch("/api/escrow/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escrowJobId: escrowJob.escrowJobId, deliverableUrl: dataUri.slice(0, 64) + "…" }),
      });
      if (!deliverRes.ok) {
        const body = await deliverRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `deliver HTTP ${deliverRes.status}`);
      }

      // Step 2: submit the verification job to the Lead Verifier.
      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrowJobId: escrowJob.escrowJobId,
          deliverableUrl: dataUri,
          criteria: escrowJob.criteria,
        }),
      });
      if (!jobRes.ok) {
        const body = await jobRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `jobs HTTP ${jobRes.status}`);
      }
      const data = (await jobRes.json()) as { jobId: string };
      onSubmitted(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canDeliver = !!escrowJob && !!dataUri && !disabled && !submitting;

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-glow backdrop-blur">
      <header className="mb-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Freelancer</div>
        <h3 className="mt-1 text-lg font-semibold">Sarah · Lagos</h3>
        <p className="text-xs text-zinc-500">Designer. Waiting on payment for 19 days. Not anymore.</p>
      </header>

      <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Wallet className="h-3.5 w-3.5" />
          USDC balance
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums transition ${
          released ? "text-emerald-300" : ""
        }`}>
          ${balance.toFixed(2)}
        </div>
        {released && (
          <div className="mt-1 text-[11px] text-emerald-400/80">
            +${released.amountUsdc} settled via escrow #{released.escrowJobId}
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition ${
          disabled
            ? "border-zinc-800 bg-zinc-950/30 opacity-50"
            : dragOver
              ? "border-goat-gold/60 bg-goat-gold/[0.05]"
              : dataUri
                ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-600"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onChange}
        />
        {dataUri ? (
          <>
            {/* Show actual deliverable preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUri} alt="deliverable" className="mb-2 h-20 w-20 rounded object-cover" />
            <div className="text-xs font-medium text-emerald-300">{fileLabel}</div>
            <div className="mt-1 text-[10px] text-zinc-500">Click to replace</div>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-zinc-500" />
            <div className="text-sm font-medium">Drop logo.png here</div>
            <div className="mt-1 text-[10px] text-zinc-500">PNG · 1024×1024 · brand colors required</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSample();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-700"
            >
              <ImageIcon className="h-3 w-3" />
              Use sample logo
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleDeliver}
        disabled={!canDeliver}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-goat-gold px-4 py-3 text-sm font-medium text-goat-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {submitting ? "Submitting…" : "Deliver"}
      </button>

      {!escrowJob && (
        <p className="mt-2 text-[11px] text-zinc-500">Waiting on Marcus to fund escrow.</p>
      )}
      {error && <p className="mt-3 text-xs text-red-400">Error: {error}</p>}
    </div>
  );
}
