"use client";

// Pull-to-refresh hook — native touch gesture for refreshing current screen.
// Uses touchstart/touchmove/touchend events on the document body.
// Only activates when the user is at the very top of the page (scrollY <= 0).
// Returns state that can be passed to PullToRefreshIndicator component.

import { useState, useRef, useCallback, useEffect } from "react";

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export interface PullToRefreshState {
  pulling: boolean;
  progress: number;
  refreshing: boolean;
}

export function usePullToRefresh(onRefresh: () => Promise<void> | void): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    progress: 0,
    refreshing: false,
  });
  const startY = useRef(0);
  const currentY = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return;
    if (refreshingRef.current) return;
    // Skip if touch is inside a modal/dialog
    const target = e.target as HTMLElement;
    if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (refreshingRef.current) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff <= 0) {
      if (pullingRef.current) {
        pullingRef.current = false;
        setState((s) => ({ ...s, pulling: false, progress: 0 }));
      }
      return;
    }

    if (window.scrollY > 0) return;

    pullingRef.current = true;
    const clamped = Math.min(diff, MAX_PULL);
    const progress = Math.min(clamped / PULL_THRESHOLD, 1);

    setState((s) => ({ ...s, pulling: true, progress }));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (refreshingRef.current) return;
    if (!pullingRef.current) return;

    pullingRef.current = false;
    const diff = currentY.current - startY.current;

    if (diff >= PULL_THRESHOLD) {
      refreshingRef.current = true;
      setState((s) => ({ ...s, pulling: false, progress: 0, refreshing: true }));

      const result = refreshRef.current();
      if (result instanceof Promise) {
        result.finally(() => {
          refreshingRef.current = false;
          setState((s) => ({ ...s, refreshing: false }));
        });
      } else {
        refreshingRef.current = false;
        setState((s) => ({ ...s, refreshing: false }));
      }
    } else {
      setState((s) => ({ ...s, pulling: false, progress: 0 }));
    }
  }, []);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Safety timeout: reset refreshing if it gets stuck
  useEffect(() => {
    if (state.refreshing) {
      const timer = setTimeout(() => {
        refreshingRef.current = false;
        setState((s) => ({ ...s, refreshing: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.refreshing]);

  return state;
}
