"use client";

// Profile / Settings — theme customization (mode + accent), data tools, links.

import { useMemo } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Monitor,
  Target,
  LayoutTemplate,
  Download,
  Trash2,
  Flame,
  CircleCheckBig,
  ListChecks,
  Palette,
  ChevronRight,
  Check,
} from "lucide-react";
import { dateKey } from "@/lib/storage";
import { clearAllData, setTheme, useAppData } from "@/lib/store";
import { habitStreaks } from "@/lib/stats";
import { useToday } from "@/hooks/useToday";
import { ACCENTS, type ThemeMode } from "@/lib/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export default function ProfilePage() {
  const data = useAppData();
  const today = useToday();
  const { mode, accent } = data.settings.theme;

  const totalMarks = useMemo(
    () => Object.values(data.marks).reduce((s, day) => s + Object.keys(day).length, 0),
    [data.marks],
  );
  const bestStreak = useMemo(() => {
    let best = 0;
    for (const h of data.habits) best = Math.max(best, habitStreaks(h, data.marks, today).best);
    return best;
  }, [data.habits, data.marks, today]);

  function exportCsv() {
    const rows = ["date,habit,category,status"];
    const byId = new Map(data.habits.map((h) => [h.id, h]));
    for (const [date, day] of Object.entries(data.marks)) {
      for (const [habitId, status] of Object.entries(day)) {
        const habit = byId.get(habitId);
        if (!habit) continue;
        rows.push(`${date},"${habit.name.replace(/"/g, '""')}",${habit.category},${status}`);
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_101_export_${dateKey(today)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    if (window.confirm("Delete ALL habits, marks, notes, and goals? This cannot be undone.")) {
      clearAllData();
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Profile" subtitle="Your data & appearance" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ListChecks} value={data.habits.length} label="Habits" accent />
        <StatCard icon={CircleCheckBig} value={totalMarks} label="Marks" />
        <StatCard icon={Flame} value={bestStreak} label="Best streak" />
      </div>

      {/* Appearance */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
          <Palette className="size-4" /> Appearance
        </h2>
        <Card className="p-5">
          {/* Theme mode */}
          <p className="mb-2 text-xs font-medium text-muted">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ id, label, icon: Icon }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  onClick={() => setTheme({ mode: id })}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Accent color */}
          <p className="mb-2 mt-5 text-xs font-medium text-muted">Accent color</p>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => {
              const active = accent === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setTheme({ accent: a.id })}
                  aria-label={a.label}
                  className="flex size-10 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: a.color,
                    boxShadow: active ? `0 0 0 3px var(--c-surface), 0 0 0 5px ${a.color}` : undefined,
                  }}
                >
                  {active && <Check className="size-4 text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Sections */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Sections</h2>
        <Card className="divide-y divide-line overflow-hidden">
          <LinkRow href="/goals" icon={Target} label="Goals" trailing={`${data.goals.length}`} />
          <LinkRow href="/templates" icon={LayoutTemplate} label="Templates" />
        </Card>
      </section>

      {/* Data */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Data</h2>
        <Card className="divide-y divide-line overflow-hidden">
          <button
            onClick={exportCsv}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm transition-colors hover:bg-surface2/50"
          >
            <Download className="size-[18px] text-muted" />
            <span className="flex-1">Export data (CSV)</span>
          </button>
          <button
            onClick={reset}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm text-missed transition-colors hover:bg-missed/10"
          >
            <Trash2 className="size-[18px]" />
            <span className="flex-1">Reset all data</span>
          </button>
        </Card>
      </section>

      <p className="mt-8 text-center font-mono text-[10px] text-faint">
        project_101 · Phase 1-3 · data stored locally on this device
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
