"use client";

import { useEffect, useRef, useCallback } from "react";
import { useIEStore } from "@/store/ie-store";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function useMediaFeeds() {
  const {
    activeGCC,
    setMediaFeeds,
    setMediaFeedsLoading,
    setMediaFeedsError,
    mediaFeedsLoading,
    mediaFeedsFetchedAt,
  } = useIEStore();

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMedia = useCallback(
    async (gcc: string) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setMediaFeedsLoading(true);
      try {
        const res = await fetch(`/api/media-feeds?gcc=${gcc}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMediaFeeds(data.items ?? [], data.fetchedAt ?? new Date().toISOString());
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMediaFeedsError(
          err instanceof Error ? err.message : "Failed to fetch media feeds"
        );
      }
    },
    [setMediaFeeds, setMediaFeedsLoading, setMediaFeedsError]
  );

  useEffect(() => {
    fetchMedia(activeGCC);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => fetchMedia(activeGCC), POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [activeGCC, fetchMedia]);

  return { refetch: () => fetchMedia(activeGCC), mediaFeedsLoading, mediaFeedsFetchedAt };
}
