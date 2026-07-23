"use client";

// NotificationBell — a compact bell icon that shows the unread count.
// Uses the shared useNotifications singleton store so the badge receives
// Realtime updates instantly without a separate Supabase subscription.
// Links to /notifications so the user can see all notifications.

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/util";
import { SoundManager } from "@/lib/sound/SoundManager";

interface Props {
  className?: string;
  size?: number;
}

export function NotificationBell({ className, size = 18 }: Props) {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/notifications"
      onClick={() => SoundManager.instance.play("button:nav")}
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
