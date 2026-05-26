import { nanoid } from "nanoid";
import type {
  AgentAction,
  CaseTimelineEvent,
  DisputeCase,
  Order,
  Shipment,
} from "@/lib/types";
import { seedCases } from "@/data/seed-cases";

class CaseStore {
  private cases = new Map<string, DisputeCase>();

  constructor() {
    for (const c of seedCases) this.cases.set(c.id, c);
  }

  list(): DisputeCase[] {
    return [...this.cases.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  get(id: string) {
    return this.cases.get(id);
  }

  create(input: {
    order: Order;
    shipment: Shipment;
    customerNote?: string;
  }): DisputeCase {
    const now = new Date().toISOString();
    const id = "case_" + nanoid(8);
    const c: DisputeCase = {
      id,
      order: input.order,
      shipment: input.shipment,
      status: "intake",
      category: "other",
      severity: "medium",
      openedAt: now,
      updatedAt: now,
      resolution: "pending",
      recoveredAmountUsd: 0,
      feeUsd: 0,
      confidence: 0.5,
      successProbability: 0.5,
      timeline: [
        {
          id: nanoid(8),
          ts: now,
          type: "case_opened",
          title: "Case opened",
          body: `Customer reported issue: ${input.customerNote ?? "unspecified"}`,
          actorRole: "customer",
        },
      ],
      actions: [],
      txHashes: [],
      agentMemoryKey: "mem_" + nanoid(10),
      customerNote: input.customerNote,
    };
    this.cases.set(id, c);
    return c;
  }

  update(id: string, patch: Partial<DisputeCase>) {
    const c = this.cases.get(id);
    if (!c) return undefined;
    const next: DisputeCase = {
      ...c,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.cases.set(id, next);
    return next;
  }

  pushAction(id: string, action: AgentAction) {
    const c = this.cases.get(id);
    if (!c) return;
    c.actions = [...c.actions, action];
    c.updatedAt = new Date().toISOString();
    if (action.txHash && !c.txHashes.includes(action.txHash)) {
      c.txHashes = [...c.txHashes, action.txHash];
    }
    this.cases.set(id, c);
  }

  pushTimeline(id: string, ev: Omit<CaseTimelineEvent, "id" | "ts"> & Partial<Pick<CaseTimelineEvent, "id" | "ts">>) {
    const c = this.cases.get(id);
    if (!c) return;
    const full: CaseTimelineEvent = {
      id: ev.id ?? nanoid(8),
      ts: ev.ts ?? new Date().toISOString(),
      type: ev.type,
      title: ev.title,
      body: ev.body,
      actorRole: ev.actorRole,
      meta: ev.meta,
    };
    c.timeline = [...c.timeline, full];
    c.updatedAt = full.ts;
    this.cases.set(id, c);
    return full;
  }

  reset() {
    this.cases.clear();
    for (const c of seedCases) this.cases.set(c.id, c);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __refundrex_cases: CaseStore | undefined;
}

export const caseStore: CaseStore =
  globalThis.__refundrex_cases ??
  (globalThis.__refundrex_cases = new CaseStore());
