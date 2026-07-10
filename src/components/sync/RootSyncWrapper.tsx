"use client";

// RootSyncWrapper — lives in the root layout so SyncProvider persists
// across page navigations instead of remounting on every route change.
// Also wraps with CapacitorProvider for native connectivity features.

import { SyncProvider } from "./SyncProvider";
import { CapacitorProvider } from "@/components/capacitor/CapacitorProvider";

export function RootSyncWrapper({ children }: { children: React.ReactNode }) {
  return (
    <CapacitorProvider>
      <SyncProvider>{children}</SyncProvider>
    </CapacitorProvider>
  );
}
