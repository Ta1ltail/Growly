"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Route-to-section mapping for desktop breadcrumbs.
const ROUTE_SECTION: Record<string, { section: string; label: string }> = {
  "/dashboard": { section: "", label: "Dashboard" },
  "/today": { section: "", label: "Today" },
  "/habits": { section: "Track", label: "Habits" },
  "/tracker": { section: "Track", label: "Tracker" },
  "/calendar": { section: "Track", label: "Calendar" },
  "/goals": { section: "Grow", label: "Goals" },
  "/templates": { section: "Grow", label: "Templates" },
  "/notes": { section: "Grow", label: "Notes" },
  "/stats": { section: "Review", label: "Statistics" },
  "/achievements": { section: "Review", label: "Achievements" },
  "/shop": { section: "Review", label: "Shop" },
  "/friends": { section: "Social", label: "Friends" },
  "/leaderboard": { section: "Social", label: "Leaderboard" },
  "/notifications": { section: "Social", label: "Notifications" },
  "/suggestions": { section: "Social", label: "Suggestions" },
  "/settings": { section: "You", label: "Settings" },
  "/profile": { section: "You", label: "Profile" },
};

// Consistent page header: breadcrumb, big title, optional subtitle, optional right-side action.
// Breadcrumbs are auto-detected from the current route — no manual pathname prop needed.

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const breadcrumb = pathname ? ROUTE_SECTION[pathname] : null;

  return (
    <header className="mb-6 flex items-end justify-between gap-4 animate-rise">
      <div>
        {/* Desktop breadcrumb — shows section context above the title */}
        {breadcrumb?.section && (
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 mb-0.5 text-[11px] font-medium text-faint">
            <Link href="/dashboard" className="transition-colors hover:text-muted">Home</Link>
            <ChevronRightIcon className="size-3" />
            <span className="text-muted">{breadcrumb.section}</span>
            <ChevronRightIcon className="size-3" />
            <span className="text-ink">{breadcrumb.label}</span>
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}
