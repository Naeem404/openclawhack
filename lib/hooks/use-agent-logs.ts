"use client";
import * as React from "react";
import type { AgentLogLine } from "@/lib/types";

/**
 * Subscribe to the SSE stream from /api/agent/stream.
 * Maintains a sliding window of the last 250 log lines.
 */
export function useAgentLogs(max = 250) {
  const [logs, setLogs] = React.useState<AgentLogLine[]>([]);

  React.useEffect(() => {
    const es = new EventSource("/api/agent/stream");
    const onLog = (ev: MessageEvent<string>) => {
      try {
        const line = JSON.parse(ev.data) as AgentLogLine;
        setLogs((prev) => {
          const next = [...prev, line];
          if (next.length > max) next.splice(0, next.length - max);
          return next;
        });
      } catch {
        /* ignore */
      }
    };
    es.addEventListener("log", onLog);
    return () => {
      es.removeEventListener("log", onLog);
      es.close();
    };
  }, [max]);

  return logs;
}
