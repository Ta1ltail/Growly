"use client";

// Today — daily overview: progress, streaks, upcoming-by-time, one-tap
// completion, motivational insight, and a quick daily note. Editing/deleting
// habits lives in Manage Habits (Honest Tracking: keep Today about doing).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Flame, NotebookPen, ListChecks, Clock } from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Habit } from "@/lib/types";
import { dateKey } from "@/lib/storage";
import { addHabit, cycleMark, setDailyNote, useAppData } from "@/lib/store";
import { makeHabit } from "@/lib/habits";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { todayHeadline } from "@/lib/insights";
import { formatTime } from "@/lib/format";
import { useToday } from "@/hooks/useToday";
import { useHydrated } from "@/hooks/useHydrated";
import { MarkButton } from "@/components/habits/MarkButton";
import { HabitForm } from "@/components/habits/HabitForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function TodayPage() {
  const data = useAppData();
  const today = useToday();
  const router = useRouter();
  const todayKey = dateKey(today);
  const hydrated = useHydrated();
  const [showAdd, setShowAdd] = useState(false);

  const todaysHabits = useMemo(
    () => data.habits.filter((h) => !h.archived && isScheduled(h, today)),
    [data.habits, today],
  );

  const grouped = useMemo(() => {
    const map = new Map<Category, Habit[]>();
    for (const h of todaysHabits) {
      const list = map.get(h.category) ?? [];
      list.push(h);
      map.set(h.category, list);
    }
    return CATEGORIES.map((c) => ({ category: c, habits: map.get(c) ?? [] })).filter(
      (g) => g.habits.length > 0,
    );
  }, [todaysHabits]);

  const doneCount = todaysHabits.filter((h) => data.marks[todayKey]?.[h.id] === "done").length;
  const progress = todaysHabits.length === 0 ? 0 : Math.round((doneCount / todaysHabits.length) * 100);

  const upcoming = useMemo(
    () =>
      todaysHabits
        .filter((h) => h.timeOfDay && data.marks[todayKey]?.[h.id] !== "done")
        .sort((a, b) => (a.timeOfDay! < b.timeOfDay! ? -1 : 1))
        .slice(0, 4),
    [todaysHabits, data.marks, todayKey],
  );

  const bestStreakToday = useMemo(() => {
    let best = 0;
    for (const h of todaysHabits) best = Math.max(best, habitStreaks(h, data.marks, today).current);
    return best;
  }, [todaysHabits, data.marks, today]);

  const greeting =
    today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";

  const dailyNote =
    data.notes.find((n) => n.links.date === todayKey && !n.links.habitId && !n.links.goalId)?.body ?? "";

  function handleAdd(value: Parameters<typeof makeHabit>[0]) {
    addHabit(makeHabit(value));
    setShowAdd(false);
  }

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative flex items-center gap-5 p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--c-accent)" }}
          />
          <ProgressRing value={progress} size={104}>
            <span className="font-mono text-2xl font-bold">{progress}%</span>
            <span className="text-[10px] text-muted">done</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{greeting}, Justin</h1>
            <p className="mt-1 text-sm text-muted">{todayHeadline(doneCount, todaysHabits.length)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-4 text-accent" />
                {doneCount}/{todaysHabits.length} habits
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="size-4 text-amber-500" />
                {bestStreakToday} day streak
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {/* Up next */}
          {upcoming.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                <Clock className="size-4" /> Up next
              </h2>
              <Card className="divide-y divide-line overflow-hidden">
                {upcoming.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                    <MarkButton
                      status={data.marks[todayKey]?.[h.id]}
                      onClick={() => cycleMark(todayKey, h.id)}
                      size={24}
                    />
                    <span className="flex-1 text-sm">{h.name}</span>
                    <span className="font-mono text-xs text-accent">{formatTime(h.timeOfDay!)}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Today&apos;s habits</h2>
            {todaysHabits.length > 0 && (
              <Button variant="soft" size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="size-3.5" strokeWidth={2.5} /> Add
              </Button>
            )}
          </div>

          {todaysHabits.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No habits for today"
              hint="Add your first habit, or grab a ready-made routine from Templates."
              action={
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="size-4" strokeWidth={2.5} /> Add habit
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[group.category] }} />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{group.category}</h3>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">
                    {group.habits.map((habit) => {
                      const status = data.marks[todayKey]?.[habit.id];
                      return (
                        <div key={habit.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2/50">
                          <MarkButton status={status} onClick={() => cycleMark(todayKey, habit.id)} size={26} />
                          <span
                            className={`flex-1 text-sm transition-colors ${
                              status === "done"
                                ? "text-muted line-through"
                                : status === "missed"
                                  ? "text-missed"
                                  : "text-ink"
                            }`}
                          >
                            {habit.name}
                          </span>
                          {habit.timeOfDay && (
                            <span className="font-mono text-[11px] text-faint">{formatTime(habit.timeOfDay)}</span>
                          )}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
            <NotebookPen className="size-4" /> Today&apos;s note
          </h2>
          <Card className="p-1">
            <textarea
              value={dailyNote}
              onChange={(e) => setDailyNote(todayKey, e.target.value)}
              placeholder="How did today go? What got in the way?"
              rows={6}
              className="w-full resize-none rounded-xl bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-faint"
            />
          </Card>
        </div>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add habit"
        subtitle="Set a schedule and it appears here automatically."
        size="lg"
      >
        <HabitForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          onViewTemplates={() => router.push("/templates")}
        />
      </Modal>
    </div>
  );
}
