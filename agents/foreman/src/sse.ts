/**
 * Minimal in-process pub/sub for SSE event fan-out.
 * Implements packet P08.
 *
 * Keyed by jobId. Subscribers receive every event published for that jobId,
 * in order. No buffering: events published before any subscriber connects are
 * dropped (acceptable for hackathon-scale demos; promote to Redis later).
 */
import type { SwarmEvent } from "@herd/shared/types";

type Listener = (e: SwarmEvent) => void;

export interface EventBus {
  publish(jobId: string, e: SwarmEvent): void;
  subscribe(jobId: string, fn: Listener): () => void;
}

interface Channel {
  buffer: SwarmEvent[];
  listeners: Set<Listener>;
  closed: boolean;
}

const MAX_BUFFER = 200;
const RETENTION_AFTER_CLOSE_MS = 60_000;

export function createEventBus(): EventBus {
  const channels = new Map<string, Channel>();

  function getOrCreate(jobId: string): Channel {
    let c = channels.get(jobId);
    if (!c) {
      c = { buffer: [], listeners: new Set(), closed: false };
      channels.set(jobId, c);
    }
    return c;
  }

  return {
    publish(jobId, e) {
      const c = getOrCreate(jobId);
      c.buffer.push(e);
      if (c.buffer.length > MAX_BUFFER) c.buffer.shift();
      for (const fn of c.listeners) {
        try {
          fn(e);
        } catch (err) {
          console.warn("[sse] listener threw:", err);
        }
      }
      if (e.type === "job.completed" || e.type === "job.failed") {
        c.closed = true;
        // keep around briefly so late subscribers can still replay the run
        setTimeout(() => channels.delete(jobId), RETENTION_AFTER_CLOSE_MS);
      }
    },
    subscribe(jobId, fn) {
      const c = getOrCreate(jobId);
      c.listeners.add(fn);
      // Replay buffered events asynchronously so the caller can capture the
      // unsubscribe handle before any listener fires (avoids TDZ on `const`).
      if (c.buffer.length > 0) {
        const snapshot = c.buffer.slice();
        queueMicrotask(() => {
          for (const e of snapshot) {
            try {
              fn(e);
            } catch (err) {
              console.warn("[sse] replay threw:", err);
            }
          }
        });
      }
      return () => {
        c.listeners.delete(fn);
      };
    },
  };
}
