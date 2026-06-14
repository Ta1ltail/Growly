"use client";

// Profile / Settings — theme toggle, data export, reset, and links to
// the secondary sections (Goals, Templates).

import { useMemo } from "react";
import { dateKey } from "@/lib/storage";
import { clearAllData, setTheme, useAppData } from "@/lib/store";
import { habitStreaks } from "@/lib/stats";

export default function ProfilePage() {
  const data = useAppData();
  const today = useMemo(() => new Date(), []);

  const totalMarks = useMemo(
    () => Object.values(data.marks).reduce((sum, day) => sum + Object.keys(day).length, 0),
    [data.marks],
  );

  const bestStreak = useMemo(() => {
    let best = 0;
    for (const h of data.habits) best = Math.max(best, habitStreaks(h, data.marks, today).best);
    return best;
  }, [data.habits, data.marks, today]);

  function exportCsv() {
    const rows: string[] = ["date,habit,category,status"];
    const byId = new Map(data.habits.map((h) => [h.id, h]));
    for (const [date, day] of Object.entries(data.marks)) {
      for (const [habitId, status] of Object.entries(day)) {
        const habit = byId.get(habitId);
        if (!habit) continue;
        const name = habit.name.replace(/"/g, '""');
        rows.push(`${date},"${name}",${habit.category},${status}`);
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

  const isDark = data.settings.theme === "dark";

  return (
    <>
      <header className="flex items-center justify-between pt-6 pb-4">
        <h1 className="font-mono text-lg font-semibold tracking-tight">Profile</h1>
        <div className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
          J
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-line bg-surface p-3 text-center">
          <div className="font-mono text-xl font-semibold">{data.habits.length}</div>
          <div className="text-xs text-muted">habits</div>
        </div>
        <div className="rounded-md border border-line bg-surface p-3 text-center">
          <div className="font-mono text-xl font-semibold">{totalMarks}</div>
          <div className="text-xs text-muted">marks</div>
        </div>
        <div className="rounded-md border border-line bg-surface p-3 text-center">
          <div className="font-mono text-xl font-semibold">{bestStreak}</div>
          <div className="text-xs text-muted">best streak</div>
        </div>
      </div>

      {/* Links */}
      <nav className="mt-6 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface text-sm">
        <a href="/goals" className="flex items-center justify-between px-4 py-3 hover:bg-empty">
          <span>🎯 Goals</span>
          <span className="text-muted">{data.goals.length} ›</span>
        </a>
        <a href="/templates" className="flex items-center justify-between px-4 py-3 hover:bg-empty">
          <span>📋 Templates</span>
          <span className="text-muted">›</span>
        </a>
      </nav>

      {/* Settings */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Settings
        </h2>
        <div className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface text-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <span>Dark mode</span>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isDark ? "bg-accent" : "bg-line"
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
                  isDark ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <button
            onClick={exportCsv}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-empty"
          >
            <span>Export data (CSV)</span>
            <span className="text-muted">↓</span>
          </button>
          <button
            onClick={reset}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-missed hover:bg-empty"
          >
            <span>Reset all data</span>
            <span>⚠</span>
          </button>
        </div>
      </section>

      <p className="mt-6 text-center font-mono text-[10px] text-muted">
        project_101 · Phase 1 · data stored locally on this device
      </p>
    </>
  );
}
