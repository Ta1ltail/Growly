"use client";

// Pull-to-refresh hook — native touch gesture for refreshing current screen.
// Uses touchstart/touchmove/touchend events on the document body.
// Only activates when the user is at the very top of the page (scrollY <= 0).
// Returns state that can be passed to PullToRefreshIndicator component.

import { useState, useRef, useCallback, useEffect } from "react";

const PULL_THRESHOLD = 150;
const MAX_PULL = 200;

// Module-level modal counter — incremented/decremented by modal:open/close
// custom events dispatched from the Modal component. When > 0, pull-to-refresh
// is completely disabled so scrolling inside a modal never triggers a refresh.
let _openModalCount = 0;

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

  // Track modal open/close events so pull-to-refresh is disabled whenever
  // any modal is visible — prevents the gesture from firing behind a dialog.
  useEffect(() => {
    const onModalOpen = () => { _openModalCount++; };
    const onModalClose = () => { _openModalCount = Math.max(0, _openModalCount - 1); };
    window.addEventListener("modal:open", onModalOpen);
    window.addEventListener("modal:close", onModalClose);
    return () => {
      window.removeEventListener("modal:open", onModalOpen);
      window.removeEventListener("modal:close", onModalClose);
    };
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Disabled entirely when any modal is open
    if (_openModalCount > 0) return;
    if (window.scrollY > 0) return;
    if (refreshingRef.current) return;
    // Also skip if touch is inside a native dialog element
    const target = e.target as HTMLElement;
    if (target.closest('[role="dialog"], [role="alertdialog"]')) return;
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (_openModalCount > 0) return;
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
    if (_openModalCount > 0) return;
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

  // Sync the onRefresh callback to the ref outside render to avoid
  // the react ref access during render lint error.
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

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
