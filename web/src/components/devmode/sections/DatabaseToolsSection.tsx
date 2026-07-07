"use client";

import { useState, useCallback } from "react";
import {
  Coins,
  Sparkles,
  Flame,
  Trophy,
  Zap,
  RefreshCw,
  Dices,
  Database,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAppData,
  replaceData,
  mutateData,
  importRawData as storeImportRawData,
  reloadCache,
} from "@/lib/store";
import { useToday } from "@/hooks/useToday";
import { dateKey, addDays, clearLocalAppData } from "@/lib/storage";
import { DEFAULT_ECONOMY, DEFAULT_PROFILE, type MarkStatus } from "@/lib/types";
import { makeDemoData, makeStressData, makeComprehensiveSeedData } from "@/lib/devSeed";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { useAuth } from "@/hooks/useAuth";
import { fullResync } from "@/lib/supabase/sync";
import { createClient } from "@/lib/supabase/client";
import { DevGroup, DevRow, DevStack, DevButton, DEV_INPUT } from "../ui";

export const DB_TERMS =
  "database tools raw json edit export csv import backup seed demo wipe clear marks notes goals economy unlocks reset gold xp streak achievements habits progress simulate random stress fresh";

export function DatabaseToolsSection({ query }: { query: string }) {
  const data = useAppData();
  const today = useToday();
  const { user } = useAuth();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

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
    mutateData((prev) => ({ ...prev, ...patch }));
    toast.success(`${label} cleared`);
  }

  // Seeder: Add Gold — additive, reads the LIVE balance so repeated clicks stack.
  function addGold() {
    mutateData((prev) => ({
      ...prev,
      economy: {
        ...prev.economy,
        bonusCoins: (prev.economy.bonusCoins ?? 0) + 500,
      },
    }));
  }

  // Seeder: Remove Gold
  function removeGold() {
    mutateData((prev) => ({
      ...prev,
      economy: {
        ...prev.economy,
        bonusCoins: Math.max(0, (prev.economy.bonusCoins ?? 0) - 500),
      },
    }));
  }

  // Seeder: Reset Progress (marks only)
  function resetProgress() {
    if (
      !window.confirm(
        "Reset all marks/progress? This clears all completion data but keeps habits.",
      )
    )
      return;
    mutateData((prev) => ({
      ...prev,
      marks: {},
      unlocks: {},
      economy: DEFAULT_ECONOMY,
    }));
  }

  // Seeder: Reset Habits
  function resetHabits() {
    if (
      !window.confirm(
        "Delete ALL habits? This also removes all associated marks.",
      )
    )
      return;
    mutateData((prev) => ({ ...prev, habits: [], marks: {} }));
  }

  // Seeder: Unlock All Achievements — force every achievement into the unlock
  // map (seen:true so it doesn't flood the celebration queue on next login).
  function unlockAllAchievements() {
    const now = new Date().toISOString();
    mutateData((prev) => {
      const unlocks = { ...prev.unlocks };
      for (const a of ACHIEVEMENTS) {
        unlocks[a.id] = { at: unlocks[a.id]?.at ?? now, seen: true };
      }
      return { ...prev, unlocks };
    });
  }

  // Seeder: Lock All Achievements
  function lockAllAchievements() {
    if (
      !window.confirm(
        "Lock all achievements? This will clear all unlock records.",
      )
    )
      return;
    mutateData((prev) => ({ ...prev, unlocks: {} }));
  }

  // Seeder: Complete All Habits (today)
  function completeAllHabits() {
    const todayKey = dateKey(today);
    mutateData((prev) => {
      const day = { ...(prev.marks[todayKey] ?? {}) };
      for (const h of prev.habits) {
        if (!h.archived) day[h.id] = "done" as MarkStatus;
      }
      return { ...prev, marks: { ...prev.marks, [todayKey]: day } };
    });
  }

  // Seeder: Add XP — XP is derived from completion history, so we grant it by
  // completing habits. Each press fills the next 10 not-yet-complete past days
  // (reading live state), so repeated presses genuinely stack more XP.
  function addXp() {
    mutateData((prev) => {
      const active = prev.habits.filter((h) => !h.archived);
      if (active.length === 0) return prev;
      const newMarks = { ...prev.marks };
      let filled = 0;
      let offset = 1;
      while (filled < 10 && offset < 400) {
        const key = dateKey(addDays(today, -offset));
        const day = { ...(newMarks[key] ?? {}) };
        let changedDay = false;
        for (const h of active) {
          if (day[h.id] !== "done") {
            day[h.id] = "done" as MarkStatus;
            changedDay = true;
          }
        }
        if (changedDay) {
          newMarks[key] = day;
          filled++;
        }
        offset++;
      }
      return { ...prev, marks: newMarks };
    });
  }

  // Seeder: Remove XP
  function removeXp() {
    if (!window.confirm("Clear the last 10 days of marks? This reduces XP."))
      return;
    mutateData((prev) => {
      const newMarks = { ...prev.marks };
      for (let i = 0; i < 10; i++) {
        delete newMarks[dateKey(addDays(today, -(i + 1)))];
      }
      return { ...prev, marks: newMarks };
    });
  }

  // Seeder: Set Streak
  function setStreak() {
    const targetStreak = 7;
    mutateData((prev) => {
      const firstHabit = prev.habits.find((h) => !h.archived);
      if (!firstHabit) {
        toast.error("Create at least one habit first.");
        return prev;
      }
      const newMarks = { ...prev.marks };
      for (let i = 0; i < targetStreak; i++) {
        const key = dateKey(addDays(today, -(targetStreak - 1 - i)));
        newMarks[key] = {
          ...(newMarks[key] ?? {}),
          [firstHabit.id]: "done" as MarkStatus,
        };
      }
      return { ...prev, marks: newMarks };
    });
  }

  // Seeder: Reset Streak
  function resetStreak() {
    mutateData((prev) => {
      const firstHabit = prev.habits.find((h) => !h.archived);
      if (!firstHabit) {
        toast.error("Create at least one habit first.");
        return prev;
      }
      const yesterday = dateKey(addDays(today, -1));
      return {
        ...prev,
        marks: {
          ...prev.marks,
          [yesterday]: {
            ...(prev.marks[yesterday] ?? {}),
            [firstHabit.id]: "missed" as MarkStatus,
          },
        },
      };
    });
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

      <DevGroup title="Sync & Fresh Start">
        <DevRow
          label="Push to Supabase"
          hint="Sync current local data to Supabase."
          query={query}
          terms="upload sync"
        >
          <DevButton
            tone="accent"
            onClick={async () => {
              if (!user) {
                toast.error("You must be logged in to push to Supabase.");
                return;
              }
              setSeeding(true);
              try {
                await fullResync(user.id);
                reloadCache();
                toast.success("Data pushed to Supabase successfully!");
              } catch (e) {
                toast.error(`Failed to push: ${e}`);
              } finally {
                setSeeding(false);
              }
            }}
            disabled={seeding || !user}
          >
            <Upload className="size-3.5" /> {seeding ? "Pushing..." : "Push"}
          </DevButton>
        </DevRow>
        <DevRow
          label="Seed Demo (6 habits)"
          hint="Quick demo with 6 habits and 45 days of history."
          query={query}
          terms="seed demo quick"
        >
          <DevButton
            tone="accent"
            onClick={async () => {
              if (!user) { toast.error("Must be logged in."); return; }
              if (!window.confirm("Generate demo data and push?")) return;
              setSeeding(true);
              try {
                const seeded = makeDemoData(data, today);
                replaceData(seeded);
                await fullResync(user.id);
                reloadCache();
                toast.success("Demo data pushed to Supabase!");
              } catch (e) { toast.error(`Failed: ${e}`); }
              finally { setSeeding(false); }
            }}
            disabled={seeding || !user}
          >
            <RefreshCw className="size-3.5" /> {seeding ? "..." : "Seed (6)"}
          </DevButton>
        </DevRow>
        <DevRow
          label="Seed Comprehensive (55+ records/table)"
          hint="Generate 55 habits, 50 notes, 30 goals, spend ledger, achievements — push to Supabase."
          query={query}
          terms="seed full comprehensive populate all tables"
        >
          <DevButton
            tone="accent"
            onClick={async () => {
              if (!user) { toast.error("Must be logged in."); return; }
              if (!window.confirm("Generate 55+ habits, 50 notes, 30 goals with 60 days of history and push to Supabase?")) return;
              setSeeding(true);
              try {
                const seeded = makeComprehensiveSeedData(data, today);
                replaceData(seeded);
                await fullResync(user.id);
                reloadCache();
                toast.success("Comprehensive seed data pushed to Supabase!");
              } catch (e) { toast.error(`Failed: ${e}`); }
              finally { setSeeding(false); }
            }}
            disabled={seeding || !user}
          >
            <Database className="size-3.5" /> {seeding ? "..." : "Seed (55+)"}
          </DevButton>
        </DevRow>
        <DevRow
          label="Seed Suggestions (55) & Notifications (50)"
          hint="Directly inserts seed data into suggestions and notifications tables via Supabase."
          query={query}
          terms="seed suggestions notifications feedback"
        >
          <DevButton
            tone="accent"
            onClick={async () => {
              if (!user) { toast.error("Must be logged in."); return; }
              if (!window.confirm("Insert 55 suggestions and 50 notifications into Supabase?")) return;
              setSeeding(true);
              try {
                const supabase = createClient();
                const now = new Date().toISOString();
                // Suggestion seed data
                const suggestionData = [
                  { title: "Dark mode toggle", body: "Would love a dark mode option.", category: "feature" },
                  { title: "Export to CSV", body: "Please add an export feature.", category: "feature" },
                  { title: "Sync improvement", body: "Syncing should be more seamless.", category: "improvement" },
                  { title: "Mobile app", body: "Would love a mobile app version.", category: "feature" },
                  { title: "Habit templates", body: "Pre-built templates for common goals.", category: "feature" },
                  { title: "More achievement types", body: "More achievements for consistency streaks.", category: "feature" },
                  { title: "Calendar view", body: "A calendar heatmap would help.", category: "feature" },
                  { title: "Reminders", body: "Desktop notifications would be great.", category: "feature" },
                  { title: "Goal tracking", body: "Add milestone tracking within goals.", category: "feature" },
                  { title: "API access", body: "Would like an API to integrate.", category: "feature" },
                ];
                const suggestions = Array.from({ length: 55 }, (_, i) => ({
                  user_id: user.id,
                  title: suggestionData[i % suggestionData.length].title,
                  body: suggestionData[i % suggestionData.length].body,
                  category: suggestionData[i % suggestionData.length].category,
                  status: ["new", "read", "acknowledged", "completed", "declined"][i % 5],
                  created_at: new Date(Date.now() - i * 3600000 * 4).toISOString(),
                }));
                const { error: sugErr } = await supabase.from("suggestions").insert(suggestions);
                if (sugErr) throw sugErr;

                // Notification seed data
                const types = ["friend_request", "friend_accept", "achievement", "system"] as const;
                const notifications = Array.from({ length: 50 }, (_, i) => ({
                  user_id: user.id,
                  type: types[i % types.length],
                  title: ["New request", "Friend accepted", "Achievement!", "Welcome"][i % 4],
                  body: ["Someone wants to connect", "Friend request accepted", "You earned an achievement", "Welcome to the app!"][i % 4],
                  is_read: i % 3 !== 0,
                  created_at: new Date(Date.now() - i * 3600000 * 3).toISOString(),
                }));
                const { error: notErr } = await supabase.from("notifications").insert(notifications);
                if (notErr) throw notErr;

                toast.success("Seeded 55 suggestions and 50 notifications!");
              } catch (e) { toast.error(`Failed to seed: ${e}`); }
              finally { setSeeding(false); }
            }}
            disabled={seeding || !user}
          >
            <Database className="size-3.5" /> Seed extras
          </DevButton>
        </DevRow>
        <DevRow
          label="Clear All Local Data"
          hint="Wipe localStorage and start fresh. Your data on Supabase is preserved."
          query={query}
          terms="wipe reset fresh"
        >
          <DevButton
            tone="danger"
            onClick={() => {
              if (
                !window.confirm(
                  "Clear ALL local data? This cannot be undone. Your data on Supabase will be preserved and re-synced on next login.",
                )
              )
                return;
              clearLocalAppData();
              window.location.reload();
            }}
          >
            <Trash2 className="size-3.5" /> Clear All
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
