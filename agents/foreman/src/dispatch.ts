/**
 * Bid solicitation + ranking.
 * Implements packet P05.
 *
 * Sub-agent task list:
 *   1. Implement getReputation(agentId) using viem + REPUTATION_REGISTRY_ABI.getSummary.
 *      Return: average decimal score 0–100. count==0 → 50 (neutral).
 *   2. Implement solicitBids(subtask): fetch GET /bid?spec=<urlencoded> from every
 *      specialist in SPECIALIST_REGISTRY whose `skills[]` contains subtask.skill.
 *      Drop those that fail or time out after 3 s. Validate response with BidSchema.
 *   3. Implement rankBids(bids): score = reputation - RANKING_PRICE_WEIGHT * priceUsdc.
 *      Tie-break: higher reputation, then lower price.
 *   4. Tests live in this file as runtime asserts under `if (import.meta.url === ...)`.
 */
import { z } from "zod";
import { BidSchema, type Bid, type Subtask } from "@herd/shared/types";
import {
  ERC8004,
  GOAT_TESTNET3,
  RANKING_PRICE_WEIGHT,
} from "@herd/shared/constants";
import { REPUTATION_REGISTRY_ABI } from "@herd/shared/abi";

const RegistryEntrySchema = z.object({
  url: z.string().url(),
  skills: z.array(z.string()).nonempty(),
});
const RegistrySchema = z.array(RegistryEntrySchema);
type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

const DEFAULT_REGISTRY = JSON.stringify([
  { url: "http://localhost:3101", skills: ["research.web"] },
  { url: "http://localhost:3102", skills: ["write.brief"] },
]);

function loadRegistry(): RegistryEntry[] {
  const raw = process.env.SPECIALIST_REGISTRY ?? DEFAULT_REGISTRY;
  return RegistrySchema.parse(JSON.parse(raw));
}

export class NoBidsError extends Error {
  constructor(public readonly subtaskId: string, public readonly skill: string) {
    super(`No bids received for subtask ${subtaskId} (skill=${skill})`);
  }
}

/**
 * Average reputation as a 0–100 float. count==0 → 50 (neutral newcomer score).
 * TODO(sub-agent): wire viem readContract against REPUTATION_REGISTRY_ABI.getSummary.
 */
export async function getReputation(agentId: string): Promise<number> {
  if (!agentId) return 50;
  // TODO: viem readContract — { address: ERC8004.reputationRegistry, abi: REPUTATION_REGISTRY_ABI, functionName: "getSummary", args: [BigInt(agentId), [], "0x0…0", "0x0…0"] }
  // Then: normalize summaryValue / 10**summaryValueDecimals; clamp to [0, 100].
  // For now: deterministic stub keyed off agentId so demos look stable.
  const hash = [...agentId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  return 60 + ((Math.abs(hash) % 30)); // 60–89
}

export async function solicitBids(subtask: Subtask): Promise<Bid[]> {
  const registry = loadRegistry();
  const candidates = registry.filter((r) => r.skills.includes(subtask.skill));
  if (candidates.length === 0) return [];

  const results = await Promise.allSettled(
    candidates.map(async (c) => {
      const url = `${c.url}/bid?spec=${encodeURIComponent(JSON.stringify(subtask.spec))}`;
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 3_000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`bid http ${res.status}`);
        const json = (await res.json()) as Record<string, unknown>;
        return BidSchema.parse({ ...json, endpoint: c.url });
      } finally {
        clearTimeout(to);
      }
    }),
  );

  const bids: Bid[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") bids.push(r.value);
    else console.warn("[foreman] dropped bid:", r.reason?.message ?? r.reason);
  }
  return bids;
}

export async function rankBids(bids: Bid[]): Promise<Bid> {
  if (bids.length === 0) throw new Error("rankBids: empty input");

  const scored = await Promise.all(
    bids.map(async (b) => {
      const rep = await getReputation(b.agentId);
      const price = Number(b.priceUsdc);
      const score = rep - RANKING_PRICE_WEIGHT * (price * 100); // scale price to comparable range
      return { bid: b, rep, score };
    }),
  );

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.rep !== a.rep) return b.rep - a.rep;
    return Number(a.bid.priceUsdc) - Number(b.bid.priceUsdc);
  });

  const winner = scored[0];
  if (!winner) throw new Error("rankBids: no winner");
  return winner.bid;
}

export { GOAT_TESTNET3, ERC8004, REPUTATION_REGISTRY_ABI };
