import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { createMobileClient } from "../lib/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { colors } from "../lib/colors";

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

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TYPE_ICONS: Record<string, string> = {
  friend_request: "👥",
  friend_accept: "✅",
  achievement: "🏆",
  system: "✨",
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof createMobileClient> | null>(null);
  const channelRef = useRef<any>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const supabase = createMobileClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, from_user, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [user]);

  // Set up Realtime subscription
  useEffect(() => {
    if (!supabaseRef.current) supabaseRef.current = createMobileClient();
    const supabase = supabaseRef.current;

    loadNotifications();

    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Notification;
            setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => prev.filter((n) => n.id !== (payload.old as Notification).id));
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const supabase = createMobileClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const supabase = createMobileClient();
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <PageHeader title="Notifications" subtitle="Stay in the loop" />
        <Card style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>Sign in required</Text>
          <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Sign in to receive notifications about friend requests, achievements, and system updates.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        action={
          unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} style={{ backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      {loading ? (
        <Card style={{ padding: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </Card>
      ) : notifications.length === 0 ? (
        <Card style={{ padding: 32, alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>All clear</Text>
          <Text style={{ color: colors.faint, fontSize: 13, textAlign: "center" }}>No notifications yet.</Text>
        </Card>
      ) : (
        notifications.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => markAsRead(n.id)}
            style={[styles.notifRow, !n.is_read && { backgroundColor: `${colors.accent}0d` }]}
          >
            <View style={[styles.iconCircle, !n.is_read && { backgroundColor: `${colors.accent}1a` }]}>
              <Text style={{ fontSize: 16 }}>{TYPE_ICONS[n.type] ?? "🔔"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, !n.is_read && { fontWeight: "700", color: colors.ink }]}>{n.title}</Text>
              {n.body && <Text style={styles.notifBody}>{n.body}</Text>}
              <Text style={styles.notifTime}>{timeAgo(new Date(n.created_at))}</Text>
            </View>
            {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  iconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  notifTitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  notifBody: { color: colors.faint, fontSize: 12, marginTop: 2 },
  notifTime: { color: colors.faint, fontSize: 10, marginTop: 4 },
});
