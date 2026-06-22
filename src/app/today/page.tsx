"use client";

// Today — daily overview: progress, streaks, upcoming-by-time, one-tap
// completion, motivational insight, and a quick daily note. Editing/deleting
// habits lives in Manage Habits (Honest Tracking: keep Today about doing).

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
  // Derive the effective filter during render: if the selected category no
  // longer has habits (deleted/archived), it falls back to null automatically
  // instead of resetting state in an effect.
  const activeCategory =
    selectedCategory &&
    categoriesWithHabits.includes(selectedCategory as Category)
      ? selectedCategory
      : null;
  const setActiveCategory = setSelectedCategory;

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
    <div className="animate-fade-in flex flex-col min-h-0 h-[calc(100dvh-168px)] md:h-[calc(100dvh-72px)]">
      <CheckInPopup />

      {/* Hero */}
      <Card className="mb-4 shrink-0 overflow-hidden">
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
              {today.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
              {greeting}, {data.profile.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {todayHeadline(doneCount, todaysHabits.length)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-4 text-accent" />
                <AnimatedCounter value={doneCount} />/{todaysHabits.length}{" "}
                habits
              </span>
              <span className="flex items-center gap-1.5">
                {bestStreakToday > 0 ? (
                  <StreakFlame
                    streak={bestStreakToday}
                    size={18}
                    showCount={false}
                  />
                ) : (
                  <Flame className="size-4 text-faint" />
                )}
                {bestStreakToday} day streak
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main content — fills remaining vertical space */}
      <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-5">
        {/* Left column — habits, fills all available space */}
        <div className="lg:col-span-3 flex flex-col min-h-0 gap-3">
          {/* Up next */}
          {upcoming.length > 0 && (
            <div className="shrink-0">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                <Clock className="size-4" /> Up next
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
                      size={24}
                    />
                    <span className="flex-1 text-sm">{h.name}</span>
                    <span className="font-mono text-xs text-accent">
                      {formatTime(h.timeOfDay!)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Category tabs — wrap so nothing gets clipped on the right edge */}
          {todaysHabits.length > 0 && categoriesWithHabits.length > 1 && (
            <div className="shrink-0 flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory(null)}
                aria-pressed={!activeCategory}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all ${
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
                    setActiveCategory(activeCategory === cat ? null : cat)
                  }
                  aria-pressed={activeCategory === cat}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-accent text-white shadow-sm"
                      : "bg-surface2/60 text-muted hover:bg-surface2 hover:text-ink"
                  }`}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Habits header */}
          <div className="shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {activeCategory ? activeCategory : "Today's habits"}
            </h2>
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
              illustration="today"
              action={
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="size-4" strokeWidth={2.5} /> Add habit
                </Button>
              }
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: CATEGORY_COLORS[group.category],
                      }}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {group.category}
                    </h3>
                  </div>
                  <Card className="divide-y divide-line overflow-hidden">
                    {group.habits.map((habit) => {
                      const status = data.marks[todayKey]?.[habit.id];
                      return (
                        <div
                          key={habit.id}
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface2/50"
                        >
                          <MarkButton
                            status={status}
                            onClick={() => mark(habit.id, habit.category)}
                            size={26}
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

        {/* Engagement sidebar — quest, spin, note */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* Daily Quest */}
          <DailyQuestCard />

          {/* Daily Spin — always visible, shows claimed state after use */}
          <Card className="p-4 shrink-0">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400/20 to-rose-400/20 text-2xl">
                {alreadySpun && spinResult?.isFreeze
                  ? "❄️"
                  : alreadySpun
                    ? "🪙"
                    : "🎰"}
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

          {/* Note — expands to fill remaining space */}
          <div className="flex-1 min-h-0 flex flex-col">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted shrink-0">
              <NotebookPen className="size-4" /> Today&apos;s note
            </h2>
            <Card className="flex-1 min-h-0 p-1">
              <textarea
                value={dailyNote}
                onChange={(e) => setDailyNote(todayKey, e.target.value)}
                placeholder="How did today go? What got in the way?"
                className="h-full min-h-[80px] w-full resize-none rounded-xl bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-faint"
              />
            </Card>
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
