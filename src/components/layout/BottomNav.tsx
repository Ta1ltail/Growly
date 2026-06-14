"use client";

// Mobile bottom navigation (hidden on desktop). Icon + label, animated active pill.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./navItems";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-20 border-t border-line md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
            >
              <span
                className={`flex size-9 items-center justify-center rounded-xl transition-all ${
                  active ? "bg-accent/15 text-accent" : "text-muted"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className={active ? "text-accent" : "text-faint"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
