"use client";

// Mobile bottom navigation (hidden on desktop). Icon + label, animated active pill.
// Includes a secondary chip bar with extra destinations above the main tabs.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListTodo,
  Target,
  ShoppingBag,
  Trophy,
  NotebookPen,
  LayoutTemplate,
} from "lucide-react";
import { NAV_BOTTOM, isActive } from "./navItems";

const EXTRA_NAV = [
  { href: "/habits", label: "Habits", icon: ListTodo },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <>
      {/* Secondary chip bar — scrollable row of extra destinations */}
      <nav className="glass fixed inset-x-0 bottom-16 z-20 border-t border-line md:hidden overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1.5 px-3 py-2 pb-[env(safe-area-inset-bottom)]">
          {EXTRA_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                    : "bg-surface2/60 text-muted hover:bg-surface2 hover:text-ink"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main bottom nav bar */}
      <nav className="glass fixed inset-x-0 bottom-0 z-20 border-t border-line md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV_BOTTOM.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    active ? "bg-accent/15 text-accent" : "text-muted"
                  }`}
                >
                  <Icon
                    className={`size-5 transition-all duration-300 ${
                      active ? "animate-icon-bounce stroke-[2.5]" : ""
                    }`}
                  />
                </span>
                <span
                  className={`transition-colors duration-200 ${active ? "text-accent" : "text-faint"}`}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute -bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
