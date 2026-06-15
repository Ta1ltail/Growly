"use client";

// Profile — who you are at a glance: lifetime summary stats and quick links
// into the app's sections. Appearance/data tools now live in Settings.

import { useMemo } from "react";
import Link from "next/link";
import {
  Flame,
  CircleCheckBig,
  ListChecks,
  Target,
  LayoutTemplate,
  NotebookPen,
  Settings2,
  ChevronRight,
  Activity,
  UserRound,
} from "lucide-react";
import { useAppData } from "@/lib/store";
import { habitStreaks, consistencyScore } from "@/lib/stats";
import { useToday } from "@/hooks/useToday";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";

export default function ProfilePage() {
  const data = useAppData();
  const today = useToday();
  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);

  const totalMarks = useMemo(
    () => Object.values(data.marks).reduce((s, day) => s + Object.keys(day).length, 0),
    [data.marks],
  );
  const bestStreak = useMemo(() => {
    let best = 0;
    for (const h of data.habits) best = Math.max(best, habitStreaks(h, data.marks, today).best);
    return best;
  }, [data.habits, data.marks, today]);
  const consistency = useMemo(() => consistencyScore(active, data.marks, today, 30), [active, data.marks, today]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile" subtitle="Your tracking at a glance" />

      {/* Identity */}
      <Card className="mb-6 flex items-center gap-4 p-5">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg ring-accent-soft">
          <UserRound className="size-7" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Justin</h2>
          <p className="text-sm text-muted">{active.length} active habits · {data.goals.length} goals</p>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 stagger-children sm:grid-cols-4">
        <StatCard icon={ListChecks} value={active.length} label="Habits" accent />
        <StatCard icon={CircleCheckBig} value={totalMarks} label="Total marks" />
        <StatCard icon={Flame} value={bestStreak} label="Best streak" />
        <StatCard icon={Activity} value={`${consistency}%`} label="30-day consistency" />
      </div>

      {/* Sections */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Jump to</h2>
        <Card className="divide-y divide-line overflow-hidden">
          <LinkRow href="/goals" icon={Target} label="Goals" trailing={`${data.goals.length}`} />
          <LinkRow href="/templates" icon={LayoutTemplate} label="Templates" />
          <LinkRow href="/notes" icon={NotebookPen} label="Notes" trailing={`${data.notes.length}`} />
          <LinkRow href="/settings" icon={Settings2} label="Settings" />
        </Card>
      </section>

      <p className="mt-8 text-center font-mono text-[10px] text-faint">
        project_101 · v0.3 · data stored locally on this device
      </p>
    </div>
  );
}

function LinkRow({
  href,
  icon: Icon,
  label,
  trailing,
}: {
  href: string;
  icon: typeof Target;
  label: string;
  trailing?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-surface2/50">
      <Icon className="size-[18px] text-muted" />
      <span className="flex-1">{label}</span>
      {trailing && <span className="font-mono text-xs text-muted">{trailing}</span>}
      <ChevronRight className="size-4 text-faint" />
    </Link>
  );
}
