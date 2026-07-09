"use client";

// NotificationBell — a compact bell icon that shows the unread count.
// Fetches the count directly (no realtime subscription — avoids collisions
// with the /notifications page which uses useNotifications).
// Links to /notifications so the user can see all notifications.
// Notification bell shown in the sidebar header area.
// the notifications page via bottom nav.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/util";

interface Props {
  className?: string;
  size?: number;
}

export function NotificationBell({ className, size = 18 }: Props) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setUnreadCount(0));
      return;
    }

    const userId = user.id;
    async function fetchCount() {
      const supabase = createClient();
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    }

    fetchCount();

    // Refresh when tab becomes visible (catches notifications from other tabs/sessions)
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  return (
    <Link
      href="/notifications"
      className={cn("relative inline-flex items-center justify-center", className)}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className="transition-colors hover:text-ink" size={size} strokeWidth={2} />
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-surface animate-in fade-in zoom-in">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
