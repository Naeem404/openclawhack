"use client";
import * as React from "react";

export function usePoll<T>(
  url: string,
  ms = 2000,
  initial?: T,
): { data: T | undefined; reload: () => void } {
  const [data, setData] = React.useState<T | undefined>(initial);
  const reload = React.useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as T;
      setData(j);
    } catch {
      /* ignore */
    }
  }, [url]);

  React.useEffect(() => {
    let alive = true;
    reload();
    const t = setInterval(() => {
      if (alive) reload();
    }, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [reload, ms]);

  return { data, reload };
}
