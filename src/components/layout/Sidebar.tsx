"use client";

// Desktop sidebar (hidden on mobile). Brand, grouped nav links.
// Icons are colourized with idle animations for a premium feel.
// Sign out is handled on the Profile page.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { NAV_GROUPS, isActive } from "./navItems";
import { NotificationBell } from "@/components/notifications/NotificationBell";

// Icon color map for navigation items — gives each section a distinct accent
const ICON_COLORS: Record<string, string> = {
  "/": "text-sky-500",
  "/today": "text-emerald-500",
  "/habits": "text-violet-500",
  "/tracker": "text-cyan-500",
  "/calendar": "text-rose-500",
  "/goals": "text-amber-500",
  "/templates": "text-orange-500",
  "/notes": "text-pink-500",
  "/stats": "text-blue-500",
  "/achievements": "text-yellow-500",
  "/shop": "text-emerald-500",
  "/settings": "text-slate-400",
  "/profile": "text-violet-400",
};

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="glass fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-3 pb-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white shadow-lg ring-accent-soft">
          <Activity className="size-4" strokeWidth={2.5} />
        </span>
        <span className="font-mono text-sm font-semibold tracking-tight">
          project_101
        </span>
        <span className="ml-auto">
          <NotificationBell size={16} />
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title ?? gi} className="flex flex-col gap-0.5">
            {group.title && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {group.title}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              const colorClass = ICON_COLORS[href] ?? "text-muted";
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  <span className="relative">
                    <Icon
                      className={`size-4.5 transition-all duration-300 group-hover:animate-icon-wiggle ${
                        active
                          ? `text-accent animate-icon-bounce`
                          : `${colorClass} group-hover:text-ink`
                      }`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    {active && (
                      <span className="absolute -inset-2 animate-glow-pulse rounded-full bg-accent/10" />
                    )}
                  </span>
                  {label}
                  {active && (
                    <span className="ml-auto size-1.5 rounded-full bg-accent animate-icon-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
