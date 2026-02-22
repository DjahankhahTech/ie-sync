"use client";

import { useEffect, useRef, useCallback } from "react";
import { useIEStore } from "@/store/ie-store";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useLiveFeeds() {
  const {
    activeGCC,
    setLiveFeeds,
    setLiveFeedsLoading,
    setLiveFeedsError,
    liveFeedsLoading,
    liveFeedsFetchedAt,
  } = useIEStore();

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFeeds = useCallback(
    async (gcc: string) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLiveFeedsLoading(true);
      try {
        const res = await fetch(`/api/feeds?gcc=${gcc}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setLiveFeeds(data.items ?? [], data.fetchedAt ?? new Date().toISOString());
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setLiveFeedsError(
          err instanceof Error ? err.message : "Failed to fetch feeds"
        );
      }
    },
    [setLiveFeeds, setLiveFeedsLoading, setLiveFeedsError]
  );

  // Fetch immediately on GCC change, then poll
  useEffect(() => {
    fetchFeeds(activeGCC);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchFeeds(activeGCC), POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [activeGCC, fetchFeeds]);

  return { refetch: () => fetchFeeds(activeGCC), liveFeedsLoading, liveFeedsFetchedAt };
}
