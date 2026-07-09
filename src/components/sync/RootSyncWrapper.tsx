"use client";

// RootSyncWrapper — lives in the root layout so SyncProvider persists
// across page navigations instead of remounting on every route change.

import { SyncProvider } from "./SyncProvider";

export function RootSyncWrapper({ children }: { children: React.ReactNode }) {
  return <SyncProvider>{children}</SyncProvider>;
}
