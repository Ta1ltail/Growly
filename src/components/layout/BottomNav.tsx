"use client";

// Mobile bottom navigation — a single clean bar with 5 primary tabs and a
// "More" button that opens a sliding bottom sheet with all remaining routes.
// No more dual-bar setup. Smooth spring animations, safe-area-aware.

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutGrid,
  CalendarRange,
  ChartColumnIncreasing,
  UserRound,
  LayoutDashboard,
  ListTodo,
  Target,
  NotebookPen,
  Trophy,
  ShoppingBag,
  Users,
  Medal,
  Bell,
  Lightbulb,
  Settings2,
  LayoutTemplate,
  Grip,
  X,
  type LucideIcon,
} from "lucide-react";
import { isActive, routeIconColors } from "./navItems";

/* ─────────────────────────────────────────
   Primary tabs (5 shown in the bar)
   ───────────────────────────────────────── */

const PRIMARY_TABS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/tracker", label: "Tracker", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/stats", label: "Stats", icon: ChartColumnIncreasing },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

/* ─────────────────────────────────────────
   More drawer items (grouped)
   ───────────────────────────────────────── */

interface DrawerGroup {
  title: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Manage",
    items: [
      { href: "/habits", label: "Habits", icon: ListTodo },
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/notes", label: "Notes", icon: NotebookPen },
    ],
  },
  {
    title: "Social",
    items: [
      { href: "/friends", label: "Friends", icon: Users },
      { href: "/leaderboard", label: "Leaderboard", icon: Medal },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/suggestions", label: "Suggestions", icon: Lightbulb },
    ],
  },
  {
    title: "Collection",
    items: [
      { href: "/achievements", label: "Achievements", icon: Trophy },
      { href: "/shop", label: "Shop", icon: ShoppingBag },
    ],
  },
  {
    title: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings2 }],
  },
];

/* ─────────────────────────────────────────
   BottomNav component
   ───────────────────────────────────────── */

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when the drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close on Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Close drawer on navigation
  const onNav = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Close when tapping the backdrop
  const onBackdropTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (e.target === e.currentTarget) setDrawerOpen(false);
    },
    [],
  );

  return (
    <>
      {/* ── Main nav bar ── */}
      <nav className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-muted"
                  }`}
                >
                  <Icon
                    className={`size-5 transition-all duration-300 ${
                      active
                        ? "animate-icon-bounce stroke-[2.5]"
                        : "stroke-[1.8]"
                    }`}
                  />
                </span>
                <span
                  className={`transition-colors duration-200 leading-none ${
                    active ? "text-accent font-semibold" : "text-faint"
                  }`}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}

          {/* ── More button ── */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="More navigation options"
            aria-expanded={drawerOpen}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium"
          >
            <span className="flex size-10 items-center justify-center rounded-xl text-muted transition-colors">
              <Grip className="size-5 stroke-[1.8]" />
            </span>
            <span className="leading-none text-faint">More</span>
          </button>
        </div>
      </nav>

      {/* ── More drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in md:hidden"
          style={{ animationDuration: "0.2s" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onBackdropTap}
            onTouchEnd={onBackdropTap}
          />

          {/* Sheet */}
          <div
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 animate-rise rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-line"
            style={{ maxHeight: "75dvh" }}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <div className="mx-auto h-1 w-10 rounded-full bg-line" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-sm font-bold">All sections</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex size-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-ink"
                aria-label="Close navigation drawer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Groups */}
            <div className="overflow-y-auto px-3 pb-4" style={{ maxHeight: "calc(75dvh - 80px)" }}>
              {DRAWER_GROUPS.map((group) => (
                <div key={group.title} className="mb-1">
                  <p className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
                    {group.title}
                  </p>
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    const colorClass = routeIconColors[href] ?? "text-muted";
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onNav}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent/10 text-accent"
                            : "text-muted hover:bg-surface2 hover:text-ink"
                        }`}
                      >
                        <span className="relative">
                          <Icon
                            className={`size-4.5 transition-colors ${
                              active ? "text-accent" : colorClass
                            }`}
                            strokeWidth={active ? 2.5 : 2}
                          />
                        </span>
                        {label}
                        {active && (
                          <span className="ml-auto size-1.5 rounded-full bg-accent" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
