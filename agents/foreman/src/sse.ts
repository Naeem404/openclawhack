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

export function createEventBus(): EventBus {
  const channels = new Map<string, Set<Listener>>();

  return {
    publish(jobId, e) {
      const subs = channels.get(jobId);
      if (!subs || subs.size === 0) return;
      for (const fn of subs) {
        try {
          fn(e);
        } catch (err) {
          console.warn("[sse] listener threw:", err);
        }
      }
    },
    subscribe(jobId, fn) {
      let set = channels.get(jobId);
      if (!set) {
        set = new Set();
        channels.set(jobId, set);
      }
      set.add(fn);
      return () => {
        set?.delete(fn);
        if (set && set.size === 0) channels.delete(jobId);
      };
    },
  };
}
