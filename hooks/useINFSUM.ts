"use client";

import { useEffect, useRef, useCallback } from "react";
import { useIEStore } from "@/store/ie-store";

const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours — daily refresh

export function useINFSUM() {
  const {
    activeGCC,
    setINFSUM,
    setINFSUMLoading,
    setINFSUMError,
    infsumLoading,
    infsumFetchedAt,
  } = useIEStore();

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchINFSUM = useCallback(
    async (gcc: string) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setINFSUMLoading(true);
      try {
        const res = await fetch(`/api/infsum?gcc=${gcc}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setINFSUM(data, data.generatedAt ?? new Date().toISOString());
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setINFSUMError(
          err instanceof Error ? err.message : "Failed to fetch INFSUM"
        );
      }
    },
    [setINFSUM, setINFSUMLoading, setINFSUMError]
  );

  useEffect(() => {
    fetchINFSUM(activeGCC);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchINFSUM(activeGCC), POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [activeGCC, fetchINFSUM]);

  return { refetch: () => fetchINFSUM(activeGCC), infsumLoading, infsumFetchedAt };
}
