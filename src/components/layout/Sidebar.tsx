"use client";

// Desktop sidebar (hidden on mobile). Brand, nav links, and a footer note.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { NAV_ITEMS, isActive } from "./navItems";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="glass fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-3 pb-6">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white shadow-lg ring-accent-soft">
          <Activity className="size-4" strokeWidth={2.5} />
        </span>
        <span className="font-mono text-sm font-semibold tracking-tight">project_101</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface2 hover:text-ink"
              }`}
            >
              <Icon
                className={`size-[18px] transition-transform group-hover:scale-110 ${
                  active ? "text-accent" : ""
                }`}
              />
              {label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 pt-4 font-mono text-[10px] leading-relaxed text-faint">
        Phase 1-3 · local data
        <br />
        v0.2 — modern rework
      </p>
    </aside>
  );
}
