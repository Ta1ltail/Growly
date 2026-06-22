"use client";

// Daily check-in popup — appears once per day when the user opens the app.
// Shows a streak counter and the reward earned. Can be dismissed immediately.

import { useEffect, useState } from "react";
import { Coins, Flame, X } from "lucide-react";
import { claimDailyCheckIn } from "@/lib/store";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

// Mood/energy tracking — simple 1-5 scale for daily reflection.
const MOOD_EMOJIS = ["😢", "😟", "😐", "🙂", "😄"];
const ENERGY_LABELS = ["Exhausted", "Low", "Okay", "Good", "Energetic"];

export function CheckInPopup() {
  const [result, setResult] = useState<{
    reward: number;
    streak: number;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { reward, streak } = claimDailyCheckIn();
      if (reward > 0) {
        setResult({ reward, streak });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Save mood/energy to daily note when both are set
  useEffect(() => {
    if (mood > 0 && energy > 0) {
      const todayKey = new Date().toISOString().split("T")[0]; // quick dateKey
      const note = window.localStorage.getItem(`mood:${todayKey}`);
      const entry = note ? JSON.parse(note) : {};
      entry.mood = mood;
      entry.energy = energy;
      window.localStorage.setItem(`mood:${todayKey}`, JSON.stringify(entry));
    }
  }, [mood, energy]);

  if (!result || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 w-full max-w-sm animate-pop rounded-2xl bg-gradient-to-br from-amber-500/20 via-surface to-orange-500/20 p-6 shadow-2xl ring-1 ring-amber-500/30">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted transition-colors hover:bg-surface2 hover:text-ink"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>

        <div className="mb-4 flex justify-center">
          <div className="relative">
            <Flame
              className="size-14"
              strokeWidth={0}
              fill={
                result.streak >= 7
                  ? "#f97316"
                  : result.streak >= 3
                    ? "#fb923c"
                    : "#fbbf24"
              }
            />
            {result.streak >= 7 && (
              <span
                className="absolute -right-1 -top-1 text-lg drop-shadow-lg"
                aria-hidden
              >
                🔥
              </span>
            )}
          </div>
        </div>

        <h2 className="text-center text-lg font-bold">Daily Check-in!</h2>
        <p className="mt-1 text-center text-sm text-muted">
          {result.streak === 1
            ? "Welcome back! First check-in of the day."
            : `${result.streak}-day check-in streak!`}
        </p>

        <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-amber-500/15 px-5 py-2.5">
          <Coins className="size-5 text-amber-500" aria-hidden />
          <span className="font-mono text-lg font-bold text-amber-500">
            +<AnimatedCounter value={result.reward} />
          </span>
          <span className="text-sm text-amber-400/80">coins</span>
        </div>

        {/* Mood & Energy tracking */}
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted mb-1.5">How are you feeling?</p>
            <div className="flex gap-2">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setMood(i + 1)}
                  aria-pressed={mood === i + 1}
                  className={`flex size-9 items-center justify-center rounded-xl text-lg transition-all ${
                    mood === i + 1
                      ? "bg-accent/20 ring-1 ring-accent scale-110"
                      : "bg-surface2/50 hover:bg-surface2 text-faint"
                  }`}
                  aria-label={`Mood ${i + 1}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted mb-1.5">Energy level</p>
            <div className="flex gap-1.5">
              {ENERGY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setEnergy(i + 1)}
                  aria-pressed={energy === i + 1}
                  className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-all ${
                    energy === i + 1
                      ? "bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/40"
                      : "bg-surface2/50 text-muted hover:bg-surface2"
                  }`}
                  aria-label={`Energy ${i + 1}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[11px] text-faint">
            <span>Streak</span>
            <span className="font-mono">{result.streak}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
              style={{ width: `${Math.min(100, (result.streak / 30) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-faint">
            <span>Day 1</span>
            <span>Day 30</span>
          </div>
        </div>

        <div className="mt-3 text-center text-[11px] text-faint">
          {result.streak < 4
            ? `Next check-in: 5 coins (${4 - result.streak} more days)`
            : result.streak < 9
              ? `Next check-in: 8 coins (${9 - result.streak} more days)`
              : result.streak < 20
                ? `Next check-in: 12 coins (${20 - result.streak} more days)`
                : result.streak < 29
                  ? `Next check-in: 18 coins (${29 - result.streak} more days)`
                  : "🔥 Max bonus tier reached!"}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="mx-auto mt-5 block rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-400 active:scale-95"
        >
          Let&apos;s go!
        </button>
      </div>
    </div>
  );
}
