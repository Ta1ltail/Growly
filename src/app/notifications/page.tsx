"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  UserPlus,
  UserCheck,
  Trophy,
  Sparkles,
  ChevronRight,
  Loader2,
  Inbox,
} from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { useNotifications } from "@/hooks/useNotifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { cn } from "@/lib/util";

const TYPE_ICON: Record<string, React.ReactNode> = {
  friend_request: <UserPlus className="size-4" />,
  friend_accept: <UserCheck className="size-4" />,
  achievement: <Trophy className="size-4" />,
  system: <Sparkles className="size-4" />,
};

export default function NotificationsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  if (!hydrated) return <PageSkeleton />;

  return (
    <AppPageShell>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <PageHeader title="Notifications" subtitle="Stay in the loop" />
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-xl bg-surface2 px-3 py-2 text-xs font-semibold text-muted transition-all hover:bg-surface2/80 hover:text-ink active:scale-95"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <Card className="flex items-center justify-center p-8">
            <Loader2 className="size-5 animate-spin text-faint" />
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-surface2">
              <Inbox className="size-6 text-faint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted">All clear</p>
              <p className="text-xs text-faint mt-1">
                No notifications yet. Friend requests and updates will appear
                here.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markAsRead(n.id);
                  if (n.link) router.push(n.link);
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl px-4 py-3 transition-colors",
                  n.is_read
                    ? "hover:bg-surface2/40"
                    : "bg-accent/5 hover:bg-accent/10",
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                    n.is_read ? "bg-surface2 text-muted" : "bg-accent/15 text-accent",
                  )}
                >
                  {TYPE_ICON[n.type] ?? <Bell className="size-4" />}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        n.is_read ? "text-muted" : "font-semibold text-ink",
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-faint">{n.body}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-faint">
                      {timeAgo(new Date(n.created_at))}
                    </span>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent hover:underline"
                      >
                        View <ChevronRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppPageShell>
  );
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
