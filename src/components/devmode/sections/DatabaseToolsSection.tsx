"use client";

import { useState } from "react";
import {
  Coins,
  Sparkles,
  Trophy,
  Zap,
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
import { DEFAULT_ECONOMY, DEFAULT_PROFILE, type MarkStatus, type Unlocks, type ProgressSeen } from "@/lib/types";
import { makeComprehensiveSeedData } from "@/lib/devSeed";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { SHOP_ITEMS } from "@/lib/economy";
import { useAuth } from "@/hooks/useAuth";
import { fullResync, refreshStatsSnapshot } from "@/lib/supabase/sync";
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
      `growly_backup_${dateKey(today)}.json`,
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
      `growly_marks_${dateKey(today)}.csv`,
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
    const err = importRawData(draft);
    setError(err);
    if (!err) {
      setDraft(null);
    }
  }

  function wipe(label: string, patch: Partial<typeof data>) {
    if (
      !window.confirm(
        `Clear ${label}? This rewrites stored data and cannot be undone.`,
      )
    )
      return;
    mutateData((prev) => ({ ...prev, ...patch }), false);
    // The pushMutation (triggered by _onMutation inside mutateData) handles
    // syncing to Supabase asynchronously. Wipe actions are destructive but
    // already persisted to localStorage — the async push will survive even
    // if the user navigates away.
  }

  // Seeder: Max Gold — grants 99,999 bonus coins. Repeated clicks stack.
  function addGold() {
    const added = 99999;
    toast.success(`Added ${added.toLocaleString()} bonus coins!`);
    mutateData(
      (prev) => ({
        ...prev,
        economy: {
          ...prev.economy,
          bonusCoins: (prev.economy.bonusCoins ?? 0) + added,
        },
      }),
      false,
    );
  }



  // Seeder: Reset Progress (marks only)
  function resetProgress() {
    if (
      !window.confirm(
        "Reset all marks/progress? This clears all completion data but keeps habits.",
      )
    )
      return;
    mutateData(
      (prev) => ({
        ...prev,
        marks: {},
        unlocks: {},
        economy: DEFAULT_ECONOMY,
      }),
      false,
    );
  }

  // Seeder: Reset Habits
  function resetHabits() {
    if (
      !window.confirm(
        "Delete ALL habits? This also removes all associated marks.",
      )
    )
      return;
    mutateData((prev) => ({ ...prev, habits: [], marks: {} }), false);
  }

  // Seeder: Unlock All Achievements — force every achievement into the unlock
  // map (seen:true so it doesn't flood the celebration queue on next login).
  function unlockAllAchievements() {
    const now = new Date().toISOString();
    mutateData(
      (prev) => {
        const unlocks = { ...prev.unlocks };
        for (const a of ACHIEVEMENTS) {
          unlocks[a.id] = { at: unlocks[a.id]?.at ?? now, seen: true };
        }
        return { ...prev, unlocks };
      },
      false,
    );
  }

  // Seeder: Lock All Achievements
  function lockAllAchievements() {
    if (
      !window.confirm(
        "Lock all achievements? This will clear all unlock records.",
      )
    )
      return;
    mutateData((prev) => ({ ...prev, unlocks: {} }), false);
  }

  // Seeder: Complete All Habits (today)
  function completeAllHabits() {
    const todayKey = dateKey(today);
    mutateData(
      (prev) => {
        const day = { ...(prev.marks[todayKey] ?? {}) };
        for (const h of prev.habits) {
          if (!h.archived) day[h.id] = "done" as MarkStatus;
        }
        return { ...prev, marks: { ...prev.marks, [todayKey]: day } };
      },
      false,
    );
  }

  // Seeder: Mark 50 Days as Done — fills the next 50 not-yet-complete past days
  // for all active habits. Each press fills 50 fresh days, so repeated clicks
  // stack more completions and thus more XP.
  function mark50DaysDone() {
    const activeHabits = data.habits.filter((h) => !h.archived);
    if (activeHabits.length === 0) {
      toast.error("Create at least one active habit first.");
      return;
    }
    mutateData((prev) => {
      const active = prev.habits.filter((h) => !h.archived);
      if (active.length === 0) return prev;
      const newMarks = { ...prev.marks };
      let filled = 0;
      let offset = 1;
      while (filled < 50 && offset < 3650) {
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
    }, false);
    const xpGained = activeHabits.length * 50 * 10; // 50 days × habits × 10 XP
    toast.success(`Marked 50 days as done (~${xpGained.toLocaleString()} XP, ${activeHabits.length} habits)!`);
  }

  // Seeder: Unmark 50 Days as Done — deletes the last 50 days of marks.
  function unmark50DaysDone() {
    if (!window.confirm("Clear the last 50 days of marks? This removes XP and cannot be undone."))
      return;
    mutateData(
      (prev) => {
        const newMarks = { ...prev.marks };
        let removed = 0;
        for (let i = 0; i < 50; i++) {
          const key = dateKey(addDays(today, -(i + 1)));
          if (newMarks[key]) {
            delete newMarks[key];
            removed++;
          }
        }
        return { ...prev, marks: newMarks };
      },
      false,
    );
    toast.success(`Cleared marks for the last 50 days.`);
  }

  function maxLevel() {
    if (
      !window.confirm(
        "Fill 10 years of completion data and unlock all achievements to maximize " +
        "your level? (This will NOT affect coins or shop items.)",
      )
    )
      return;
    const now = new Date().toISOString();
    const today = new Date();
    mutateData((prev) => {
      const active = prev.habits.filter((h) => !h.archived);
      const habitIds = active.map((h) => h.id);

      // ── 1. Fill marks: 3650 days (~10 years) of completions for all habits ──
      const newMarks = { ...prev.marks };
      if (habitIds.length > 0) {
        for (let i = 1; i <= 3650; i++) {
          const key = dateKey(addDays(today, -i));
          const day: Record<string, MarkStatus> = {};
          for (const id of habitIds) {
            day[id] = "done";
          }
          newMarks[key] = day;
        }
      }

      // ── 2. Unlock all achievements (they contribute XP via RARITY_XP) ──
      const unlocks: Unlocks = { ...prev.unlocks };
      for (const a of ACHIEVEMENTS) {
        unlocks[a.id] = { at: unlocks[a.id]?.at ?? now, seen: true };
      }

      // ── 3. Mark level as seen so celebrations don't re-fire ──
      const progressSeen: ProgressSeen = {
        ...prev.progressSeen,
        level: 99,
      };

      return {
        ...prev,
        marks: newMarks,
        unlocks,
        progressSeen,
      };
    }, false);
    const habitsCount = data.habits.filter((h) => !h.archived).length;
    toast.success(`Max level achieved! (${habitsCount} habits × 3650 days of completions)`);
  }

  function maxEverything() {
    if (
      !window.confirm(
        "This will fill 10 years of completion data, " +
        "unlock all achievements, buy all shop items, give max coins, and set your " +
        "progress markers to maximum. Continue?",
      )
    )
      return;
    const now = new Date().toISOString();
    const today = new Date();
    mutateData((prev) => {
      const active = prev.habits.filter((h) => !h.archived);
      const habitIds = active.map((h) => h.id);

      // ── 1. Fill marks: 3650 days (~10 years) of completions for all habits ──
      const newMarks = { ...prev.marks };
      if (habitIds.length > 0) {
        for (let i = 1; i <= 3650; i++) {
          const key = dateKey(addDays(today, -i));
          const day: Record<string, MarkStatus> = {};
          for (const id of habitIds) {
            day[id] = "done";
          }
          newMarks[key] = day;
        }
      }

      // ── 2. Unlock all achievements (seen=true so no celebration flood) ──
      const unlocks: Unlocks = { ...prev.unlocks };
      for (const a of ACHIEVEMENTS) {
        unlocks[a.id] = { at: unlocks[a.id]?.at ?? now, seen: true };
      }

      // ── 3. Own all shop items, equip the best per slot ──
      const allItemIds = SHOP_ITEMS.map((i) => i.id);
      const owned = [...new Set([...prev.economy.owned, ...allItemIds])];
      const equipped = {
        ...prev.economy.equipped,
        flame: "flame-rainbow",
        confetti: "confetti-gold",
        accent: "accent-ocean",
      };

      // ── 4. Give max coins ──
      const bonusCoins = (prev.economy.bonusCoins ?? 0) + 99999;

      // ── 5. Set progressSeen to maximum so celebrations never re-fire ──
      const progressSeen: ProgressSeen = {
        seeded: true,
        level: 99,
        title: "Legendary Achiever",
        shop: allItemIds,
        streaks: Object.fromEntries(habitIds.map((id) => [id, 365])),
        tierUnlocks: ["common", "rare", "epic", "legendary"],
      };

      return {
        ...prev,
        marks: newMarks,
        unlocks,
        economy: {
          ...prev.economy,
          owned,
          equipped,
          bonusCoins,
        },
        progressSeen,
      };
    }, false);
  }

  return (
    <>
      <DevGroup title="🔥 Max Everything">
        <DevRow
          label="Max Level"
          hint="Fill 10 years of completion data and unlock all achievements to reach max level. Does NOT affect coins or shop."
          query={query}
          terms="max level xp experience maxlevel"
        >
          <DevButton tone="accent" onClick={maxLevel}>
            <Sparkles className="size-3.5" /> Max Level
          </DevButton>
        </DevRow>
        <DevRow
          label="Max Everything"
          hint="Fill 10 years of completions, unlock all achievements, buy all shop items, max coins, set progress markers to max. Persists locally + syncs to Supabase."
          query={query}
          terms="max maxout full complete all achievements shop coins level progress maxlevel maximum everything"
        >
          <DevButton tone="accent" onClick={maxEverything}>
            <Zap className="size-3.5" /> Max Everything
          </DevButton>
        </DevRow>
      </DevGroup>

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
          label="Max Gold (99,999)"
          hint="Add 99,999 bonus coins for testing."
          query={query}
          terms="coins money"
        >
          <DevButton tone="accent" onClick={addGold}>
            <Coins className="size-3.5" /> Add
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

      <DevGroup title="XP & Marks">
        <DevRow
          label="Mark 50 Days as Done"
          hint="Fill 50 past days with completions to gain XP. Repeated clicks stack."
          query={query}
          terms="experience level up mark done"
        >
          <DevButton tone="accent" onClick={mark50DaysDone}>
            <Sparkles className="size-3.5" /> Mark 50
          </DevButton>
        </DevRow>
        <DevRow
          label="Unmark 50 Days as Done"
          hint="Clear the last 50 days of marks to remove the corresponding XP."
          query={query}
          terms="experience level down remove clear"
        >
          <DevButton tone="danger" onClick={unmark50DaysDone}>
            <Trash2 className="size-3.5" /> Unmark 50
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
          label="Recalculate Stats"
          hint="Force a recalculation of your public stats snapshot from current marks. Fixes stale Level 11 / Focus Seeker data from the old corruption bug."
          query={query}
          terms="recalculate recompute stats snapshot refresh user_stats_snapshots level xp achievements"
        >
          <DevButton
            tone="accent"
            onClick={async () => {
              if (!user) { toast.error("Must be logged in."); return; }
              setSeeding(true);
              try {
                await refreshStatsSnapshot(user.id);
                toast.success("Stats recalculated from your current data!");
              } catch (e) { toast.error(`Failed: ${e}`); }
              finally { setSeeding(false); }
            }}
            disabled={seeding || !user}
          >
            <Zap className="size-3.5" /> {seeding ? "..." : "Recalculate"}
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
