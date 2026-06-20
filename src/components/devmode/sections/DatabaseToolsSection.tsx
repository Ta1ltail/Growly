"use client";

import { useState } from "react";
import {
  Coins,
  Sparkles,
  Flame,
  Trophy,
  Zap,
  RefreshCw,
  Dices,
} from "lucide-react";
import {
  useAppData,
  replaceData,
  importRawData as storeImportRawData,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { dateKey, addDays } from "@/lib/storage";
import { DEFAULT_ECONOMY, DEFAULT_PROFILE, type MarkStatus } from "@/lib/types";
import { makeDemoData, makeStressData } from "@/lib/devSeed";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { DevGroup, DevRow, DevStack, DevButton, DEV_INPUT } from "../ui";

export const DB_TERMS =
  "database tools raw json edit export csv import backup seed demo wipe clear marks notes goals economy unlocks reset gold xp streak achievements habits progress simulate random stress";

export function DatabaseToolsSection({ query }: { query: string }) {
  const data = useAppData();
  const today = useToday();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    download(
      JSON.stringify(data, null, 2),
      `project_101_backup_${dateKey(today)}.json`,
      "application/json",
    );
  }

  function exportCsv() {
    const rows = ["date,habit,category,status"];
    const byId = new Map(data.habits.map((h) => [h.id, h]));
    for (const [date, day] of Object.entries(data.marks)) {
      for (const [habitId, status] of Object.entries(day)) {
        const habit = byId.get(habitId);
        if (!habit) continue;
        rows.push(
          `${date},"${habit.name.replace(/\"/g, '""')}",${habit.category},${status}`,
        );
      }
    }
    download(
      rows.join("\n"),
      `project_101_marks_${dateKey(today)}.csv`,
      "text/csv",
    );
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const msg = importRawData(String(reader.result));
      setError(msg);
      if (!msg) setDraft(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function applyDraft() {
    if (draft === null) return;
    setError(importRawData(draft));
  }

  function wipe(label: string, patch: Partial<typeof data>) {
    if (
      !window.confirm(
        `Clear ${label}? This rewrites stored data and cannot be undone.`,
      )
    )
      return;
    replaceData({ ...data, ...patch });
  }

  // Seeder: Add Gold
  function addGold() {
    replaceData({
      ...data,
      economy: {
        ...data.economy,
        bonusCoins: (data.economy.bonusCoins ?? 0) + 500,
      },
    });
  }

  // Seeder: Remove Gold
  function removeGold() {
    const currentBonus = data.economy.bonusCoins ?? 0;
    if (currentBonus <= 0) {
      wipe("economy bonus coins", {
        economy: { ...data.economy, bonusCoins: 0 },
      });
      return;
    }
    replaceData({
      ...data,
      economy: {
        ...data.economy,
        bonusCoins: Math.max(0, currentBonus - 500),
      },
    });
  }

  // Seeder: Reset Progress (marks only)
  function resetProgress() {
    if (
      !window.confirm(
        "Reset all marks/progress? This clears all completion data but keeps habits.",
      )
    )
      return;
    replaceData({ ...data, marks: {}, unlocks: {}, economy: DEFAULT_ECONOMY });
  }

  // Seeder: Reset Habits
  function resetHabits() {
    if (
      !window.confirm(
        "Delete ALL habits? This also removes all associated marks.",
      )
    )
      return;
    replaceData({ ...data, habits: [], marks: {} });
  }

  // Seeder: Unlock All Achievements
  function unlockAllAchievements() {
    const now = new Date().toISOString();
    const unlocks: Record<string, { at: string; seen: boolean }> = {
      ...data.unlocks,
    };
    for (const a of ACHIEVEMENTS) {
      if (!unlocks[a.id]) {
        unlocks[a.id] = { at: now, seen: false };
      }
    }
    replaceData({ ...data, unlocks });
  }

  // Seeder: Lock All Achievements
  function lockAllAchievements() {
    if (
      !window.confirm(
        "Lock all achievements? This will clear all unlock records.",
      )
    )
      return;
    replaceData({ ...data, unlocks: {} });
  }

  // Seeder: Complete All Habits (today)
  function completeAllHabits() {
    const todayKey = dateKey(today);
    const day = { ...(data.marks[todayKey] ?? {}) };
    for (const h of data.habits) {
      if (!h.archived) day[h.id] = "done" as MarkStatus;
    }
    replaceData({ ...data, marks: { ...data.marks, [todayKey]: day } });
  }

  // Seeder: Add XP
  function addXp() {
    // XP is derived from doneCount and other stats in history.
    // Since XP is derived, we simulate completions by adding done marks for 10 days
    const newMarks = { ...data.marks };
    for (let i = 0; i < 10; i++) {
      const d = addDays(today, -(i + 1));
      const key = dateKey(d);
      const day = { ...(newMarks[key] ?? {}) };
      for (const h of data.habits) {
        if (!h.archived && !day[h.id]) {
          day[h.id] = "done" as MarkStatus;
        }
      }
      newMarks[key] = day;
    }
    replaceData({ ...data, marks: newMarks });
  }

  // Seeder: Remove XP
  function removeXp() {
    if (!window.confirm("Clear the last 10 days of marks? This reduces XP."))
      return;
    const newMarks = { ...data.marks };
    for (let i = 0; i < 10; i++) {
      const d = addDays(today, -(i + 1));
      const key = dateKey(d);
      delete newMarks[key];
    }
    replaceData({ ...data, marks: newMarks });
  }

  // Seeder: Set Streak
  function setStreak() {
    // Create a streak by marking the last N days as done for the first habit
    const targetStreak = 7;
    const firstHabit = data.habits.find((h) => !h.archived);
    if (!firstHabit) {
      alert("Create at least one habit first.");
      return;
    }
    const newMarks = { ...data.marks };
    for (let i = 0; i < targetStreak; i++) {
      const d = addDays(today, -(targetStreak - 1 - i));
      const key = dateKey(d);
      const day = { ...(newMarks[key] ?? {}) };
      day[firstHabit.id] = "done" as MarkStatus;
      newMarks[key] = day;
    }
    replaceData({ ...data, marks: newMarks });
  }

  // Seeder: Reset Streak
  function resetStreak() {
    // Mark yesterday as missed for the first habit to break streaks
    const firstHabit = data.habits.find((h) => !h.archived);
    if (!firstHabit) {
      alert("Create at least one habit first.");
      return;
    }
    const yesterday = dateKey(addDays(today, -1));
    const day = { ...(data.marks[yesterday] ?? {}) };
    day[firstHabit.id] = "missed" as MarkStatus;
    replaceData({ ...data, marks: { ...data.marks, [yesterday]: day } });
  }

  // Seeder: Simulate Daily Progress
  function simulateDailyProgress() {
    replaceData(makeDemoData(data, today));
  }

  // Seeder: Generate Random Data (stress test)
  function generateRandomData() {
    const count = 20;
    if (
      !window.confirm(
        `Generate ${count} stress test habits with 30 days of history?`,
      )
    )
      return;
    replaceData(makeStressData(data, today, count, 30));
  }

  return (
    <>
      <DevGroup title="Raw store">
        <DevStack
          label="localStorage JSON"
          hint="Edit and apply — runs full validation on load."
          query={query}
          terms="edit json data"
        >
          <textarea
            value={draft ?? JSON.stringify(data, null, 2)}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            rows={8}
            className={`${DEV_INPUT} resize-y font-mono text-[11px] leading-snug`}
          />
          {error && <p className="mt-1 text-xs text-missed">{error}</p>}
          <div className="mt-2 flex gap-2">
            <DevButton
              tone="accent"
              onClick={applyDraft}
              disabled={draft === null}
            >
              Apply
            </DevButton>
            <DevButton
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              disabled={draft === null}
            >
              Discard
            </DevButton>
          </div>
        </DevStack>
      </DevGroup>

      <DevGroup title="Backup">
        <DevRow
          label="Export JSON"
          hint="Full data snapshot."
          query={query}
          terms="download backup"
        >
          <DevButton onClick={exportJson}>Export</DevButton>
        </DevRow>
        <DevRow
          label="Export marks (CSV)"
          query={query}
          terms="download spreadsheet"
        >
          <DevButton onClick={exportCsv}>Export</DevButton>
        </DevRow>
        <DevRow
          label="Import JSON"
          hint="Replace all data from a backup file."
          query={query}
          terms="upload restore"
        >
          <label className="cursor-pointer rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition-all hover:bg-surface2 hover:text-ink">
            Choose file
            <input
              type="file"
              accept="application/json"
              onChange={onImportFile}
              className="hidden"
            />
          </label>
        </DevRow>
      </DevGroup>

      {/* Enhanced Seeders */}
      <DevGroup title="Economy">
        <DevRow
          label="Add Gold (500)"
          hint="Add bonus coins for testing."
          query={query}
          terms="coins money"
        >
          <DevButton tone="accent" onClick={addGold}>
            <Coins className="size-3.5" /> Add
          </DevButton>
        </DevRow>
        <DevRow
          label="Remove Gold (500)"
          hint="Remove bonus coins."
          query={query}
          terms="coins money"
        >
          <DevButton tone="danger" onClick={removeGold}>
            <Coins className="size-3.5" /> Remove
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Progress">
        <DevRow
          label="Complete All Habits"
          hint="Mark all habits as done for today."
          query={query}
          terms="done today"
        >
          <DevButton tone="accent" onClick={completeAllHabits}>
            <Zap className="size-3.5" /> Complete
          </DevButton>
        </DevRow>
        <DevRow
          label="Simulate Daily Progress"
          hint="Generate 45 days of realistic history."
          query={query}
          terms="seed demo"
        >
          <DevButton tone="accent" onClick={simulateDailyProgress}>
            <RefreshCw className="size-3.5" /> Simulate
          </DevButton>
        </DevRow>
        <DevRow
          label="Generate Random Data"
          hint="Add 20 stress test habits with history."
          query={query}
          terms="stress test"
        >
          <DevButton onClick={generateRandomData}>
            <Dices className="size-3.5" /> Generate
          </DevButton>
        </DevRow>
        <DevRow
          label="Reset Progress"
          hint="Clear marks, unlocks, and economy."
          query={query}
          terms="clear wipe"
        >
          <DevButton tone="danger" onClick={resetProgress}>
            Reset
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="XP & Streaks">
        <DevRow
          label="Add XP"
          hint="Mark 10 days as done to gain XP."
          query={query}
          terms="experience level up"
        >
          <DevButton tone="accent" onClick={addXp}>
            <Sparkles className="size-3.5" /> Add
          </DevButton>
        </DevRow>
        <DevRow
          label="Remove XP"
          hint="Clear last 10 days of marks."
          query={query}
          terms="experience level down"
        >
          <DevButton tone="danger" onClick={removeXp}>
            <Sparkles className="size-3.5" /> Remove
          </DevButton>
        </DevRow>
        <DevRow
          label="Set Streak (7 days)"
          hint="Create a 7-day streak for the first habit."
          query={query}
          terms="flame chain"
        >
          <DevButton tone="accent" onClick={setStreak}>
            <Flame className="size-3.5" /> Set
          </DevButton>
        </DevRow>
        <DevRow
          label="Reset Streak"
          hint="Break current streak by marking yesterday as missed."
          query={query}
          terms="break chain"
        >
          <DevButton tone="danger" onClick={resetStreak}>
            <Flame className="size-3.5" /> Break
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Achievements">
        <DevRow
          label="Unlock All Achievements"
          hint="Force-unlock every achievement."
          query={query}
          terms="trophy badges"
        >
          <DevButton tone="accent" onClick={unlockAllAchievements}>
            <Trophy className="size-3.5" /> Unlock all
          </DevButton>
        </DevRow>
        <DevRow
          label="Lock All Achievements"
          hint="Re-lock every achievement."
          query={query}
          terms="clear badges reset"
        >
          <DevButton tone="danger" onClick={lockAllAchievements}>
            <Trophy className="size-3.5" /> Lock all
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Habits">
        <DevRow
          label="Reset Habits"
          hint="Delete ALL habits and marks."
          query={query}
          terms="remove delete"
        >
          <DevButton tone="danger" onClick={resetHabits}>
            Reset
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Wipe slices">
        <DevRow label="Clear marks" query={query} terms="delete history">
          <DevButton
            tone="danger"
            onClick={() => wipe("all marks", { marks: {} })}
          >
            Clear
          </DevButton>
        </DevRow>
        <DevRow label="Clear notes" query={query} terms="delete">
          <DevButton
            tone="danger"
            onClick={() => wipe("all notes", { notes: [] })}
          >
            Clear
          </DevButton>
        </DevRow>
        <DevRow label="Clear goals" query={query} terms="delete">
          <DevButton
            tone="danger"
            onClick={() => wipe("all goals", { goals: [] })}
          >
            Clear
          </DevButton>
        </DevRow>
        <DevRow
          label="Reset economy"
          hint="Spend ledger, owned, freezes."
          query={query}
          terms="coins shop delete"
        >
          <DevButton
            tone="danger"
            onClick={() =>
              wipe("the economy ledger", { economy: DEFAULT_ECONOMY })
            }
          >
            Reset
          </DevButton>
        </DevRow>
        <DevRow
          label="Clear unlocks"
          hint="Re-lock all achievements."
          query={query}
          terms="achievements delete"
        >
          <DevButton
            tone="danger"
            onClick={() => wipe("all achievement unlocks", { unlocks: {} })}
          >
            Clear
          </DevButton>
        </DevRow>
        <DevRow label="Reset profile" query={query} terms="identity delete">
          <DevButton
            tone="danger"
            onClick={() => wipe("the profile", { profile: DEFAULT_PROFILE })}
          >
            Reset
          </DevButton>
        </DevRow>
      </DevGroup>
    </>
  );
}

// Delegate import to the store's importRawData which handles validation + reload
function importRawData(text: string): string | null {
  return storeImportRawData(text);
}
