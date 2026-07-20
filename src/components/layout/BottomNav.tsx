"use client";

// Mobile bottom navigation — 5 tabs: Home, Today, More, Notifications, Profile.
// The More button opens a full-screen page with every app route in organised
// categories. The Profile button shows the user's actual avatar or initials.
// Notifications has an unread badge. Solid bg, safe-area-aware.
// Auto-hides when scrolling down, reveals when scrolling up or at top.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Grip,
  Bell,
  ListTodo,
  Target,
  LayoutGrid,
  CalendarRange,
  LayoutTemplate,
  NotebookPen,
  ChartColumnIncreasing,
  Trophy,
  ShoppingBag,
  Medal,
  Users,
  Lightbulb,
  Settings2,
  UserRound,
  LogOut,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { resolveAvatar } from "@/lib/cosmetics";
import { isActive, routeIconColors } from "./navItems";

/* ─────────────────────────────────────────
   Nav items (5 shown in the bar)
   ───────────────────────────────────────── */

interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_TABS: NavTab[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "#more", label: "More", icon: LayoutDashboard }, // icon placeholder — special-cased below
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];

// Icon colors — matching sidebar route colors
const BOTTOM_NAV_ICON_COLORS: Record<string, string> = {
  "/dashboard": "text-indigo-500",
  "/today": "text-emerald-500",
  "/notifications": "text-red-400",
  "/profile": "text-violet-400",
};

/* ─────────────────────────────────────────
   More page categories — EVERY route, with
   descriptions for a premium feel.
   ───────────────────────────────────────── */

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
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & progress at a glance" },
      { href: "/today", label: "Today", icon: CalendarDays, description: "Daily check-in & quick actions" },
      { href: "/habits", label: "Habits", icon: ListTodo, description: "Manage and create new habits" },
      { href: "/tracker", label: "Tracker", icon: LayoutGrid, description: "Weekly habit completion grid" },
    ],
  },
  {
    title: "Planning",
    items: [
      { href: "/calendar", label: "Calendar", icon: CalendarRange, description: "Monthly view & mark history" },
      { href: "/goals", label: "Goals", icon: Target, description: "Track your long-term targets" },
      { href: "/templates", label: "Templates", icon: LayoutTemplate, description: "Pre-built habit templates" },
      { href: "/notes", label: "Notes", icon: NotebookPen, description: "Journal & personal reflections" },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/stats", label: "Statistics", icon: ChartColumnIncreasing, description: "Charts, streaks & insights" },
      { href: "/achievements", label: "Achievements", icon: Trophy, description: "Badges & milestones" },
      { href: "/shop", label: "Shop", icon: ShoppingBag, description: "Cosmetics & power-ups" },
      { href: "/leaderboard", label: "Leaderboard", icon: Medal, description: "Community rankings" },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/friends", label: "Friends", icon: Users, description: "Connect with other growers" },
      { href: "/notifications", label: "Alerts", icon: Bell, description: "Updates & friend requests" },
      { href: "/suggestions", label: "Suggestions", icon: Lightbulb, description: "Share your ideas" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: UserRound, description: "Your character & stats" },
      { href: "/settings", label: "Settings", icon: Settings2, description: "App preferences & theme" },
    ],
  },
];

/* ─────────────────────────────────────────
   Helpers
   ───────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────────────────────────────────────
   BottomNav component
   ───────────────────────────────────────── */

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAppData();
  const { unreadCount } = useNotifications();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [modalCount, setModalCount] = useState(0);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Auto-hide bottom nav on scroll down, reveal on scroll up.
  // Reads scroll position from document.scrollingElement (not window.scrollY)
  // so it works correctly even when body (not html) is the scroll container
  // — which happens inside the Capacitor WebView after scrollbar-hiding CSS
  // is applied. The scroll event listener stays on window because all scroll
  // events bubble up to window regardless of which element is the scroller.
  useEffect(() => {
    const handleScroll = () => {
      // Skip when the More page is open to avoid hiding nav behind the overlay
      if (moreOpen) return;
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const el = document.scrollingElement;
        if (!el) { ticking.current = false; return; }
        const scrollY = el.scrollTop;
        const maxScroll = Math.max(el.scrollHeight - window.innerHeight, 0);
        // Ignore tiny scroll deltas (rubber-banding on iOS, Safari bounce)
        const delta = Math.abs(scrollY - lastScrollY.current);
        if (delta < 3) {
          ticking.current = false;
          return;
        }
        // If at the very top or scrolling up — show nav
        if (scrollY <= 0 || scrollY < lastScrollY.current) {
          setVisible(true);
        } else if (scrollY > lastScrollY.current && scrollY < maxScroll) {
          // Scrolling down and not at bottom — hide nav
          setVisible(false);
        }
        lastScrollY.current = scrollY;
        ticking.current = false;
      });
    };

    // Listen on window — scroll events always bubble up to window regardless
    // of which element is the actual scroller (html or body).
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [moreOpen]);

  // Hide nav when any modal/popup/dialog is open (Edit Profile, Add Habit,
  // Add Note, Add Goal, Daily Spin, etc.) — prevents the nav from overlapping
  // or being visible behind the modal.
  // Uses a counter (not boolean) so stacked modals work correctly: nav only
  // reappears when ALL modals have closed (count reaches 0).
  useEffect(() => {
    const onOpen = () => setModalCount(c => c + 1);
    const onClose = () => setModalCount(c => Math.max(0, c - 1));
    window.addEventListener("modal:open", onOpen);
    window.addEventListener("modal:close", onClose);
    return () => {
      window.removeEventListener("modal:open", onOpen);
      window.removeEventListener("modal:close", onClose);
    };
  }, []);

  // Sync Android navigation bar color with bottom nav surface.
  // Runs on every theme/mode change by observing data-theme attribute changes.
  useEffect(() => {
    const syncNavColor = () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) return;
      const surface = getComputedStyle(document.documentElement)
        .getPropertyValue("--c-surface")
        .trim();
      if (surface) {
        meta.setAttribute("content", surface);
      }
    };

    // Sync now
    syncNavColor();

    // Re-sync when the theme changes (data-theme attribute mutation)
    const observer = new MutationObserver(syncNavColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Prevent body scroll when the More page is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal:open"));
    } else {
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("modal:close"));
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  // Close on Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // Resolve avatar for the Profile button
  const avatarResolved = profile.avatar
    ? resolveAvatar(profile.avatar)
    : null;
  const initials = getInitials(profile.displayName);

  return (
    <>
      {/* ── Bottom nav bar ── */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-30 bg-black md:hidden transition-transform duration-300 ease-out ${
          visible && modalCount === 0 ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "var(--safe-area-bottom, 0px)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {NAV_TABS.map(({ href, label, icon: Icon }) => {
            // More button is special
            if (href === "#more") {
              const isOpen = moreOpen;
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  aria-label="Open all sections"
                  aria-expanded={isOpen}
                  className="group relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl ring-1 ring-accent/30 transition-all duration-200 group-hover:ring-accent/60">
                    <Grip className="size-5 stroke-[1.8]" />
                  </span>
                  <span className="leading-none">More</span>
                </button>
              );
            }

            const active = isActive(pathname, href);
            const baseIconColor = BOTTOM_NAV_ICON_COLORS[href] ?? "text-muted";

            // Profile button — show avatar or initials
            if (href === "/profile") {
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    active ? "text-accent" : "text-muted hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-full transition-all duration-200 ring-2 ${
                      active
                        ? "bg-accent/12 ring-accent/50"
                        : "ring-surface2/80 hover:ring-accent/40"
                    }`}
                  >
                    {avatarResolved?.kind === "image" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic avatar URL */}
                        <img
                          src={avatarResolved.src}
                          alt="Your avatar"
                          className="size-7 rounded-full object-cover"
                        />
                      </>
                    ) : avatarResolved?.kind === "glyph" ? (
                      <span className="text-sm leading-none" role="img">
                        {avatarResolved.glyph}
                      </span>
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold leading-none text-accent">
                        {initials || <UserRound className="size-4" />}
                      </span>
                    )}
                  </span>
                  <span className={`leading-none ${active ? "font-semibold" : ""}`}>
                    Profile
                  </span>
                  {active && (
                    <span className="absolute -top-px left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent" />
                  )}
                </Link>
              );
            }

            // Notifications button — with unread badge
            if (href === "/notifications") {
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    active ? "text-accent" : "text-muted hover:text-ink"
                  }`}
                >
                  <span
                    className={`relative flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                      active ? "bg-accent/12" : ""
                    }`}
                  >
                    <Icon
                      className={`size-5 transition-all duration-300 ${
                        active ? "stroke-[2.5]" : "stroke-[1.8]"
                      } ${active ? "" : baseIconColor}`}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 py-px text-[9px] font-bold leading-tight text-white ring-2 ring-surface">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className={`leading-none ${active ? "font-semibold" : ""}`}>
                    Alerts
                  </span>
                  {active && (
                    <span className="absolute -top-px left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent" />
                  )}
                </Link>
              );
            }

            // Standard tab (Home, Today)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active ? "text-accent" : "text-muted hover:text-ink"
                }`}
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    active ? "bg-accent/12" : ""
                  }`}
                >
                  <Icon
                    className={`size-5 transition-all duration-300 ${
                      active ? "stroke-[2.5]" : "stroke-[1.8]"
                    } ${active ? "" : baseIconColor}`}
                  />
                </span>
                <span className={`leading-none ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute -top-px left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Full-screen More page ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-fade-in motion-safe:animate-slide-up">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
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
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
            >
              <div>
                <h2 className="text-lg font-bold text-ink">All sections</h2>
                <p className="text-xs text-faint">Everything in one place</p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
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
                      {category.items.map(({ href, label, icon: Icon, description }) => {
                        const active = isActive(pathname, href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMoreOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] ${
                              active
                                ? "bg-accent/8"
                                : "bg-surface hover:bg-surface2/70"
                            }`}
                          >
                            {/* Icon container — coloured per route */}
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

                            {/* Text */}
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

                            {/* Active indicator */}
                            {active && (
                              <span className="size-2 shrink-0 rounded-full bg-accent" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Sign out */}
                <div className="pt-4 border-t border-line/50">
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      signOut();
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
      )}
    </>
  );
}
