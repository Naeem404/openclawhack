"use client";
import { Wallet, ShieldCheck, Coins, Hash } from "lucide-react";
import { GlowCard } from "@/components/shared/glow-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortAddr } from "@/lib/utils";
import { usePoll } from "@/lib/hooks/use-poll";
import type { AgentReputation, WalletState } from "@/lib/types";

export function WalletCard() {
  const { data } = usePoll<{ wallet: WalletState; reputation: AgentReputation }>(
    "/api/wallet",
    3000,
  );
  const w = data?.wallet;
  const r = data?.reputation;

  return (
    <GlowCard tone="cyan">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Agent Wallet
          </p>
          <p className="text-sm mt-1 font-mono">
            {w ? shortAddr(w.address) : "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="cyan">
            <ShieldCheck className="h-3 w-3 mr-1 inline" />
            ERC-8004 #{w?.erc8004Id ?? "—"}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono">
            GOAT Mainnet · chain {w?.chainId ?? 2345}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <BalanceRow
          icon={<Coins className="h-3.5 w-3.5" />}
          symbol="BTC"
          amount={w?.balances.native.amount ?? 0}
          decimals={6}
        />
        <BalanceRow
          icon={<Wallet className="h-3.5 w-3.5" />}
          symbol="USDC"
          amount={w?.balances.usdc.amount ?? 0}
          decimals={2}
        />
        <BalanceRow
          icon={<Hash className="h-3.5 w-3.5" />}
          symbol="USDT"
          amount={w?.balances.usdt?.amount ?? 0}
          decimals={2}
        />
      </div>

      {r && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
          <Stat label="cases" value={r.casesHandled.toString()} />
          <Stat label="recovered" value={`$${r.totalRecoveredUsd.toFixed(0)}`} />
          <Stat
            label="trust"
            value={`${r.trustScore}`}
            highlight
          />
        </div>
      )}
      <div className="flex justify-between items-center mt-4">
        <span className="text-[10px] font-mono text-muted-foreground">
          tx count {w?.txCount ?? 0}
        </span>
        <Button size="sm" variant="outline" asChild>
          <a
            href={`https://explorer.goat.network/address/${w?.address ?? ""}`}
            target="_blank"
            rel="noreferrer"
          >
            View on explorer →
          </a>
        </Button>
      </div>
    </GlowCard>
  );
}

function BalanceRow({
  icon,
  symbol,
  amount,
  decimals,
}: {
  icon: React.ReactNode;
  symbol: string;
  amount: number;
  decimals: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-mono">
        {icon}
        <span>{symbol}</span>
      </div>
      <p className="text-sm mt-0.5 font-mono">
        {amount.toFixed(decimals)}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-lg mt-0.5 ${highlight ? "text-rex-cyan" : ""}`}>
        {value}
      </p>
    </div>
  );
}
