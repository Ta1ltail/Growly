"use client";

// Full-screen "More" page overlay — shows every app route in organised categories.

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  LayoutGrid,
  CalendarRange,
  Target,
  LayoutTemplate,
  NotebookPen,
  ChartColumnIncreasing,
  Trophy,
  ShoppingBag,
  Medal,
  Users,
  Bell,
  Lightbulb,
  Settings2,
  UserRound,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { isActive, routeIconColors } from "./navItems";
import { SoundManager } from "@/lib/sound/SoundManager";
import { useScrollLock } from "@/hooks/useScrollLock";

/* ─── Categories ─── */

interface MoreItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

interface MoreCategory {
  title: string;
  items: MoreItem[];
}

const MORE_CATEGORIES: MoreCategory[] = [
  {
    title: "Productivity",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Overview & progress at a glance",
      },
      {
        href: "/today",
        label: "Today",
        icon: CalendarDays,
        description: "Daily check-in & quick actions",
      },
      {
        href: "/habits",
        label: "Habits",
        icon: ListTodo,
        description: "Manage and create new habits",
      },
      {
        href: "/tracker",
        label: "Tracker",
        icon: LayoutGrid,
        description: "Weekly habit completion grid",
      },
    ],
  },
  {
    title: "Planning",
    items: [
      {
        href: "/calendar",
        label: "Calendar",
        icon: CalendarRange,
        description: "Monthly view & mark history",
      },
      {
        href: "/goals",
        label: "Goals",
        icon: Target,
        description: "Track your long-term targets",
      },
      {
        href: "/templates",
        label: "Templates",
        icon: LayoutTemplate,
        description: "Pre-built habit templates",
      },
      {
        href: "/notes",
        label: "Notes",
        icon: NotebookPen,
        description: "Journal & personal reflections",
      },
    ],
  },
  {
    title: "Growth",
    items: [
      {
        href: "/stats",
        label: "Statistics",
        icon: ChartColumnIncreasing,
        description: "Charts, streaks & insights",
      },
      {
        href: "/achievements",
        label: "Achievements",
        icon: Trophy,
        description: "Badges & milestones",
      },
      {
        href: "/shop",
        label: "Shop",
        icon: ShoppingBag,
        description: "Cosmetics & power-ups",
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        icon: Medal,
        description: "Community rankings",
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        href: "/friends",
        label: "Friends",
        icon: Users,
        description: "Connect with other growers",
      },
      {
        href: "/notifications",
        label: "Alerts",
        icon: Bell,
        description: "Updates & friend requests",
      },
      {
        href: "/suggestions",
        label: "Suggestions",
        icon: Lightbulb,
        description: "Share your ideas",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/profile",
        label: "Profile",
        icon: UserRound,
        description: "Your character & stats",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings2,
        description: "App preferences & theme",
      },
    ],
  },
];

/* ─── Component ─── */

export function MorePage({
  open,
  onClose,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  // Use centralized scroll lock
  useScrollLock(open);

  // Notify Capacitor back-button handler, close on Escape
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("modal:open"));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        SoundManager.instance.play("button:back");
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.dispatchEvent(new CustomEvent("modal:close"));
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden animate-fade-in motion-safe:animate-slide-up">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Page */}
      <div
        className="absolute bottom-0 left-0 right-0 top-0 flex flex-col rounded-t-3xl bg-bg motion-safe:animate-rise"
        style={{
          animationDuration: "0.35s",
          marginTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          }}
        >
          <div>
            <h2 className="text-lg font-bold text-ink">All sections</h2>
            <p className="text-xs text-faint">Everything in one place</p>
          </div>
          <button
            onClick={() => {
              SoundManager.instance.play("button:cancel");
              onClose();
            }}
            className="flex size-10 items-center justify-center rounded-xl bg-surface2 text-muted transition-colors hover:bg-surface2/80 hover:text-ink active:scale-95"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable categories */}
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <div className="space-y-6">
            {MORE_CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest text-faint">
                  {category.title}
                </h3>
                <div className="space-y-1">
                  {category.items.map(
                    ({ href, label, icon: Icon, description }) => {
                      const active = isActive(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => {
                            SoundManager.instance.play("button:nav");
                            onClose();
                          }}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] ${
                            active
                              ? "bg-accent/8"
                              : "bg-surface hover:bg-surface2/70"
                          }`}
                        >
                          <span
                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              active
                                ? "bg-accent/15 text-accent"
                                : "bg-surface2"
                            } ${routeIconColors[href] ?? "text-muted"}`}
                          >
                            <Icon
                              className="size-5"
                              strokeWidth={active ? 2.5 : 2}
                            />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium leading-tight ${
                                active ? "text-accent" : "text-ink"
                              }`}
                            >
                              {label}
                            </p>
                            <p className="mt-0.5 text-xs leading-tight text-faint line-clamp-1">
                              {description}
                            </p>
                          </div>

                          {active && (
                            <span className="size-2 shrink-0 rounded-full bg-accent" />
                          )}
                        </Link>
                      );
                    },
                  )}
                </div>
              </div>
            ))}

            {/* Sign out */}
            <div className="border-t border-line/50 pt-4">
              <button
                onClick={() => {
                  SoundManager.instance.play("button:cancel");
                  onClose();
                  onSignOut();
                }}
                className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] hover:bg-missed/10"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface2 text-muted">
                  <LogOut className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium leading-tight text-muted transition-colors hover:text-missed">
                    Sign out
                  </p>
                  <p className="mt-0.5 text-xs leading-tight text-faint line-clamp-1">
                    End your current session
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
