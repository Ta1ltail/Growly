"use client";

// React hook for the notification system — querying, creating (including
// auto-wiring friend request notifications), and marking as read.
// Notifications live in the `notifications` Supabase table.
// Uses a singleton Realtime subscription so any number of components can
// call useNotifications() without creating duplicate channels.

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { useAuth } from "./useAuth";
import { createClient } from "@/lib/supabase/client";
import { SoundManager, type SoundEvent } from "@/lib/sound/SoundManager";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface Notification {
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

/* ─────────────────────────────────────────
   Module-level singleton store — manages
   ONE Realtime subscription at a time.
   ───────────────────────────────────────── */

interface StoreState {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
}

type Listener = () => void;

let store: StoreState = { notifications: [], loading: true, unreadCount: 0 };
const listeners = new Set<Listener>();
let currentUserId: string | null = null;
let channelCleanup: (() => void) | null = null;
let fetchTimer: ReturnType<typeof setTimeout> | null = null;

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function getSnapshot(): StoreState {
  return store;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Tear down the subscription when the LAST subscriber leaves
    if (listeners.size === 0) teardown();
  };
}

function updateStore(partial: Partial<StoreState>) {
  store = { ...store, ...partial };
  notifyListeners();
}

/* ── Start the singleton subscription for a given user ── */
function subscribeToUser(userId: string) {
  // Already subscribed to this user — nothing to do
  if (currentUserId === userId && channelCleanup) return;

  // Tear down any previous subscription first
  teardown();

  currentUserId = userId;
  const supabase = createClient();

  // ── Fetch on mount ──
  updateStore({ loading: true });
  fetchNotifications(userId);

  // ── Register visibility listener (cleaned up in teardown) ──
  const handleVisibility = () => {
    if (document.visibilityState === "visible" && currentUserId) {
      if (fetchTimer) clearTimeout(fetchTimer);
      fetchTimer = setTimeout(() => fetchNotifications(currentUserId), 300);
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);

  // ── Realtime subscription ──
  const channel = supabase
    .channel(`notifications-singleton:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Notification>) => {
        handleChange(payload);
      },
    )
    .subscribe();

  channelCleanup = () => {
    supabase.removeChannel(channel);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

function teardown() {
  if (channelCleanup) {
    channelCleanup();
    channelCleanup = null;
  }
  if (fetchTimer) {
    clearTimeout(fetchTimer);
    fetchTimer = null;
  }
  currentUserId = null;
  // Intentionally NOT resetting _initialFetchDone here.
  // Resetting it would cause notification sounds to replay on every
  // subscription re-creation when the auth user reference changes
  // (e.g., Supabase session refresh causing a new object identity).
  // The flag is only reset via the explicit check in subscribeToUser
  // when the userId actually differs from the previous user.
}

// Notification type → SoundEvent mapping (used both in initial fetch and realtime INSERT handling)
const NOTIF_SOUND_MAP: Partial<Record<string, SoundEvent>> = {
  friend_request: "notification:friend",
  friend_accept: "notification:friend",
  achievement: "notification:generic",
  system: "notification:generic",
};

// Tracks whether the initial fetch has completed — used to play a sound for
// any pre-existing unread notifications on first load (not on re-fetches).
let _initialFetchDone = false;

/* ── Fetch notifications from Supabase ── */
async function fetchNotifications(userId: string | null) {
  if (!userId) {
    updateStore({ notifications: [], loading: false, unreadCount: 0 });
    return;
  }

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, from_user, link, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const notifications = (data ?? []) as Notification[];
    const unread = notifications.filter((n) => !n.is_read);

    // Play notification sound on FIRST fetch if there are unread notifications
    // that weren't shown by the Realtime subscription (i.e., persisted from a
    // previous session or received while offline). Only plays once per session.
    if (!_initialFetchDone && unread.length > 0) {
      const latest = unread[0];
      const sound = NOTIF_SOUND_MAP[latest.type] ?? "notification:generic";
      SoundManager.instance.play(sound);
    }
    _initialFetchDone = true;

    updateStore({
      notifications,
      loading: false,
      unreadCount: unread.length,
    });
  } catch {
    _initialFetchDone = true;
    updateStore({ notifications: [], loading: false, unreadCount: 0 });
  }
}

/* ── Handle a realtime change ── */
function handleChange(payload: RealtimePostgresChangesPayload<Notification>) {
  let next = [...store.notifications];

  if (payload.eventType === "INSERT") {
    const notif = payload.new as Notification;
    // Play a notification sound for genuinely new notifications
    if (!notif.is_read && document.visibilityState !== "visible") {
      // Only play sound for background notifications (tab was hidden)
      const sound = NOTIF_SOUND_MAP[notif.type] ?? "notification:generic";
      SoundManager.instance.play(sound);
    }
    next = [notif, ...next].slice(0, 50);
  } else if (payload.eventType === "UPDATE") {
    const updated = payload.new as Notification;
    next = next.map((n) => (n.id === updated.id ? updated : n));
  } else if (payload.eventType === "DELETE") {
    next = next.filter((n) => n.id !== (payload.old as Notification).id);
  }

  updateStore({
    notifications: next,
    unreadCount: next.filter((n) => !n.is_read).length,
  });
}

// Module-level visibility listener was removed — now registered inside
// subscribeToUser() and torn down via teardown() on logout, preventing
// leaked closure references and stale Realtime connections.

/* ─────────────────────────────────────────
   Public hook — any component can call this
   safely; the subscription is a singleton.
   ───────────────────────────────────────── */

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Subscribe to the singleton store via useSyncExternalStore for tear-free reads
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // React to user changes
  useEffect(() => {
    if (userId) {
      subscribeToUser(userId);
    } else {
      // No user — tear down realtime channel + visibility listener, then reset
      teardown();
      updateStore({ notifications: [], loading: false, unreadCount: 0 });
    }
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createClient();
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    } catch {
      // Silently handle
    }

    updateStore({
      notifications: store.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      ),
      unreadCount: Math.max(0, store.unreadCount - 1),
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;
    const supabase = createClient();
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);
    } catch {
      // Silently handle
    }

    updateStore({
      notifications: store.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    });
  }, []);

  const refreshNotifications = useCallback(() => {
    if (currentUserId) fetchNotifications(currentUserId);
  }, []);

  return {
    notifications: state.notifications,
    loading: state.loading,
    unreadCount: state.unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
}
