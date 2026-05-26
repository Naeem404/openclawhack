"use client";

import { useEffect, useRef, useState } from "react";
import type { SwarmEvent } from "@herd/shared/types";

export type StreamStatus = "idle" | "connecting" | "streaming" | "completed" | "error";

interface UseJobStreamResult {
  events: SwarmEvent[];
  status: StreamStatus;
}

/**
 * Subscribes to /api/stream/<jobId> via SSE.
 * Cleans up on unmount and on job completion/failure.
 */
export function useJobStream(jobId: string | null): UseJobStreamResult {
  const [events, setEvents] = useState<SwarmEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    setEvents([]);
    setStatus("connecting");

    const es = new EventSource(`/api/stream/${jobId}`);
    esRef.current = es;

    es.onopen = () => setStatus("streaming");
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as SwarmEvent;
        setEvents((cur) => [...cur, evt]);
        if (evt.type === "job.completed") {
          setStatus("completed");
          es.close();
        } else if (evt.type === "job.failed") {
          setStatus("error");
          es.close();
        }
      } catch {
        // ignore bad frames
      }
    };
    es.onerror = () => {
      setStatus("error");
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId]);

  return { events, status };
}
