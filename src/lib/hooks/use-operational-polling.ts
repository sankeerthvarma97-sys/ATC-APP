"use client";

import { useEffect, useRef } from "react";

export function useOperationalPolling(
  callback: () => Promise<void> | void,
  intervalMs = 4000,
  options: { enabled?: boolean; immediate?: boolean } = {}
) {
  const { enabled = true, immediate = true } = options;
  const savedCallback = useRef(callback);
  const failureCountRef = useRef(0);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const executePoll = async () => {
      // Respect visibility: pause if tab is hidden in background
      if (document.hidden) return;

      try {
        await savedCallback.current();
        failureCountRef.current = 0;
      } catch {
        failureCountRef.current = Math.min(failureCountRef.current + 1, 5);
      }

      if (!isCancelled) {
        // Compute backoff: base interval + 1000ms per consecutive failure
        const nextDelay = intervalMs + failureCountRef.current * 1000;
        timer = setTimeout(executePoll, nextDelay);
      }
    };

    // Immediate initial execution if requested
    if (immediate && !document.hidden) {
      executePoll();
    } else {
      timer = setTimeout(executePoll, intervalMs);
    }

    // Visibility-aware resume
    const handleVisibilityChange = () => {
      if (!document.hidden && !isCancelled) {
        if (timer) clearTimeout(timer);
        executePoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, immediate]);
}
