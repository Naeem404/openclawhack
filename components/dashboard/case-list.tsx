"use client";
import Link from "next/link";
import { ArrowRight, Clock, CircleAlert, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePoll } from "@/lib/hooks/use-poll";
import type { DisputeCase } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

const statusColors: Record<string, "default" | "success" | "warning" | "danger" | "cyan" | "purple"> = {
  intake: "purple",
  investigating: "cyan",
  contacting_merchant: "cyan",
  negotiating: "warning",
  awaiting_response: "warning",
  escalating: "danger",
  resolved_refund: "success",
  resolved_replacement: "success",
  resolved_partial: "success",
  rejected: "danger",
  fraud_blocked: "danger",
};

export function CaseList() {
  const { data } = usePoll<{ cases: DisputeCase[] }>("/api/cases", 2000);
  const cases = data?.cases ?? [];

  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Active & recent cases</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {cases.length} total
        </span>
      </div>
      <div className="divide-y divide-border">
        {cases.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            No cases yet — open one from the Demo tab.
          </div>
        )}
        {cases.map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}`}
            className="grid grid-cols-12 items-center gap-2 px-5 py-3 hover:bg-secondary/40 transition-colors"
          >
            <div className="col-span-4">
              <p className="font-medium text-sm">{c.order.itemName}</p>
              <p className="text-[11px] text-muted-foreground">
                {c.order.merchantName} · {c.order.id}
              </p>
            </div>
            <div className="col-span-2">
              <Badge variant={statusColors[c.status] ?? "default"}>
                {c.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="col-span-2 text-sm font-mono">
              ${c.order.amountUsd.toFixed(2)}
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {c.status === "resolved_refund" || c.status === "resolved_replacement" || c.status === "resolved_partial" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : c.status === "escalating" || c.status === "rejected" ? (
                <CircleAlert className="h-3.5 w-3.5 text-rose-300" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              {formatRelative(c.updatedAt)}
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              {c.recoveredAmountUsd > 0 && (
                <span className="text-emerald-300 text-xs font-mono">
                  +${c.recoveredAmountUsd.toFixed(2)}
                </span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
