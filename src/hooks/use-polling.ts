"use client";

import { useEffect, useRef } from "react";

/**
 * Polls a callback at the given interval with automatic AbortController cleanup.
 * Stops polling when `enabled` is false.
 */
export function usePolling(
  callback: (signal: AbortSignal) => Promise<void>,
  interval: number,
  enabled: boolean
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    const id = setInterval(() => {
      callbackRef.current(controller.signal).catch(() => {});
    }, interval);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [interval, enabled]);
}
