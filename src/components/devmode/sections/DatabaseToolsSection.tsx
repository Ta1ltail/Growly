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
  Ban,
  Gauge,
  Target,
  ListChecks,
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
import { dateKey, addDays } from "@/lib/date";
import { clearLocalAppData } from "@/lib/storage";
import {
  DEFAULT_ECONOMY,
  DEFAULT_PROFILE,
  type MarkStatus,
  type Unlocks,
  type ProgressSeen,
} from "@/lib/types";
import { makeComprehensiveSeedData } from "@/lib/devSeed";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { SHOP_ITEMS } from "@/lib/economy";
import { xpToAdvance, totalXp } from "@/lib/xp";
import { buildGameStats, evaluateAchievements } from "@/lib/achievements";
import { frozenSet } from "@/lib/economy";
import { useAuth } from "@/hooks/useAuth";
import { fullResync } from "@/lib/supabase/sync";
import { DevGroup, DevRow, DevStack, DevButton, DEV_INPUT } from "../ui";

export const DB_TERMS =
  "database tools raw json edit export csv import backup seed demo wipe clear marks notes goals economy unlocks reset gold xp level streak achievements habits progress simulate random stress fresh";

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
  }

  // ── Economy ──────────────────────────────────────────────

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

  function removeAllGold() {
    if (
      !window.confirm(
        "Remove ALL bonus coins? This sets your bonus coin balance to 0. Other economy data (owned items, spend ledger) is preserved.",
      )
    )
      return;
    mutateData(
      (prev) => ({
        ...prev,
        economy: {
          ...prev.economy,
          bonusCoins: 0,
        },
      }),
      false,
    );
    toast.success("All bonus coins removed.");
  }

  // ── Habits ──────────────────────────────────────────────

  // Mark ALL active habits as done for the last 55 consecutive days.
  // Every day gets a full "done" record for every active habit, producing
  // correct current streaks (55), best streaks (55), total completions,
  // XP, and achievement progress.
  function markAllHabitsCompleted() {
    const DAYS = 55;
    const activeHabits = data.habits.filter((h) => !h.archived && !h.deletedAt);
    if (activeHabits.length === 0) {
      toast.error("Create at least one active habit first.");
      return;
    }
    mutateData(
      (prev) => {
        const active = prev.habits.filter((h) => !h.archived && !h.deletedAt);
        if (active.length === 0) return prev;
        const newMarks: Record<string, Record<string, MarkStatus>> = {
          ...prev.marks,
        };
        for (let i = 1; i <= DAYS; i++) {
          const key = dateKey(addDays(today, -i));
          const day: Record<string, MarkStatus> = {};
          for (const h of active) {
            day[h.id] = "done" as MarkStatus;
          }
          newMarks[key] = day;
        }
        return { ...prev, marks: newMarks };
      },
      false,
    );
    const habitsCount = activeHabits.length;
    const totalCompletions = habitsCount * DAYS;
    toast.success(
      `Marked all ${habitsCount} habits as done for ${DAYS} days (${totalCompletions.toLocaleString()} completions)!`,
    );
  }

  function resetHabits() {
    if (
      !window.confirm(
        "Delete ALL habits? This also removes all associated marks.",
      )
    )
      return;
    mutateData((prev) => ({ ...prev, habits: [], marks: {} }), false);
  }

  // ── XP & Level ──────────────────────────────────────────

  // Calculate total XP required to reach a given level (1-99)
  function xpForLevel(targetLevel: number): number {
    let total = 0;
    for (let l = 1; l < targetLevel; l++) {
      total += xpToAdvance(l);
    }
    return total;
  }

  // Calculate current XP from existing completion marks + achievements.
  function currentXp(): number {
    const frozen = frozenSet(data.economy);
    const stats = buildGameStats(data.habits, data.marks, today, frozen);
    const unlocked = evaluateAchievements(stats)
      .filter((a) => a.unlocked)
      .map((a) => a.def);
    return totalXp(stats, unlocked);
  }

  // Fill enough completion marks to reach the specified level.
  function fillXpToLevel(targetLevel: number) {
    if (targetLevel < 1 || targetLevel > 99) {
      toast.error("Level must be between 1 and 99.");
      return;
    }
    if (targetLevel === 1) {
      toast.info("Already at level 1.");
      return;
    }

    const xpNeeded = xpForLevel(targetLevel);
    const currentXpValue = currentXp();
    const xpGap = Math.max(0, xpNeeded - currentXpValue);

    if (xpGap === 0) {
      toast.info(`Already at or above level ${targetLevel}!`);
      return;
    }

    // Each completion gives 10 XP. Perfect-day bonuses will push the final
    // level slightly higher than the target, which is acceptable.
    const completionsNeeded = Math.ceil(xpGap / 10);

    const activeHabits = data.habits.filter((h) => !h.archived && !h.deletedAt);
    if (activeHabits.length === 0) {
      toast.error("Create at least one active habit first.");
      return;
    }

    const completionsPerDay = activeHabits.length;
    // Add a 20% safety margin on days to account for perfect-day bonuses
    const daysNeeded = Math.ceil(completionsNeeded / completionsPerDay);

    mutateData(
      (prev) => {
        const active = prev.habits.filter((h) => !h.archived && !h.deletedAt);
        if (active.length === 0) return prev;
        const newMarks: Record<string, Record<string, MarkStatus>> = {
          ...prev.marks,
        };
        let completions = 0;
        let day = 1;
        // Cap at 10 years to prevent infinite loop
        const maxDays = Math.min(daysNeeded + 10, 3650);
        while (completions < completionsNeeded && day <= maxDays) {
          const key = dateKey(addDays(today, -day));
          const dayRecord: Record<string, MarkStatus> =
            newMarks[key] ?? ({} as Record<string, MarkStatus>);
          let dayChanged = false;
          for (const h of active) {
            if (dayRecord[h.id] !== "done" && completions < completionsNeeded) {
              dayRecord[h.id] = "done" as MarkStatus;
              completions++;
              dayChanged = true;
            }
          }
          if (dayChanged) {
            newMarks[key] = dayRecord;
          }
          day++;
        }
        return { ...prev, marks: newMarks };
      },
      false,
    );

    const habitsCount = activeHabits.length;
    toast.success(
      `Set to level ${targetLevel} (~${completionsNeeded.toLocaleString()} completions, ${habitsCount} habits, ~${daysNeeded} days)!`,
    );
  }

  function setLevelMax() {
    if (
      !window.confirm(
        "Fill enough completion marks to reach level 99 for all active habits? This adds a large number of completion records.",
      )
    )
      return;
    fillXpToLevel(99);
  }

  function setLevelPrompt() {
    const input = window.prompt("Enter target level (1–99):", "10");
    if (input === null) return; // cancelled
    const level = parseInt(input, 10);
    if (isNaN(level) || level < 1 || level > 99) {
      toast.error("Please enter a valid level between 1 and 99.");
      return;
    }
    if (
      !window.confirm(
        `Fill completion marks to reach level ${level}? This will generate completion records for past days.`,
      )
    )
      return;
    fillXpToLevel(level);
  }

  // ── Progress (reset) ────────────────────────────────────

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

  // ── Achievements ────────────────────────────────────────

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

  function lockAllAchievements() {
    if (
      !window.confirm(
        "Lock all achievements? This will clear all unlock records.",
      )
    )
      return;
    mutateData((prev) => ({ ...prev, unlocks: {} }), false);
  }

  // ── Max Everything ──────────────────────────────────────

  function maxLevel() {
    if (
      !window.confirm(
        "Fill 10 years of completion data and unlock all achievements to maximize " +
          "your level? (This will NOT affect coins or shop items.)",
      )
    )
      return;
    const now = new Date().toISOString();
    const d = new Date();
    mutateData((prev) => {
      const active = prev.habits.filter((h) => !h.archived && !h.deletedAt);
      const habitIds = active.map((h) => h.id);

      const newMarks: Record<string, Record<string, MarkStatus>> = {
        ...prev.marks,
      };
      if (habitIds.length > 0) {
        for (let i = 1; i <= 3650; i++) {
          const key = dateKey(addDays(d, -i));
          const day: Record<string, MarkStatus> = {};
          for (const id of habitIds) {
            day[id] = "done";
          }
          newMarks[key] = day;
        }
      }

      const unlocks: Unlocks = { ...prev.unlocks };
      for (const a of ACHIEVEMENTS) {
        unlocks[a.id] = { at: unlocks[a.id]?.at ?? now, seen: true };
      }

      const progressSeen: ProgressSeen = {
        ...prev.progressSeen,
        level: 99,
        completedGoals: prev.progressSeen.completedGoals ?? [],
      };

      return {
        ...prev,
        marks: newMarks,
        unlocks,
        progressSeen,
      };
    }, false);
    const habitsCount = data.habits.filter((h) => !h.archived && !h.deletedAt).length;
    toast.success(
      `Max level achieved! (${habitsCount} habits × 3650 days of completions)`,
    );
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
    const d = new Date();
    mutateData((prev) => {
      const active = prev.habits.filter((h) => !h.archived && !h.deletedAt);
      const habitIds = active.map((h) => h.id);

      const newMarks: Record<string, Record<string, MarkStatus>> = {
        ...prev.marks,
      };
      if (habitIds.length > 0) {
        for (let i = 1; i <= 3650; i++) {
          const key = dateKey(addDays(d, -i));
          const day: Record<string, MarkStatus> = {};
          for (const id of habitIds) {
            day[id] = "done";
          }
          newMarks[key] = day;
        }
      }

      const unlocks: Unlocks = { ...prev.unlocks };
      for (const a of ACHIEVEMENTS) {
        unlocks[a.id] = { at: unlocks[a.id]?.at ?? now, seen: true };
      }

      const allItemIds = SHOP_ITEMS.map((i) => i.id);
      const owned = [...new Set([...prev.economy.owned, ...allItemIds])];
      const equipped = {
        ...prev.economy.equipped,
        flame: "flame-rainbow",
        confetti: "confetti-gold",
        accent: "accent-ocean",
      };

      const bonusCoins = (prev.economy.bonusCoins ?? 0) + 99999;

      const progressSeen: ProgressSeen = {
        seeded: true,
        level: 99,
        title: "Legendary Achiever",
        shop: allItemIds,
        streaks: Object.fromEntries(habitIds.map((id) => [id, 365])),
        tierUnlocks: ["common", "rare", "epic", "legendary"],
        completedGoals: [],
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
          hint="Fill 10 years of completions and unlock all achievements to reach max level. Does NOT affect coins or shop."
          query={query}
          terms="max level xp experience maxlevel"
        >
          <DevButton tone="accent" onClick={maxLevel}>
            <Sparkles className="size-3.5" /> Max Level
          </DevButton>
        </DevRow>
        <DevRow
          label="Max Everything"
          hint="Fill 10 years of completions, unlock all achievements, buy all shop items, max coins, set progress markers to max."
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

      <DevGroup title="Economy">
        <DevRow
          label="Max Gold (99,999)"
          hint="Add 99,999 bonus coins for testing."
          query={query}
          terms="coins money add"
        >
          <DevButton tone="accent" onClick={addGold}>
            <Coins className="size-3.5" /> Add
          </DevButton>
        </DevRow>
        <DevRow
          label="Remove All Gold"
          hint="Set bonus coin balance to 0. Other economy data is preserved."
          query={query}
          terms="coins money remove reset zero clear"
        >
          <DevButton tone="danger" onClick={removeAllGold}>
            <Ban className="size-3.5" /> Remove All
          </DevButton>
        </DevRow>
      </DevGroup>

      <DevGroup title="Habits">
        <DevRow
          label="Mark All Habits as Completed"
          hint="Mark every active habit as done for the last 55 consecutive days. Correctly updates streaks (55 days), XP, completions, and achievements."
          query={query}
          terms="complete all habits done 55 days streak xp achievements marks fill"
        >
          <DevButton tone="accent" onClick={markAllHabitsCompleted}>
            <ListChecks className="size-3.5" /> Mark All Completed
          </DevButton>
        </DevRow>
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

      <DevGroup title="XP & Level">
        <DevRow
          label="Set Level to Max (99)"
          hint="Fill enough completion records to reach level 99 for all active habits."
          query={query}
          terms="max level 99 xp experience setlevel maxlevel"
        >
          <DevButton tone="accent" onClick={setLevelMax}>
            <Gauge className="size-3.5" /> Level 99
          </DevButton>
        </DevRow>
        <DevRow
          label="Set Level"
          hint="Enter a level (1–99) and fill enough completions to reach it."
          query={query}
          terms="set level xp experience custom target"
        >
          <DevButton tone="accent" onClick={setLevelPrompt}>
            <Target className="size-3.5" /> Set Level
          </DevButton>
        </DevRow>
        <DevRow
          label="Reset Progress"
          hint="Clear marks, unlocks, economy, and celebration markers."
          query={query}
          terms="clear wipe progress reset marks unlocks economy"
        >
          <DevButton tone="danger" onClick={resetProgress}>
            Reset
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
          hint="Generate 55 habits, 60 days of completion marks, 50 notes, 30 goals, economy entries, and achievement unlocks — all internally consistent. NOTE: Replaces existing marks, economy, unlocks, and progress with fresh seed data. Pushes to Supabase."
          query={query}
          terms="seed full comprehensive populate all tables marks economy unlocks progress"
        >
          <DevButton
            tone="accent"
            onClick={async () => {
              if (!user) {
                toast.error("Must be logged in.");
                return;
              }
              if (
                !window.confirm(
                  "Generate 55 habits, 60 days of completion marks, 50 notes, 30 goals, economy entries, and achievements — then push to Supabase?",
                )
              )
                return;
              setSeeding(true);
              try {
                const seeded = makeComprehensiveSeedData(data, today);
                replaceData(seeded);
                await fullResync(user.id);
                reloadCache();
                toast.success(
                  "Comprehensive seed data generated and pushed to Supabase!",
                );
              } catch (e) {
                toast.error(`Failed: ${e}`);
              } finally {
                setSeeding(false);
              }
            }}
            disabled={seeding || !user}
          >
            <Database className="size-3.5" />{" "}
            {seeding ? "..." : "Seed (55+)"}
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
