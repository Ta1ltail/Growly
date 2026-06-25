"use client";

// Today — daily overview with a clean two-panel layout on desktop:
//   ┌─────────────────────────────────────────────────────┐
//   │  Hero (compact, fixed at top)                       │
//   ├───────────────────────────┬─────────────────────────┤
//   │  Habits (scrollable)      │  Dailys (scrollable)    │
//   │  - Upcoming               │  - Daily Quest          │
//   │  - Filter tabs            │  - Daily Spin           │
//   │  - Habits list            │  - Daily Note           │
//   └───────────────────────────┴─────────────────────────┘
// Page doesn't scroll — each panel scrolls independently.
// On mobile: single-column natural flow.

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Flame,
  NotebookPen,
  ListChecks,
  Clock,
  Sparkles,
  Coins,
  RotateCcw,
  Snowflake,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { StreakFlame } from "@/components/habits/StreakFlame";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { CATEGORIES, CATEGORY_COLORS, type Category } from "@/lib/categories";
import type { Habit } from "@/lib/types";
import { dateKey } from "@/lib/storage";
import { addHabit, cycleMark, setDailyNote, useAppData } from "@/lib/store";
import { makeHabit } from "@/lib/habits";
import { habitStreaks, isScheduled } from "@/lib/stats";
import { frozenSet } from "@/lib/economy";
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
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CheckInPopup } from "@/components/today/CheckInPopup";
import { DailyQuestCard } from "@/components/today/DailyQuestCard";
import { DailySpinModal } from "@/components/today/DailySpinModal";

export default function TodayPage() {
  const data = useAppData();
  const today = useToday();
  const router = useRouter();
  const todayKey = dateKey(today);
  const hydrated = useHydrated();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const handler = () => setShowAdd((prev) => !prev);
    window.addEventListener("kb:add-habit", handler);
    return () => window.removeEventListener("kb:add-habit", handler);
  }, []);

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
    return CATEGORIES.map((c) => ({
      category: c,
      habits: map.get(c) ?? [],
    })).filter((g) => g.habits.length > 0);
  }, [todaysHabits]);

  const doneCount = todaysHabits.filter(
    (h) => data.marks[todayKey]?.[h.id] === "done",
  ).length;
  const progress =
    todaysHabits.length === 0
      ? 0
      : Math.round((doneCount / todaysHabits.length) * 100);

  const upcoming = useMemo(
    () =>
      todaysHabits
        .filter((h) => h.timeOfDay && data.marks[todayKey]?.[h.id] !== "done")
        .sort((a, b) => (a.timeOfDay! < b.timeOfDay! ? -1 : 1))
        .slice(0, 4),
    [todaysHabits, data.marks, todayKey],
  );

  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const bestStreakToday = useMemo(() => {
    let best = 0;
    for (const h of todaysHabits)
      best = Math.max(best, habitStreaks(h, data.marks, today, frozen).current);
    return best;
  }, [todaysHabits, data.marks, today, frozen]);

  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoriesWithHabits = useMemo(
    () => [...new Set(todaysHabits.map((h) => h.category))],
    [todaysHabits],
  );
  const activeCategory =
    selectedCategory &&
    categoriesWithHabits.includes(selectedCategory as Category)
      ? selectedCategory
      : null;

  const filteredGroups = useMemo(() => {
    if (!activeCategory) return grouped;
    return grouped.filter((g) => g.category === activeCategory);
  }, [grouped, activeCategory]);

  const [showSpin, setShowSpin] = useState(false);

  const dailyNote =
    data.notes.find(
      (n) => n.links.date === todayKey && !n.links.habitId && !n.links.goalId,
    )?.body ?? "";

  function handleAdd(value: Parameters<typeof makeHabit>[0]) {
    addHabit(makeHabit(value));
    setShowAdd(false);
  }

  const mark = (habitId: string, category: Category) =>
    cycleMark(todayKey, habitId, category);

  const alreadySpun = data.economy.lastSpinDate === todayKey;
  const spinResult = data.economy.lastSpinResult;

  if (!hydrated) return <PageSkeleton />;

  return (
    <div className="animate-fade-in lg:flex lg:flex-col lg:h-[calc(100dvh-5rem)]">
      <CheckInPopup />

      {/* ── Hero — compact, fixed at top ── */}
      <Card className="mb-4 shrink-0 overflow-hidden">
        <div className="relative p-4 sm:p-5">
          <div
            className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full opacity-15 blur-3xl"
            style={{ background: "var(--c-accent)" }}
          />
          <div className="relative flex items-start gap-4">
            <ProgressRing value={progress} size={64} stroke={6}>
              <span className="font-mono text-sm font-bold">{progress}%</span>
            </ProgressRing>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <CalendarDays className="size-3.5 shrink-0" />
                <span className="font-medium">
                  {today.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">
                {greeting}, {data.profile.displayName.split(" ")[0]}
              </h1>
              <p className="text-sm text-muted">
                {todayHeadline(doneCount, todaysHabits.length)}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-accent" />
                <span>
                  <AnimatedCounter value={doneCount} />/{todaysHabits.length}{" "}
                  habits
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {bestStreakToday > 0 ? (
                  <StreakFlame
                    streak={bestStreakToday}
                    size={14}
                    showCount={false}
                  />
                ) : (
                  <Flame className="size-3.5 text-faint" />
                )}
                <span>{bestStreakToday} day streak</span>
              </span>
            </div>
            <ProgressBar value={progress} className="h-1.5" />
          </div>
        </div>
      </Card>

      {/* ── Two-panel layout (desktop) / single column (mobile) ── */}
      <div className="lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:overflow-hidden space-y-5 lg:space-y-0">
        {/* ═══ LEFT PANEL: Habits ═══ */}
        <div className="lg:overflow-y-auto lg:pr-1 space-y-4 pb-6 lg:pb-2">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Clock className="size-3.5" /> Up next
              </h2>
              <Card className="divide-y divide-line overflow-hidden">
                {upcoming.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <MarkButton
                      status={data.marks[todayKey]?.[h.id]}
                      onClick={() => mark(h.id, h.category)}
                      size={22}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {h.name}
                    </span>
                    <span className="font-mono text-[11px] text-accent">
                      {formatTime(h.timeOfDay!)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Habits header with inline category dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted shrink-0">
                Today&apos;s habits
              </h2>
              {todaysHabits.length > 0 && categoriesWithHabits.length > 1 && (
                <div className="relative flex items-center gap-1.5">
                  {activeCategory && (
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[activeCategory as Category],
                      }}
                    />
                  )}
                  <select
                    value={activeCategory ?? ""}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value || null)
                    }
                    className="appearance-none rounded-lg border border-line bg-surface2 px-2.5 py-1 pr-6 text-[11px] font-medium text-ink outline-none transition-colors focus:border-accent cursor-pointer"
                    aria-label="Filter by category"
                  >
                    <option value="">All</option>
                    {categoriesWithHabits.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted" />
                </div>
              )}
            </div>
            {todaysHabits.length > 0 && (
              <Button variant="soft" size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="size-3.5" strokeWidth={2.5} /> Add
              </Button>
            )}
          </div>

          {/* Habits list */}
          {todaysHabits.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No habits for today"
              hint="Add your first habit, or grab a ready-made routine from Templates."
              illustration="today"
              action={
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="size-4" strokeWidth={2.5} /> Add habit
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[group.category],
                      }}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.category}
                    </h3>
                    <span className="font-mono text-[10px] text-faint">
                      {group.habits.filter(
                        (h) => data.marks[todayKey]?.[h.id] === "done",
                      ).length}
                      /{group.habits.length}
                    </span>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">
                    {group.habits.map((habit) => {
                      const status = data.marks[todayKey]?.[habit.id];
                      return (
                        <div
                          key={habit.id}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface2/50"
                        >
                          <MarkButton
                            status={status}
                            onClick={() => mark(habit.id, habit.category)}
                            size={24}
                          />
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
                            <span className="font-mono text-[11px] text-faint">
                              {formatTime(habit.timeOfDay)}
                            </span>
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

        {/* ═══ RIGHT PANEL: Dailys (quest, spin, note) ═══ */}
        <div className="lg:overflow-y-auto lg:pr-1 space-y-5 pb-6 lg:pb-2">
          {/* Daily Quest */}
          <DailyQuestCard />

          {/* Daily Spin */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400/20 to-rose-400/20 text-2xl">
                {alreadySpun && spinResult?.isFreeze ? (
                  "❄️"
                ) : alreadySpun ? (
                  <Coins className="size-6 text-amber-500" aria-hidden />
                ) : (
                  "🎰"
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Daily Spin</p>
                <p className="text-xs text-muted">
                  {alreadySpun
                    ? "Come back tomorrow for your next spin!"
                    : "Spin the wheel for a chance to earn coins!"}
                </p>
                {alreadySpun && spinResult && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      {spinResult.isFreeze ? (
                        <Snowflake className="size-3 text-sky-400" />
                      ) : (
                        <Coins className="size-3 text-amber-500" />
                      )}
                      {spinResult.label}
                    </span>
                    <span className="text-[10px] text-muted">
                      <RotateCcw className="size-3 inline mr-0.5" /> Resets at
                      midnight
                    </span>
                  </div>
                )}
                {alreadySpun && !spinResult && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      <Coins className="size-3" /> Claimed
                    </span>
                    <span className="text-[10px] text-muted">
                      <RotateCcw className="size-3 inline mr-0.5" /> Resets at
                      midnight
                    </span>
                  </div>
                )}
              </div>
              <Button onClick={() => setShowSpin(true)} size="sm">
                <Sparkles className="size-3.5" aria-hidden />
                {alreadySpun ? "View" : "Spin"}
              </Button>
            </div>
          </Card>

          {/* Daily note */}
          <div>
            <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <NotebookPen className="size-3.5" /> Today&apos;s note
            </h2>
            <Card className="p-0.5">
              <textarea
                value={dailyNote}
                onChange={(e) => setDailyNote(todayKey, e.target.value)}
                placeholder="How did today go? What got in the way?"
                className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-faint min-h-[120px]"
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DailySpinModal open={showSpin} onClose={() => setShowSpin(false)} />
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
