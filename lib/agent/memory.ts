/**
 * Persistent-ish agent memory. Each case gets a memory bucket keyed by
 * agentMemoryKey on the DisputeCase. Buckets store structured facts the
 * planner uses to avoid repeating itself across retries / escalations.
 */
type MemoryBucket = {
  facts: Record<string, unknown>;
  observations: { ts: number; note: string }[];
  attempts: number;
  lastDecisionTs?: number;
};

class AgentMemory {
  private buckets = new Map<string, MemoryBucket>();

  get(key: string): MemoryBucket {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { facts: {}, observations: [], attempts: 0 });
    }
    return this.buckets.get(key)!;
  }

  remember(key: string, fact: Record<string, unknown>) {
    const b = this.get(key);
    b.facts = { ...b.facts, ...fact };
    this.buckets.set(key, b);
  }

  observe(key: string, note: string) {
    const b = this.get(key);
    b.observations.push({ ts: Date.now(), note });
    if (b.observations.length > 50) b.observations.shift();
    this.buckets.set(key, b);
  }

  bumpAttempts(key: string) {
    const b = this.get(key);
    b.attempts += 1;
    b.lastDecisionTs = Date.now();
    this.buckets.set(key, b);
    return b.attempts;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __refundrex_memory: AgentMemory | undefined;
}

export const memory: AgentMemory =
  globalThis.__refundrex_memory ??
  (globalThis.__refundrex_memory = new AgentMemory());
