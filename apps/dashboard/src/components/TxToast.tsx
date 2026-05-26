"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { SwarmEvent } from "@herd/shared/types";

interface TxToastProps {
  events: SwarmEvent[];
}

interface Toast {
  id: string;
  txHash: string;
  label: string;
}

export default function TxToast({ events }: TxToastProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const last = events[events.length - 1];
    if (!last) return;
    if (last.type === "payment.settled") {
      const t: Toast = {
        id: `${last.subtaskId}-${last.txHash}`,
        txHash: last.txHash,
        label: `Paid for ${last.subtaskId}`,
      };
      setToasts((cur) => (cur.find((x) => x.id === t.id) ? cur : [...cur, t]));
    } else if (last.type === "feedback.posted") {
      const t: Toast = {
        id: `fb-${last.specialistAgentId}-${last.txHash}`,
        txHash: last.txHash,
        label: `Reputation +${last.value} for agent #${last.specialistAgentId}`,
      };
      setToasts((cur) => (cur.find((x) => x.id === t.id) ? cur : [...cur, t]));
    }
  }, [events]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts((cur) => cur.slice(1)), 5000);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-goat-gold/30 bg-zinc-900/95 p-4 shadow-glow backdrop-blur"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-goat-gold" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t.label}</div>
            <a
              href={`https://explorer.testnet3.goat.network/tx/${t.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all font-mono text-[11px] text-goat-gold hover:underline"
            >
              {t.txHash.slice(0, 12)}…{t.txHash.slice(-6)} ↗
            </a>
          </div>
          <button
            type="button"
            onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
            className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
