"use client";

// SyncProvider — wraps the authenticated app and:
// 1. On mount (user logged in): pulls all user data from Supabase
// 2. Wires the store's sync callback to push mutations
// 3. Handles initial sync (local → Supabase for new users)
// 4. Shows the SyncIndicator

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pullAllUserData, pushMutation } from "@/lib/supabase/sync";
import { setSyncCallback, reloadCache } from "@/lib/store";
import type { ChangedTables } from "@/lib/supabase/db";
import type { AppData } from "@/lib/types";
import { SyncIndicator } from "./SyncIndicator";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // User signed out — disconnect sync
      setSyncCallback(null);
      initialized.current = false;
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const userId = user.id;

    // Wire the sync callback into the store
    setSyncCallback(
      (data: AppData, changed: ChangedTables) => {
        pushMutation(userId, data, changed);
      },
      userId,
    );

    // Pull data from Supabase (async — happens after the store is ready)
    pullAllUserData(userId).then((remoteData) => {
      if (remoteData) {
        // Data was loaded (either from remote or pushed up from local).
        // The store already saved to localStorage via saveData() inside
        // pullAllUserData. Re-read the cache so the UI picks it up.
        reloadCache();
      }
    });
  }, [user, loading]);

  return (
    <>
      {children}
      <SyncIndicator />
    </>
  );
}
