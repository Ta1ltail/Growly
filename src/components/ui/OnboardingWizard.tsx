"use client";

// Onboarding wizard — guides first-time users through setting up their profile
// and creating their first habit. Shows when the user has no habits and hasn't
// completed onboarding yet.
//
// Steps:
//   1. Welcome — greet the user, explain the app
//   2. Profile — set display name and optional motto
//   3. First habit — create the very first habit
//   4. Tour — quick overview of key pages
//   5. Done — ready to go!

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Coins,
  Flame,
  LayoutGrid,
  Sparkles,
  Target,
} from "lucide-react";
import {
  useAppData,
  updateProfile,
  addHabit,
  completeOnboarding,
} from "@/lib/store";
import { makeHabit } from "@/lib/habits";
import { CATEGORIES, type Category } from "@/lib/categories";
import { Button } from "./Button";
import { Card } from "./Card";
import { ProgressBar } from "./ProgressBar";

const STEPS = ["Welcome", "Profile", "First Habit", "Tour", "Ready"];

const TOUR_ITEMS = [
  {
    icon: Flame,
    label: "Today",
    desc: "Mark habits done each day with one tap. Track your daily progress.",
  },
  {
    icon: LayoutGrid,
    label: "Tracker",
    desc: "See all your habits in a spreadsheet-style grid. Spot patterns at a glance.",
  },
  {
    icon: Target,
    label: "Goals & Stats",
    desc: "Set bigger targets and watch your consistency grow with detailed charts.",
  },
  {
    icon: Coins,
    label: "Rewards",
    desc: "Earn XP, coins, and achievements. Unlock cosmetics in the shop.",
  },
];

export function OnboardingWizard() {
  const data = useAppData();
  const hydrated = useHydrated();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [habitName, setHabitName] = useState("");
  const [habitCategory, setHabitCategory] = useState<Category>("Personal");
  const [habitRecurrence, setHabitRecurrence] = useState<"daily" | "weekly">(
    "daily",
  );
  const [habitWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [completing, setCompleting] = useState(false);

  // All hooks must come BEFORE any early return to keep hook count consistent
  // across SSR (emptyData → no habits → renders fully) and client hydration
  // (localStorage data → habits exist → returns null).
  const handleNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleFinish = useCallback(() => {
    if (completing) return;
    setCompleting(true);

    // Save profile name
    if (displayName.trim()) {
      updateProfile({ displayName: displayName.trim() });
    }

    // Create first habit
    if (habitName.trim()) {
      const habit = {
        name: habitName.trim(),
        category: habitCategory,
        recurrence:
          habitRecurrence === "daily"
            ? ({ kind: "daily" } as const)
            : ({ kind: "weekly", weekdays: habitWeekdays } as const),
        repeatDays: habitWeekdays,
        priority: "med" as const,
      };
      addHabit(makeHabit(habit));
    }

    // Mark onboarding as complete
    completeOnboarding();
    router.push("/today");
  }, [
    completing,
    displayName,
    habitName,
    habitCategory,
    habitRecurrence,
    habitWeekdays,
    router,
  ]);

  // Don't render at all until hydration completes — prevents SSR flash where
  // emptyData makes it look like onboarding hasn't run yet.
  if (!hydrated) return null;

  // Check if onboarding should show — AFTER all hooks so hook count never
  // changes between SSR and client renders.
  const activeHabits = data.habits.filter((h) => !h.archived);
  const onboardingComplete = data.settings.onboardingComplete;
  if (onboardingComplete || activeHabits.length > 0) return null;

  const totalSteps = STEPS.length;
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="mx-4 w-full max-w-lg animate-rise">
        {/* Progress bar */}
        <div className="mb-4">
          <ProgressBar value={progress} />
          <div className="mt-1 flex justify-between px-1 text-[10px] text-faint">
            <span>Start</span>
            <span>
              Step {step + 1} of {totalSteps}
            </span>
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          {/* Step indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-accent"
                    : i < step
                      ? "w-2 bg-done"
                      : "w-2 bg-line"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent/15">
                <Sparkles className="size-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold">Welcome to project_101</h2>
              <p className="mt-2 text-sm text-muted">
                A simple, honest habit tracker. Mark habits done each day, build
                streaks, earn rewards, and watch your progress grow. No ads, no
                gimmicks — just you and your habits.
              </p>
              <p className="mt-4 text-xs text-faint">
                Let&apos;s get you set up in just a few steps.
              </p>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold">What should we call you?</h2>
              <p className="mt-1 text-sm text-muted">
                Pick a display name for your profile.
              </p>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={data.profile.displayName || "Your name"}
                  maxLength={30}
                  className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent"
                  autoFocus
                />
              </div>
              <div className="mt-3 rounded-lg bg-accent/5 p-3 text-xs text-muted">
                You can always change this later in Settings.
              </div>
            </div>
          )}

          {/* Step 3: First Habit */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold">Create your first habit</h2>
              <p className="mt-1 text-sm text-muted">
                Start simple. You can always add more later.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Habit name
                  </label>
                  <input
                    type="text"
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    placeholder="e.g. Morning walk, Read 10 pages, Meditate"
                    maxLength={50}
                    className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Category
                  </label>
                  <select
                    value={habitCategory}
                    onChange={(e) =>
                      setHabitCategory(e.target.value as Category)
                    }
                    className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    How often?
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHabitRecurrence("daily")}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        habitRecurrence === "daily"
                          ? "bg-accent text-white"
                          : "bg-surface2 text-muted hover:bg-surface2/80"
                      }`}
                    >
                      Every day
                    </button>
                    <button
                      onClick={() => setHabitRecurrence("weekly")}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        habitRecurrence === "weekly"
                          ? "bg-accent text-white"
                          : "bg-surface2 text-muted hover:bg-surface2/80"
                      }`}
                    >
                      Weekdays
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Tour */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold">Quick tour</h2>
              <p className="mt-1 text-sm text-muted">
                Here&apos;s what you can do:
              </p>
              <div className="mt-4 grid gap-3">
                {TOUR_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl bg-surface2/50 p-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <item.icon className="size-4.5 text-accent" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Ready */}
          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-done/15">
                <Check className="size-8 text-done" />
              </div>
              <h2 className="text-xl font-bold">You&apos;re all set!</h2>
              <p className="mt-2 text-sm text-muted">
                {habitName.trim()
                  ? `"${habitName.trim()}" is ready to go. Start your journey today!`
                  : "Your profile is ready. Start adding habits whenever you'd like."}
              </p>
              <p className="mt-1 text-xs text-faint">
                Remember: small improvements every day lead to remarkable
                results.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" onClick={handleBack}>
                <ChevronLeft className="size-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={step === 1 && !displayName.trim()}
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={completing}>
                {completing ? "Setting up..." : "Start tracking!"}
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
