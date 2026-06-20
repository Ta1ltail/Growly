"use client";

// Mobile bottom navigation (hidden on desktop). Icon + label, animated active pill.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_BOTTOM, isActive } from "./navItems";

export function BottomNav() {
  const pathname = usePathname();
  return (
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
  );
}
