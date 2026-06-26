"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLocalAppData } from "@/lib/storage";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);

      // If user is logged in but "Remember Me" is off, check the flag
      if (user) {
        const rememberMe = localStorage.getItem("project101.remember_me");
        if (rememberMe !== "true") {
          // Remember Me was not set — sign out silently and clear local data
          supabase.auth.signOut();
          clearLocalAppData();
          setUser(null);
        }
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setUser(null);
        clearLocalAppData();
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalAppData();
    setUser(null);
    // Force a hard navigation so the proxy runs and redirects to landing
    window.location.href = "/";
  }, []);

  return { user, loading, signOut };
}

