"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Warm, characterful SVG illustrations for empty states.
// Each illustration uses the app's accent color and feels hand-drawn.

type IllustrationVariant =
  | "habits"
  | "goals"
  | "notes"
  | "achievements"
  | "shop"
  | "stats"
  | "templates"
  | "dashboard"
  | "tracker"
  | "calendar"
  | "today"
  | "none";

function HabitsIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="15" y="10" width="90" height="70" rx="10" className="stroke-accent/30" strokeWidth="1.5" fill="var(--c-surface2)" />
      <rect x="25" y="22" width="25" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="25" y="34" width="40" height="3" rx="1.5" className="fill-line" />
      <rect x="25" y="46" width="35" height="3" rx="1.5" className="fill-line" />
      <rect x="25" y="58" width="20" height="3" rx="1.5" className="fill-line" />
      <circle cx="72" cy="23" r="10" className="stroke-accent" strokeWidth="1.5" />
      <path d="M68.5 23l2.5 2.5 4-4" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="88" cy="60" r="12" className="fill-accent/10 stroke-accent" strokeWidth="1.5" />
      <path d="M84 60l3 2.5 5-5" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoalsIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <circle cx="60" cy="45" r="35" className="stroke-accent/20" strokeWidth="1" />
      <circle cx="60" cy="45" r="25" className="stroke-accent/30" strokeWidth="1.5" />
      <circle cx="60" cy="45" r="15" className="stroke-accent" strokeWidth="2" />
      <circle cx="60" cy="45" r="5" className="fill-accent" />
      <line x1="60" y1="10" x2="60" y2="20" className="stroke-line" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="60" y1="70" x2="60" y2="80" className="stroke-line" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="25" y1="45" x2="35" y2="45" className="stroke-line" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="85" y1="45" x2="95" y2="45" className="stroke-line" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M90 15l-8 8" className="stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M95 10l-3 3" className="stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NotesIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="22" y="10" width="76" height="70" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <line x1="22" y1="28" x2="98" y2="28" className="stroke-line" strokeWidth="1" />
      <line x1="38" y1="18" x2="38" y2="78" className="stroke-line" strokeWidth="1" strokeDasharray="2 4" />
      <rect x="32" y="36" width="50" height="4" rx="2" className="fill-accent/60" />
      <rect x="32" y="46" width="40" height="3" rx="1.5" className="fill-line" />
      <rect x="32" y="55" width="45" height="3" rx="1.5" className="fill-line" />
      <rect x="32" y="64" width="30" height="3" rx="1.5" className="fill-line" />
      <circle cx="42" cy="18" r="3" className="fill-accent" opacity="0.4" />
    </svg>
  );
}

function AchievementsIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <path d="M60 5l8 25h26l-20 15 8 25-22-16-22 16 8-25L26 30h26L60 5z" className="fill-accent/10 stroke-amber-400" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="60" cy="32" r="10" className="fill-amber-400/20 stroke-amber-400" strokeWidth="1.5" />
      <text x="60" y="35" textAnchor="middle" className="fill-amber-400 text-[11px] font-bold" fontSize="11" fontWeight="bold">★</text>
      <rect x="40" y="62" width="40" height="16" rx="4" className="stroke-accent/30 fill-surface2" strokeWidth="1" />
      <rect x="46" y="66" width="28" height="4" rx="2" className="fill-accent/50" />
      <rect x="48" y="73" width="14" height="3" rx="1.5" className="fill-line" />
    </svg>
  );
}

function ShopIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="25" y="30" width="70" height="50" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <path d="M25 40h70" className="stroke-line" strokeWidth="1" />
      <circle cx="45" cy="58" r="10" className="fill-accent/10 stroke-accent" strokeWidth="1.5" />
      <circle cx="75" cy="58" r="10" className="fill-accent/10 stroke-accent" strokeWidth="1.5" />
      <text x="45" y="62" textAnchor="middle" className="fill-accent text-[11px] font-bold" fontSize="11">✦</text>
      <text x="75" y="62" textAnchor="middle" className="fill-accent text-[11px] font-bold" fontSize="11">✦</text>
      <rect x="55" y="63" width="10" height="10" rx="2" className="fill-accent/30" />
      <path d="M35 30V22a5 5 0 015-5h40a5 5 0 015 5v8" className="stroke-line" strokeWidth="1.5" />
      <circle cx="35" cy="18" r="2" className="fill-amber-400" />
      <circle cx="85" cy="18" r="2" className="fill-amber-400" />
    </svg>
  );
}

function StatsIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="15" y="60" width="90" height="20" rx="4" className="fill-surface2 stroke-line" strokeWidth="1" />
      <rect x="25" y="30" width="12" height="30" rx="3" className="fill-accent/60" />
      <rect x="43" y="14" width="12" height="46" rx="3" className="fill-accent/80" />
      <rect x="61" y="22" width="12" height="38" rx="3" className="fill-accent" />
      <rect x="79" y="8" width="12" height="52" rx="3" className="fill-accent/90" />
      <line x1="22" y1="68" x2="98" y2="68" className="stroke-line" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="85" cy="8" r="2.5" className="fill-accent" />
      <path d="M100 5l-3 3" className="stroke-done" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TemplatesIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="10" y="10" width="45" height="30" rx="6" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="18" y="20" width="20" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="18" y="28" width="28" height="2" rx="1" className="fill-line" />
      <rect x="65" y="10" width="45" height="30" rx="6" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="73" y="20" width="28" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="73" y="28" width="22" height="2" rx="1" className="fill-line" />
      <rect x="10" y="50" width="45" height="30" rx="6" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="18" y="60" width="28" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="18" y="68" width="18" height="2" rx="1" className="fill-line" />
      <rect x="65" y="50" width="45" height="30" rx="6" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="73" y="60" width="24" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="73" y="68" width="16" height="2" rx="1" className="fill-line" />
    </svg>
  );
}

function DashboardIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="10" y="10" width="45" height="30" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <circle cx="32" cy="25" r="8" className="fill-accent/10 stroke-accent" strokeWidth="1.5" />
      <path d="M28 25l3 2.5 5-5" className="stroke-accent" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="65" y="10" width="45" height="30" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="75" y="20" width="25" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="75" y="28" width="15" height="2" rx="1" className="fill-line" />
      <rect x="10" y="50" width="100" height="30" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="22" y="60" width="12" height="10" rx="2" className="fill-accent/60" />
      <rect x="40" y="55" width="12" height="15" rx="2" className="fill-accent/80" />
      <rect x="58" y="62" width="12" height="8" rx="2" className="fill-accent" />
      <rect x="76" y="56" width="12" height="14" rx="2" className="fill-accent/90" />
    </svg>
  );
}

function TodayIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <circle cx="60" cy="35" r="25" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <path d="M60 10l8 16 18-4-12 14 5 18-19-8-19 8 5-18L34 22l18 4L60 10z" className="fill-accent/10 stroke-amber-400" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="30" y="55" width="60" height="20" rx="6" className="fill-surface2 stroke-line" strokeWidth="1" />
      <rect x="38" y="62" width="12" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="56" y="62" width="24" height="3" rx="1.5" className="fill-line" />
      <circle cx="88" cy="65" r="4" className="fill-done/30 stroke-done" strokeWidth="1" />
    </svg>
  );
}

function CalendarIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="15" y="12" width="90" height="66" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="15" y="12" width="90" height="18" rx="8" className="fill-accent/10" />
      <text x="60" y="25" textAnchor="middle" className="fill-accent text-[10px] font-semibold">MARCH</text>
      <rect x="22" y="36" width="10" height="10" rx="2" className="fill-done/30 stroke-done" strokeWidth="1" />
      <rect x="35" y="36" width="10" height="10" rx="2" className="fill-done/30 stroke-done" strokeWidth="1" />
      <rect x="48" y="36" width="10" height="10" rx="2" className="fill-accent/30 stroke-accent" strokeWidth="1" />
      <rect x="61" y="36" width="10" height="10" rx="2" className="fill-line/30 stroke-line" strokeWidth="1" />
      <rect x="74" y="36" width="10" height="10" rx="2" className="fill-line/30 stroke-line" strokeWidth="1" />
      <rect x="87" y="36" width="10" height="10" rx="2" className="fill-line/30 stroke-line" strokeWidth="1" />
      <rect x="22" y="50" width="10" height="10" rx="2" className="fill-missed/30 stroke-missed" strokeWidth="1" />
      <rect x="35" y="50" width="10" height="10" rx="2" className="fill-accent/60 stroke-accent" strokeWidth="1" />
      <rect x="48" y="50" width="10" height="10" rx="2" className="fill-done/60 stroke-done" strokeWidth="1" />
      <rect x="61" y="50" width="10" height="10" rx="2" className="fill-accent/90 stroke-accent" strokeWidth="1" />
      <rect x="74" y="50" width="10" height="10" rx="2" className="fill-done stroke-done" strokeWidth="1.5" />
      <rect x="87" y="50" width="10" height="10" rx="2" className="fill-line/30 stroke-line" strokeWidth="1" />
      <path d="M100 8l-3 3" className="stroke-done" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrackerIllo() {
  return (
    <svg viewBox="0 0 120 90" className="size-28" fill="none">
      <rect x="10" y="10" width="100" height="70" rx="8" className="fill-surface2 stroke-accent/30" strokeWidth="1.5" />
      <rect x="18" y="18" width="55" height="14" rx="3" className="fill-accent/10" />
      <rect x="22" y="22" width="20" height="3" rx="1.5" className="fill-accent/70" />
      <rect x="78" y="20" width="10" height="10" rx="2" className="fill-done/30 stroke-done" strokeWidth="1" />
      <rect x="92" y="20" width="10" height="10" rx="2" className="fill-missed/30 stroke-missed" strokeWidth="1" />
      <rect x="18" y="36" width="55" height="14" rx="3" className="fill-surface2" />
      <rect x="22" y="40" width="18" height="3" rx="1.5" className="fill-line" />
      <rect x="78" y="38" width="10" height="10" rx="2" className="fill-done/30 stroke-done" strokeWidth="1" />
      <rect x="92" y="38" width="10" height="10" rx="2" className="fill-accent/30 stroke-accent" strokeWidth="1" />
      <rect x="18" y="54" width="55" height="14" rx="3" className="fill-surface2" />
      <rect x="22" y="58" width="25" height="3" rx="1.5" className="fill-line" />
      <rect x="78" y="56" width="10" height="10" rx="2" className="fill-missed/30 stroke-missed" strokeWidth="1" />
      <rect x="92" y="56" width="10" height="10" rx="2" className="fill-line/30 stroke-line" strokeWidth="1" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<string, React.FC> = {
  habits: HabitsIllo,
  goals: GoalsIllo,
  notes: NotesIllo,
  achievements: AchievementsIllo,
  shop: ShopIllo,
  stats: StatsIllo,
  templates: TemplatesIllo,
  dashboard: DashboardIllo,
  today: TodayIllo,
  calendar: CalendarIllo,
  tracker: TrackerIllo,
};

// Friendly empty state: themed SVG illustration, message, optional action.

export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  illustration,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  illustration?: IllustrationVariant;
}) {
  const IlloComponent = illustration && illustration !== "none" ? ILLUSTRATIONS[illustration] : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center animate-fade-in">
      {IlloComponent ? (
        <div className="mb-4"><IlloComponent /></div>
      ) : (
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface2 text-muted">
          <Icon className="size-6" />
        </span>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
});
