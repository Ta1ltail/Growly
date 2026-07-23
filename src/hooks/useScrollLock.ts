"use client";

/**
 * useScrollLock — centralized scroll-lock hook for modals, dialogs, drawers,
 * popups, and overlays.
 *
 * **What it does:**
 * 1. Saves the current `document.body` scroll position before locking
 * 2. Locks body scroll by setting `overflow: hidden`
 * 3. Compensates for scrollbar width removal to prevent layout shift
 * 4. Prevents touch scrolling / overscroll on mobile (touchmove + scroll events)
 * 5. Restores the original scroll position and overflow after unlocking
 * 6. Uses a lock counter so nested modals work correctly — scroll is only
 *    re-enabled when ALL locks are released (counter reaches 0)
 *
 * **Usage:**
 * ```tsx
 * function MyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 *   useScrollLock(open);
 *   if (!open) return null;
 *   return <div>...</div>;
 * }
 * ```
 *
 * Multiple modals can be open simultaneously — scroll lock is released only
 * when all have closed.
 */

import { useEffect, useRef } from "react";

// ── Module-level lock counter and state ──
// Using module scope ensures all instances share the same counter.
let lockCount = 0;
let savedScrollY = 0;
let savedOverflow = "";
let savedPosition = "";
let savedTop = "";
let savedWidth = "";
let touchMoveHandler: ((e: TouchEvent) => void) | null = null;
let wheelHandler: ((e: WheelEvent) => void) | null = null;

/**
 * Calculate the scrollbar width by creating a temporary element.
 * Returns 0 if no scrollbar is visible.
 */
function getScrollbarWidth(): number {
  // In Tailwind, with scrollbar-width: none globally on mobile,
  // we shouldn't add padding on mobile. Only compensate on desktop
  // where scrollbars are visible.
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  if (!isDesktop) return 0;

  // Check if the body actually has overflow — if not, no scrollbar width
  if (document.body.scrollHeight <= window.innerHeight) return 0;

  // Measure scrollbar width
  const outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.overflow = "scroll";
  document.body.appendChild(outer);
  const inner = document.createElement("div");
  outer.appendChild(inner);
  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  outer.parentNode?.removeChild(outer);
  return scrollbarWidth;
}

function applyLock() {
  savedScrollY = window.scrollY;
  savedOverflow = document.body.style.overflow;
  savedPosition = document.body.style.position;
  savedTop = document.body.style.top;
  savedWidth = document.body.style.width;

  const scrollbarWidth = getScrollbarWidth();

  // Lock body scroll while preserving scroll position
  // Using position: fixed instead of overflow: hidden prevents scroll position
  // jumping to the top (a known issue with overflow: hidden alone).
  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";

  // Compensate for scrollbar disappearance to prevent layout shift
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  // Prevent touch scrolling on mobile
  if (!touchMoveHandler) {
    touchMoveHandler = (e: TouchEvent) => {
      // Only prevent if the touch target is inside a scrollable element
      // that isn't a modal/dialog content area
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-scrollable="true"]')) {
        // Allow scrolling inside scrollable modal content
        const scrollable = target.closest<HTMLElement>('[data-scrollable="true"]');
        if (scrollable) {
          const { scrollTop, scrollHeight, clientHeight } = scrollable;
          const atTop = scrollTop <= 0;
          const atBottom = scrollTop + clientHeight >= scrollHeight;
          // Prevent overscroll past boundaries
          if (
            (atTop && e.touches[0] && scrollTop <= 0) ||
            (atBottom && scrollTop + clientHeight >= scrollHeight)
          ) {
            e.preventDefault();
          }
          return;
        }
      }
      e.preventDefault();
    };
    document.addEventListener("touchmove", touchMoveHandler, { passive: false });
  }

  // Prevent mouse wheel scrolling
  if (!wheelHandler) {
    wheelHandler = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-scrollable="true"]')) {
        const scrollable = target.closest<HTMLElement>('[data-scrollable="true"]');
        if (scrollable) {
          const { scrollTop, scrollHeight, clientHeight } = scrollable;
          const atTop = scrollTop <= 0 && e.deltaY < 0;
          const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
          if (!atTop && !atBottom) return; // allow scrolling within bounds
        }
      }
      e.preventDefault();
    };
    document.addEventListener("wheel", wheelHandler, { passive: false });
  }
}

function releaseLock() {
  // Restore body properties
  document.body.style.position = savedPosition;
  document.body.style.top = savedTop;
  document.body.style.overflow = savedOverflow;
  document.body.style.width = savedWidth;
  document.body.style.paddingRight = "";

  // Restore scroll position
  window.scrollTo(0, savedScrollY);

  // Remove event listeners
  if (touchMoveHandler) {
    document.removeEventListener("touchmove", touchMoveHandler);
    touchMoveHandler = null;
  }
  if (wheelHandler) {
    document.removeEventListener("wheel", wheelHandler);
    wheelHandler = null;
  }
}

/**
 * Hook that locks body scroll when `locked` is true, and releases when false.
 * Supports nested modals via a shared counter.
 */
export function useScrollLock(locked: boolean): void {
  // Initialize with false so the first effect run properly detects a transition
  // from unlocked → locked (the ref tracks the PREVIOUS value).
  const prevLockedRef = useRef(false);

  useEffect(() => {
    if (locked && !prevLockedRef.current) {
      // Lock was just activated
      lockCount++;
      if (lockCount === 1) {
        applyLock();
      }
    } else if (!locked && prevLockedRef.current) {
      // Lock was just released
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        releaseLock();
      }
    }
    prevLockedRef.current = locked;

    return () => {
      // Cleanup on unmount while lock was active
      if (prevLockedRef.current) {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          releaseLock();
        }
      }
    };
  }, [locked]);
}
