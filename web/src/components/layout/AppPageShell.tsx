"use client";

// Replaces the (app) route-group layout. Each app page wraps its content
// in this shell. SyncProvider lives in the root layout (RootSyncWrapper)
// so it persists across navigations.

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

export function AppPageShell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
