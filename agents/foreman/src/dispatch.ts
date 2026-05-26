/**
 * Specialist resolution.
 *
 * In PaidProof the routing is deterministic: each Criterion kind maps to exactly
 * one specialist skill, and each skill maps to exactly one specialist endpoint
 * declared in SPECIALIST_REGISTRY. We still hit the specialist's GET /bid
 * endpoint once to capture its self-reported price + agentId for the dashboard
 * timeline (and to record a Bid in the JobResult ledger), but we don't actually
 * rank — there's no competition for these single-purpose verifiers in MVP.
 */
import { z } from "zod";
import { BidSchema, type Bid, type Subtask } from "@herd/shared/types";

const RegistryEntrySchema = z.object({
  url: z.string().url(),
  skills: z.array(z.string()).nonempty(),
});
const RegistrySchema = z.array(RegistryEntrySchema);
type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

const DEFAULT_REGISTRY = JSON.stringify([
  { url: "http://localhost:3101", skills: ["verify.filespec"] },
  { url: "http://localhost:3102", skills: ["verify.colorvision"] },
  { url: "http://localhost:3103", skills: ["verify.aesthetic"] },
]);

function loadRegistry(): RegistryEntry[] {
  const raw = process.env.SPECIALIST_REGISTRY ?? DEFAULT_REGISTRY;
  return RegistrySchema.parse(JSON.parse(raw));
}

export class NoSpecialistError extends Error {
  constructor(public readonly subtaskId: string, public readonly skill: string) {
    super(`No specialist registered for subtask ${subtaskId} (skill=${skill})`);
  }
}

/**
 * Fetch the specialist's self-reported bid for a subtask. Used only for the
 * dashboard timeline + ledger; the Lead Verifier has already picked the
 * specialist deterministically from SPECIALIST_REGISTRY.
 */
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
    else console.warn("[lead-verifier] dropped bid:", r.reason?.message ?? r.reason);
  }
  return bids;
}

/**
 * Pick the cheapest bid (or the only one). In MVP each skill has exactly one
 * specialist; this is a no-op safety pass.
 */
export async function rankBids(bids: Bid[]): Promise<Bid> {
  if (bids.length === 0) throw new Error("rankBids: empty input");
  const sorted = [...bids].sort((a, b) => Number(a.priceUsdc) - Number(b.priceUsdc));
  const winner = sorted[0];
  if (!winner) throw new Error("rankBids: no winner");
  return winner;
}
