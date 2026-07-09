"use client";

// Returns false during server render and the first client render, then true
// once hydrated — without triggering a hydration mismatch. Lets client pages
// that read localStorage show a skeleton until their real data is available,
// avoiding a flash of the empty state.

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
