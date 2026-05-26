import { nanoid } from "nanoid";
import type { AgentLogLine } from "@/lib/types";

type Listener = (log: AgentLogLine) => void;

class EventBus {
  private listeners = new Set<Listener>();
  private buffer: AgentLogLine[] = [];
  private cap = 500;

  emit(line: Omit<AgentLogLine, "id" | "ts"> & Partial<Pick<AgentLogLine, "ts">>) {
    const log: AgentLogLine = {
      id: nanoid(8),
      ts: line.ts ?? Date.now(),
      level: line.level,
      source: line.source,
      message: line.message,
      caseId: line.caseId,
    };
    this.buffer.push(log);
    if (this.buffer.length > this.cap) this.buffer.shift();
    for (const l of this.listeners) {
      try {
        l(log);
      } catch {
        /* ignore */
      }
    }
    return log;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  recent(n = 100) {
    return this.buffer.slice(-n);
  }

  clear() {
    this.buffer = [];
  }
}

// Hot-reload safe singleton
declare global {
  // eslint-disable-next-line no-var
  var __refundrex_events: EventBus | undefined;
}

export const events: EventBus =
  globalThis.__refundrex_events ?? (globalThis.__refundrex_events = new EventBus());

export function log(
  source: string,
  level: AgentLogLine["level"],
  message: string,
  caseId?: string,
) {
  return events.emit({ source, level, message, caseId });
}
