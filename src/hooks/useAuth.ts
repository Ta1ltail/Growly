"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    // Note: we do NOT clear localStorage here — local data is preserved across
    // sign-out so that pending async sync operations (pushMutation, which is
    // fire-and-forget) are not lost mid-flight. On next sign-in, SyncProvider
    // detects if the user changed and clears stale local data at that point.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
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
    await supabase.auth.signOut();
    // The onAuthStateChange listener handles clearLocalAppData + setUser(null).
    // Hard navigation ensures the proxy runs and redirects to landing.
    window.location.href = "/";
  }, []);

  return { user, loading, signOut };
}

