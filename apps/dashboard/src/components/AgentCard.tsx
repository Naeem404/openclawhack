"use client";

import { useEffect, useState } from "react";
import { Bot, Hash } from "lucide-react";

interface AgentCardProps {
  name: string;
  role: string;
  /** Local dashboard proxy URL that fetches the agent's /identity. */
  endpoint: string;
}

interface IdentityResponse {
  agentId: string | null;
  address: string | null;
  network: string;
}

export default function AgentCard({ name, role, endpoint }: AgentCardProps) {
  const [identity, setIdentity] = useState<IdentityResponse | null>(null);
  const [online, setOnline] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: IdentityResponse) => {
        if (cancelled) return;
        setIdentity(data);
        setOnline(true);
      })
      .catch(() => {
        if (!cancelled) setOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-zinc-800/60 p-1.5 text-zinc-300 ring-1 ring-zinc-700">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="text-sm font-medium">{name}</div>
        <div
          className={
            online
              ? "ml-auto h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30"
              : "ml-auto h-2 w-2 rounded-full bg-zinc-600 ring-2 ring-zinc-600/30"
          }
          title={online ? "online" : "offline"}
        />
      </div>
      <div className="mt-1 text-xs text-zinc-500">{role}</div>
      <div className="mt-3 space-y-1 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Hash className="h-3 w-3 text-zinc-600" />
          <span className="font-mono">
            ERC-8004 #{identity?.agentId ?? "—"}
          </span>
        </div>
        <div className="font-mono text-[10px] text-zinc-600">
          {identity?.address
            ? `${identity.address.slice(0, 6)}…${identity.address.slice(-4)}`
            : "not registered"}
        </div>
      </div>
    </div>
  );
}
