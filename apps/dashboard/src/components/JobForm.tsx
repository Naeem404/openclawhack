"use client";

import { useState, type FormEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface JobFormProps {
  disabled?: boolean;
  onSubmitted: (jobId: string) => void;
}

const SAMPLE_BRIEF =
  "Write a 300-word brief on Bitcoin L2 trade-offs with three sources.";

export default function JobForm({ disabled, onSubmitted }: JobFormProps) {
  const [brief, setBrief] = useState<string>(SAMPLE_BRIEF);
  const [budget, setBudget] = useState<string>("0.20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, budgetUsdc: budget }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { jobId } = (await res.json()) as { jobId: string };
      onSubmitted(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || !!disabled;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-glow backdrop-blur"
    >
      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
        Brief
      </label>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={3}
        placeholder="Describe the job. The Foreman will decompose it."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm placeholder:text-zinc-600 focus:border-goat-gold/50 focus:outline-none focus:ring-1 focus:ring-goat-gold/50"
        disabled={busy}
      />

      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <span className="text-xs text-zinc-500">Budget</span>
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            type="text"
            inputMode="decimal"
            className="w-20 bg-transparent text-sm focus:outline-none"
            disabled={busy}
          />
          <span className="text-xs text-zinc-500">USDC</span>
        </div>

        <button
          type="submit"
          disabled={busy || !brief.trim()}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-goat-gold px-4 py-2 text-sm font-medium text-goat-dark transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? "Running swarm…" : "Run swarm"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">Error: {error}</p>
      )}
    </form>
  );
}
