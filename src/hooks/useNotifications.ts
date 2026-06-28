"use client";

// React hook for the notification system — querying, creating (including
// auto-wiring friend request notifications), and marking as read.
// Notifications live in the `notifications` Supabase table.
// Uses Supabase Realtime subscription instead of polling for instant updates.

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  type: "friend_request" | "friend_accept" | "achievement" | "system";
  title: string;
  body: string;
  from_user: string | null;
  link: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, from_user, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [user]);

  // Handle a realtime change from Supabase
  const handleRealtimeChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Notification>) => {
      if (payload.eventType === "INSERT") {
        setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
      } else if (payload.eventType === "UPDATE") {
        const updated = payload.new as Notification;
        setNotifications((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n)),
        );
      } else if (payload.eventType === "DELETE") {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== (payload.old as Notification).id),
        );
      }
    },
    [],
  );

  // Set up Supabase Realtime subscription + initial load
  useEffect(() => {
    // Use a stable supabase client instance across this component's lifetime
    if (!supabaseRef.current) supabaseRef.current = createClient();
    const supabase = supabaseRef.current;

    loadNotifications();

    if (!user) {
      // Clean up any existing channel when user signs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          handleRealtimeChange(payload);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, loadNotifications, handleRealtimeChange]);

  // Also refresh when the tab becomes visible again (covers reconnection after sleep)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true })),
    );
  }, [user]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: loadNotifications,
  };
}
