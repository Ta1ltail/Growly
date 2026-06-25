"use client";

// Today — daily overview: progress, streaks, upcoming-by-time, one-tap
// completion, motivational insight, and a quick daily note. Editing/deleting
// habits lives in Manage Habits (Honest Tracking: keep Today about doing).
//
// Layout: fixed hero at top, scrollable habits + engagement below.
// Desktop: 2-column (habits | engagement). Mobile: single column stacking.

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
  ChevronRight,
  CalendarDays,
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
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { CheckInPopup } from "@/components/today/CheckInPopup";
import { DailyQuestCard } from "@/components/today/DailyQuestCard";
import { DailySpinModal } from "@/components/today/DailySpinModal";
import Link from "next/link";

export default function TodayPage() {
  const data = useAppData();
  const today = useToday();
  const router = useRouter();
  const todayKey = dateKey(today);
  const hydrated = useHydrated();
  const [showAdd, setShowAdd] = useState(false);

  // Listen for keyboard shortcut to add habit
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
    <div className="animate-fade-in flex flex-col min-h-0 h-[calc(100dvh-8rem)] md:h-[calc(100dvh-5rem)]">
      <CheckInPopup />

      {/* ── Hero card ── */}
      <Card className="mb-4 shrink-0 overflow-hidden">
        <div className="relative flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--c-accent)" }}
          />
          <ProgressRing value={progress} size={80}>
            <span className="font-mono text-lg font-bold">{progress}%</span>
            <span className="text-[9px] text-muted">done</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>
                {today.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">
              {greeting}, {data.profile.displayName}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {todayHeadline(doneCount, todaysHabits.length)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-accent" />
                <AnimatedCounter value={doneCount} />/{todaysHabits.length}{" "}
                habits
              </span>
              <span className="flex items-center gap-1.5">
                {bestStreakToday > 0 ? (
                  <StreakFlame
                    streak={bestStreakToday}
                    size={16}
                    showCount={false}
                  />
                ) : (
                  <Flame className="size-3.5 text-faint" />
                )}
                {bestStreakToday} day streak
              </span>
            </div>
          </div>
          {/* Quick link to Dashboard */}
          <Link
            href="/"
            className="hidden shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink sm:flex"
          >
            Dashboard <ChevronRight className="size-3" />
          </Link>
        </div>
      </Card>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid gap-4 lg:grid-cols-5">
          {/* ── LEFT COLUMN: Habits ── */}
          <div className="lg:col-span-3 space-y-3 pb-4">
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
                      <span className="flex-1 text-sm">{h.name}</span>
                      <span className="font-mono text-[11px] text-accent">
                        {formatTime(h.timeOfDay!)}
                      </span>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Category filter — horizontal scroll on mobile */}
            {todaysHabits.length > 0 && categoriesWithHabits.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setSelectedCategory(null)}
                  aria-pressed={!activeCategory}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                    !activeCategory
                      ? "bg-accent text-white shadow-sm"
                      : "bg-surface2/60 text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  All
                </button>
                {categoriesWithHabits.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setSelectedCategory(
                        activeCategory === cat ? null : cat,
                      )
                    }
                    aria-pressed={activeCategory === cat}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? "bg-accent text-white shadow-sm"
                        : "bg-surface2/60 text-muted hover:bg-surface2 hover:text-ink"
                    }`}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[cat],
                      }}
                    />
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Habits header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {activeCategory ? activeCategory : "Today's habits"}
              </h2>
              {todaysHabits.length > 0 && (
                <Button variant="soft" size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="size-3.5" strokeWidth={2.5} /> Add
                </Button>
              )}
            </div>

            {/* Habits list or empty state */}
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
                    <div className="mb-2 flex items-center gap-2 px-1">
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

          {/* ── RIGHT COLUMN: Engagement (desktop: sidebar, mobile: below habits) ── */}
          <div className="lg:col-span-2 space-y-4 pb-4">
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
                        <RotateCcw className="size-3 inline mr-0.5" />
                        Resets at midnight
                      </span>
                    </div>
                  )}
                  {alreadySpun && !spinResult && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        <Coins className="size-3" /> Claimed
                      </span>
                      <span className="text-[10px] text-muted">
                        <RotateCcw className="size-3 inline mr-0.5" />
                        Resets at midnight
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
            <div className="flex flex-col">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <NotebookPen className="size-3.5" /> Today&apos;s note
              </h2>
              <Card className="p-1">
                <textarea
                  value={dailyNote}
                  onChange={(e) => setDailyNote(todayKey, e.target.value)}
                  placeholder="How did today go? What got in the way?"
                  className="h-full min-h-[100px] w-full resize-none rounded-xl bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-faint"
                />
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Spin Modal */}
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
