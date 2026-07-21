"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLocalAppData, setDataUserId } from "@/lib/storage";

import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setUser(user);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
    });

    // Listen for auth state changes.
    // On SIGNED_OUT, clear local data immediately so the next user never sees
    // stale data from the previous session. The sync-protection concern (losing
    // in-flight pushMutations) is handled by:
    //   1. pushMutation already has the data in its closure
    //   2. The retry queue is cleared by resetSyncState in SyncProvider
    //   3. On next sign-in, fullResync pulls authoritative data from Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setDataUserId(null);
        clearLocalAppData();
        setUser(null);
        window.location.href = "/";
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    setDataUserId(null);
    clearLocalAppData();
    await supabase.auth.signOut();
    // Hard navigation ensures the proxy runs and redirects to landing.
    // clearLocalAppData already ran above and will also run in SIGNED_OUT.
    window.location.href = "/";
  }, []);

  return { user, loading, signOut };
}

