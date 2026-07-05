// AppProvider — Mobile data layer using React Context + useReducer.
// Loads AppData from AsyncStorage on mount and auto-saves on every mutation.
// Provides a useAppData hook and action functions to every screen.

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { AppData, Habit, Note, NoteLinks, Goal, CosmeticSlot, Profile, ThemeSettings } from "@project101/shared";
import {
  dateKey,
  addDays,
} from "@project101/shared";
import { emptyData } from "./storage";
import {
  nextStatus,
  canEditMark,
  reconcileUnlocks,
  buildGameStats,
  evaluateAchievements,
  uid,
  coinBalance,
  coinsEarned,
  frozenSet,
  checkInReward,
  generateDailyQuest,
  levelUpCoinsBetween,
  makeFreezeEntry,
  randomSpinReward,
  shopItem,
  streakMilestoneReward,
  canUseFreeze,
  canFreezeDay,
  FREEZE_PRICE,
  baselineProgressSeen,
  summarizeProgress,
} from "@project101/shared";
import { loadData, saveData } from "./storage";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type Action =
  | { type: "LOAD"; data: AppData }
  | { type: "REPLACE"; data: AppData }
  | { type: "ADD_HABIT"; habit: Habit }
  | { type: "UPDATE_HABIT"; habit: Habit }
  | { type: "DELETE_HABIT"; id: string }
  | { type: "ARCHIVE_HABIT"; id: string; archived: boolean }
  | { type: "DUPLICATE_HABIT"; id: string }
  | { type: "CYCLE_MARK"; dateK: string; habitId: string; habitCategory?: string }
  | { type: "SET_MARKS"; marks: AppData["marks"] }
  | { type: "ADD_NOTE"; note: Note }
  | { type: "UPDATE_NOTE"; id: string; patch: Partial<Omit<Note, "id" | "createdAt">> }
  | { type: "DELETE_NOTE"; id: string }
  | { type: "SET_DAILY_NOTE"; dateK: string; text: string }
  | { type: "ADD_GOAL"; goal: Goal }
  | { type: "UPDATE_GOAL"; goal: Goal }
  | { type: "DELETE_GOAL"; id: string }
  | { type: "UPDATE_PROFILE"; patch: Partial<Profile> }
  | { type: "SET_THEME"; patch: Partial<ThemeSettings> }
  | { type: "SET_GRACE_HOURS"; hours: number }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "UNLOCK_ACHIEVEMENTS"; unlocks: AppData["unlocks"] }
  | { type: "MARK_ACHIEVEMENTS_SEEN"; ids: string[] }
  | { type: "ACKNOWLEDGE_CELEBRATION"; event: import("@project101/shared").CelebrationEvent }
  | { type: "SET_ECONOMY"; economy: AppData["economy"] }
  | { type: "BUY_COSMETIC"; itemId: string }
  | { type: "EQUIP_COSMETIC"; slot: CosmeticSlot; itemId: string }
  | { type: "CLAIM_CHECKIN" }
  | { type: "REFRESH_QUEST" }
  | { type: "CLAIM_QUEST" }
  | { type: "DO_SPIN" }
  | { type: "REDEEM_FREEZE"; habitId: string; dateK: string }
  | { type: "MARK_TEMPLATE_USED"; templateId: string }
  | { type: "ADD_CUSTOM_CATEGORY"; name: string }
  | { type: "REMOVE_CUSTOM_CATEGORY"; name: string }
  | { type: "UPDATE_PROGRESS_SEEN"; progressSeen: AppData["progressSeen"] };

// Export the Action type for use by screens
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Action = Action;

interface StoreContextValue {
  data: AppData;
  loaded: boolean;
  isLoading: boolean;
  actions: StoreActions;
}

interface StoreActions {
  addHabit: (habit: Habit) => void;
  updateHabit: (habit: Habit) => void;
  deleteHabit: (id: string) => void;
  setHabitArchived: (id: string, archived: boolean) => void;
  duplicateHabit: (id: string) => void;
  cycleMark: (dateK: string, habitId: string, habitCategory?: string) => void;
  setMarks: (marks: AppData["marks"]) => void;
  addNote: (input: { body: string; tags?: string[]; links?: NoteLinks }) => Note;
  updateNote: (id: string, patch: Partial<Omit<Note, "id" | "createdAt">>) => void;
  deleteNote: (id: string) => void;
  setDailyNote: (dateK: string, text: string) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (id: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setTheme: (patch: Partial<ThemeSettings>) => void;
  setGraceHours: (hours: number) => void;
  completeOnboarding: () => void;
  seedUnlocksSeen: () => void;
  seedCelebrationsSeen: () => void;
  acknowledgeCelebration: (event: import("@project101/shared").CelebrationEvent) => void;
  buyCosmetic: (itemId: string) => void;
  equipCosmetic: (slot: CosmeticSlot, itemId: string) => void;
  claimDailyCheckIn: () => { reward: number; streak: number };
  refreshDailyQuest: () => void;
  claimDailyQuest: () => void;
  doDailySpin: () => { label: string; amount: number; isFreeze: boolean } | null;
  redeemFreeze: (habitId: string, dateK: string) => void;
  markTemplateUsed: (templateId: string) => void;
  addCustomCategory: (name: string) => void;
  removeCustomCategory: (name: string) => void;
  replaceData: (data: AppData) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/* ─────────────────────────────────────────────
   Reducer
   ───────────────────────────────────────────── */

function appReducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case "LOAD":
    case "REPLACE":
      return action.data;

    case "ADD_HABIT":
      return { ...state, habits: [...state.habits, action.habit] };

    case "UPDATE_HABIT":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.habit.id ? action.habit : h,
        ),
      };

    case "DELETE_HABIT":
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
      };

    case "ARCHIVE_HABIT":
      return {
        ...state,
        habits: state.habits.map((h) =>
          h.id === action.id ? { ...h, archived: action.archived } : h,
        ),
      };

    case "DUPLICATE_HABIT": {
      const src = state.habits.find((h) => h.id === action.id);
      if (!src) return state;
      const copy: Habit = {
        ...src,
        id: uid(),
        name: `${src.name} (copy)`,
        createdAt: new Date().toISOString(),
        archived: false,
      };
      return { ...state, habits: [...state.habits, copy] };
    }

    case "CYCLE_MARK": {
      const grace = state.settings.graceHours ?? 5;
      if (!canEditMark(action.dateK, new Date(), grace)) return state;
      const day = { ...(state.marks[action.dateK] ?? {}) };
      const next = nextStatus(day[action.habitId]);
      if (next === undefined) delete day[action.habitId];
      else day[action.habitId] = next;
      const updated = { ...state, marks: { ...state.marks, [action.dateK]: day } };
      // Reconcile unlocks — marking can satisfy achievements
      const { unlocks } = reconcileUnlocks(updated, new Date(), new Date().toISOString());
      // Progress daily quest
      const todayKey = dateKey(new Date());
      let eco = updated.economy;
      if (action.dateK === todayKey && next === "done") {
        const q = eco.currentQuest;
        if (
          q &&
          q.current < q.target &&
          (!q.category || q.category === action.habitCategory)
        ) {
          eco = { ...eco, currentQuest: { ...q, current: q.current + 1 } };
        }
      }
      return unlocks === updated.unlocks
        ? { ...updated, economy: eco }
        : { ...updated, unlocks, economy: eco };
    }

    case "SET_MARKS":
      return { ...state, marks: action.marks };

    case "ADD_NOTE":
      return { ...state, notes: [action.note, ...state.notes] };

    case "UPDATE_NOTE":
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id
            ? { ...n, ...action.patch, updatedAt: new Date().toISOString() }
            : n,
        ),
      };

    case "DELETE_NOTE":
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };

    case "SET_DAILY_NOTE": {
      const existing = state.notes.find(
        (n) => n.links.date === action.dateK && !n.links.habitId && !n.links.goalId,
      );
      const trimmed = action.text.trim();
      if (existing) {
        if (trimmed === "") {
          return { ...state, notes: state.notes.filter((n) => n.id !== existing.id) };
        }
        return {
          ...state,
          notes: state.notes.map((n) =>
            n.id === existing.id
              ? { ...n, body: action.text, updatedAt: new Date().toISOString() }
              : n,
          ),
        };
      }
      if (trimmed === "") return state;
      const now = new Date().toISOString();
      return {
        ...state,
        notes: [
          {
            id: uid(),
            createdAt: now,
            updatedAt: now,
            body: action.text,
            tags: [],
            links: { date: action.dateK },
          },
          ...state.notes,
        ],
      };
    }

    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.goal] };

    case "UPDATE_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)),
      };

    case "DELETE_GOAL":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };

    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.patch } };

    case "SET_THEME":
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: { ...state.settings.theme, ...action.patch },
        },
      };

    case "SET_GRACE_HOURS":
      return {
        ...state,
        settings: { ...state.settings, graceHours: Math.max(0, action.hours) },
      };

    case "COMPLETE_ONBOARDING":
      return {
        ...state,
        settings: { ...state.settings, onboardingComplete: true },
      };

    case "UNLOCK_ACHIEVEMENTS":
      return { ...state, unlocks: action.unlocks };

    case "MARK_ACHIEVEMENTS_SEEN": {
      let changed = false;
      const unlocks = { ...state.unlocks };
      for (const id of action.ids) {
        const rec = unlocks[id];
        if (rec && !rec.seen) {
          unlocks[id] = { ...rec, seen: true };
          changed = true;
        }
      }
      return changed ? { ...state, unlocks } : state;
    }

    case "ACKNOWLEDGE_CELEBRATION": {
      const event = action.event;
      if (event.kind === "achievement") {
        return appReducer(state, { type: "MARK_ACHIEVEMENTS_SEEN", ids: event.achievementId ? [event.achievementId] : [] });
      }
      const ps = state.progressSeen;
      let next: typeof ps | null = null;
      let bonus = 0;
      if (event.kind === "levelup" && event.level != null && event.level > ps.level) {
        next = { ...ps, level: event.level };
        bonus = levelUpCoinsBetween(ps.level, event.level);
      } else if (event.kind === "title" && event.titleName && event.titleName !== ps.title) {
        next = { ...ps, title: event.titleName };
      } else if (event.kind === "shop" && event.shopId && !ps.shop.includes(event.shopId)) {
        next = { ...ps, shop: [...ps.shop, event.shopId] };
      } else if (event.kind === "streak" && event.habitId && event.tier != null && event.tier > (ps.streaks[event.habitId] ?? 0)) {
        next = { ...ps, streaks: { ...ps.streaks, [event.habitId]: event.tier } };
        bonus = streakMilestoneReward(event.tier);
      } else if (event.kind === "tier" && event.tier != null) {
        const RARITY_BY_ORDER: Record<number, string> = { 0: "common", 1: "rare", 2: "epic", 3: "legendary" };
        const rarity = RARITY_BY_ORDER[event.tier];
        if (rarity && !ps.tierUnlocks.includes(rarity)) {
          next = { ...ps, tierUnlocks: [...ps.tierUnlocks, rarity] };
        }
      }
      if (!next) return state;
      const economy = bonus > 0
        ? { ...state.economy, bonusCoins: state.economy.bonusCoins + bonus }
        : state.economy;
      return { ...state, progressSeen: next, economy };
    }

    case "SET_ECONOMY":
      return { ...state, economy: action.economy };

    case "BUY_COSMETIC": {
      const item = shopItem(action.itemId);
      if (!item) return state;
      if (state.economy.owned.includes(action.itemId)) return state;
      const today = new Date();
      if (item.minLevel) {
        const sum = summarizeProgress(state, today);
        if (sum.level.level < item.minLevel) return state;
      }
      // Check balance
      const stats = buildGameStats(state.habits, state.marks, today, frozenSet(state.economy));
      const unlockedRarities = evaluateAchievements(stats).filter((a) => a.unlocked).map((a) => a.def.rarity);
      const balance = coinBalance(coinsEarned(stats, unlockedRarities, state.economy), state.economy);
      if (balance < item.price) return state;

      return {
        ...state,
        economy: {
          ...state.economy,
          spent: [
            ...state.economy.spent,
            { id: uid(), at: new Date().toISOString(), amount: item.price, item: action.itemId },
          ],
          owned: [...state.economy.owned, action.itemId],
          equipped: { ...state.economy.equipped, [item.slot]: action.itemId },
        },
      };
    }

    case "EQUIP_COSMETIC": {
      const isDefault = action.itemId === `${action.slot}-default`;
      if (!isDefault && !state.economy.owned.includes(action.itemId)) return state;
      return {
        ...state,
        economy: {
          ...state.economy,
          equipped: { ...state.economy.equipped, [action.slot]: action.itemId },
        },
      };
    }

    case "CLAIM_CHECKIN": {
      const todayKey = dateKey(new Date());
      if (state.economy.lastCheckIn === todayKey) return state;
      const prevStreak = state.economy.checkInStreak;
      const yesterday = dateKey(addDays(new Date(), -1));
      const streak = state.economy.lastCheckIn === yesterday ? prevStreak + 1 : 1;
      const reward = checkInReward(streak);
      return {
        ...state,
        economy: {
          ...state.economy,
          bonusCoins: state.economy.bonusCoins + reward,
          lastCheckIn: todayKey,
          checkInStreak: streak,
        },
      };
    }

    case "REFRESH_QUEST": {
      const todayKey = dateKey(new Date());
      if (state.economy.lastQuestDate === todayKey && !state.economy.currentQuest) return state;
      if (state.economy.lastQuestDate === todayKey && state.economy.currentQuest) return state;
      const quest = generateDailyQuest(state.habits);
      return {
        ...state,
        economy: {
          ...state.economy,
          lastQuestDate: todayKey,
          currentQuest: quest ? { ...quest, current: 0 } : null,
        },
      };
    }

    case "CLAIM_QUEST": {
      const q = state.economy.currentQuest;
      if (!q || q.current < q.target || q.claimed) return state;
      return {
        ...state,
        economy: {
          ...state.economy,
          bonusCoins: state.economy.bonusCoins + q.reward,
          currentQuest: { ...q, claimed: true },
          lastQuestDate: dateKey(new Date()),
        },
      };
    }

    case "DO_SPIN": {
      const todayKey = dateKey(new Date());
      if (state.economy.lastSpinDate === todayKey) return state;
      const reward = randomSpinReward();
      const isFreeze = reward.item === "freeze";
      const effectiveAmount = isFreeze ? 25 : reward.amount;
      const effectiveLabel = isFreeze ? "25 coins (freeze consolation)" : reward.label;
      const result = { label: effectiveLabel, amount: effectiveAmount, isFreeze };
      return {
        ...state,
        economy: {
          ...state.economy,
          bonusCoins: state.economy.bonusCoins + effectiveAmount,
          lastSpinDate: todayKey,
          lastSpinResult: result,
        },
      };
    }

    case "REDEEM_FREEZE": {
      const today = new Date();
      if (!canUseFreeze(state.economy, today)) return state;
      if (!canFreezeDay(state.economy, state.marks, action.habitId, action.dateK)) return state;
      const stats = buildGameStats(state.habits, state.marks, today, frozenSet(state.economy));
      const unlockedRarities = evaluateAchievements(stats).filter((a) => a.unlocked).map((a) => a.def.rarity);
      const balance = coinBalance(coinsEarned(stats, unlockedRarities, state.economy), state.economy);
      if (balance < FREEZE_PRICE) return state;

      return {
        ...state,
        economy: {
          ...state.economy,
          spent: [
            ...state.economy.spent,
            { id: uid(), at: new Date().toISOString(), amount: FREEZE_PRICE, item: "freeze" },
          ],
          freezes: [
            ...state.economy.freezes,
            makeFreezeEntry(action.habitId, action.dateK, uid(), new Date().toISOString()),
          ],
        },
      };
    }

    case "MARK_TEMPLATE_USED": {
      const ids = state.settings.usedTemplateIds ?? [];
      if (ids.includes(action.templateId)) return state;
      return { ...state, settings: { ...state.settings, usedTemplateIds: [...ids, action.templateId] } };
    }

    case "ADD_CUSTOM_CATEGORY": {
      const cats = state.settings.customCategories ?? [];
      if (cats.includes(action.name)) return state;
      return { ...state, settings: { ...state.settings, customCategories: [...cats, action.name] } };
    }

    case "REMOVE_CUSTOM_CATEGORY": {
      const cats = state.settings.customCategories ?? [];
      return { ...state, settings: { ...state.settings, customCategories: cats.filter((c) => c !== action.name) } };
    }

    case "UPDATE_PROGRESS_SEEN":
      return { ...state, progressSeen: action.progressSeen };

    default:
      return state;
  }
}

/* ─────────────────────────────────────────────
   Provider Component
   ───────────────────────────────────────────── */

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(appReducer, emptyData);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await loadData();
        dispatch({ type: "LOAD", data: saved });
      } catch {
        dispatch({ type: "LOAD", data: emptyData });
      }
      setLoaded(true);
      setIsLoading(false);
    })();
  }, []);

  // Auto-save with debouncing
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveData(dataRef.current);
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, loaded]);

  // TODO: wire up AppState.addEventListener("change", ...) to save on background

  // Action dispatchers with side effects
  const actions: StoreActions = {
    addHabit: useCallback((habit: Habit) => {
      dispatch({ type: "ADD_HABIT", habit });
    }, []),

    updateHabit: useCallback((habit: Habit) => {
      dispatch({ type: "UPDATE_HABIT", habit });
    }, []),

    deleteHabit: useCallback((id: string) => {
      dispatch({ type: "DELETE_HABIT", id });
    }, []),

    setHabitArchived: useCallback((id: string, archived: boolean) => {
      dispatch({ type: "ARCHIVE_HABIT", id, archived });
    }, []),

    duplicateHabit: useCallback((id: string) => {
      dispatch({ type: "DUPLICATE_HABIT", id });
    }, []),

    cycleMark: useCallback((dateK: string, habitId: string, habitCategory?: string) => {
      dispatch({ type: "CYCLE_MARK", dateK, habitId, habitCategory });
    }, []),

    setMarks: useCallback((marks: AppData["marks"]) => {
      dispatch({ type: "SET_MARKS", marks });
    }, []),

    addNote: useCallback((input: { body: string; tags?: string[]; links?: NoteLinks }): Note => {
      const now = new Date().toISOString();
      const note: Note = {
        id: uid(),
        createdAt: now,
        updatedAt: now,
        body: input.body,
        tags: input.tags ?? [],
        links: input.links ?? {},
      };
      dispatch({ type: "ADD_NOTE", note });
      return note;
    }, []),

    updateNote: useCallback((id: string, patch: Partial<Omit<Note, "id" | "createdAt">>) => {
      dispatch({ type: "UPDATE_NOTE", id, patch });
    }, []),

    deleteNote: useCallback((id: string) => {
      dispatch({ type: "DELETE_NOTE", id });
    }, []),

    setDailyNote: useCallback((dateK: string, text: string) => {
      dispatch({ type: "SET_DAILY_NOTE", dateK, text });
    }, []),

    addGoal: useCallback((goal: Goal) => {
      dispatch({ type: "ADD_GOAL", goal });
    }, []),

    updateGoal: useCallback((goal: Goal) => {
      dispatch({ type: "UPDATE_GOAL", goal });
    }, []),

    deleteGoal: useCallback((id: string) => {
      dispatch({ type: "DELETE_GOAL", id });
    }, []),

    updateProfile: useCallback((patch: Partial<Profile>) => {
      dispatch({ type: "UPDATE_PROFILE", patch });
    }, []),

    setTheme: useCallback((patch: Partial<ThemeSettings>) => {
      dispatch({ type: "SET_THEME", patch });
    }, []),

    setGraceHours: useCallback((hours: number) => {
      dispatch({ type: "SET_GRACE_HOURS", hours });
    }, []),

    completeOnboarding: useCallback(() => {
      dispatch({ type: "COMPLETE_ONBOARDING" });
    }, []),

    seedUnlocksSeen: useCallback(() => {
      // Run reconcileUnlocks on current state and mark all as seen
      const state = dataRef.current;
      const { unlocks, newlyUnlocked } = reconcileUnlocks(state, new Date(), new Date().toISOString());
      if (newlyUnlocked.length === 0) return;
      const seeded = { ...unlocks };
      for (const id of newlyUnlocked) seeded[id] = { ...seeded[id], seen: true };
      dispatch({ type: "UNLOCK_ACHIEVEMENTS", unlocks: seeded });
    }, []),

    seedCelebrationsSeen: useCallback(() => {
      const state = dataRef.current;
      if (state.progressSeen.seeded) return;
      dispatch({
        type: "UPDATE_PROGRESS_SEEN",
        progressSeen: baselineProgressSeen(state, new Date()),
      });
    }, []),

    acknowledgeCelebration: useCallback((event: import("@project101/shared").CelebrationEvent) => {
      dispatch({ type: "ACKNOWLEDGE_CELEBRATION", event });
    }, []),

    buyCosmetic: useCallback((itemId: string) => {
      dispatch({ type: "BUY_COSMETIC", itemId });
    }, []),

    equipCosmetic: useCallback((slot: CosmeticSlot, itemId: string) => {
      dispatch({ type: "EQUIP_COSMETIC", slot, itemId });
    }, []),

    claimDailyCheckIn: useCallback(() => {
      const prev = dataRef.current;
      const todayKey = dateKey(new Date());
      if (prev.economy.lastCheckIn === todayKey) return { reward: 0, streak: 0 };
      const prevStreak = prev.economy.checkInStreak;
      const yesterday = dateKey(addDays(new Date(), -1));
      const streak = prev.economy.lastCheckIn === yesterday ? prevStreak + 1 : 1;
      const reward = checkInReward(streak);
      dispatch({ type: "CLAIM_CHECKIN" });
      return { reward, streak };
    }, []),

    refreshDailyQuest: useCallback(() => {
      dispatch({ type: "REFRESH_QUEST" });
    }, []),

    claimDailyQuest: useCallback(() => {
      dispatch({ type: "CLAIM_QUEST" });
    }, []),

    doDailySpin: useCallback(() => {
      const prev = dataRef.current;
      const todayKey = dateKey(new Date());
      if (prev.economy.lastSpinDate === todayKey) return null;
      const reward = randomSpinReward();
      const isFreeze = reward.item === "freeze";
      const effectiveAmount = isFreeze ? 25 : reward.amount;
      const effectiveLabel = isFreeze ? "25 coins (freeze consolation)" : reward.label;
      dispatch({ type: "DO_SPIN" });
      return { label: effectiveLabel, amount: effectiveAmount, isFreeze };
    }, []),

    redeemFreeze: useCallback((habitId: string, dateK: string) => {
      dispatch({ type: "REDEEM_FREEZE", habitId, dateK });
    }, []),

    markTemplateUsed: useCallback((templateId: string) => {
      dispatch({ type: "MARK_TEMPLATE_USED", templateId });
    }, []),

    addCustomCategory: useCallback((name: string) => {
      dispatch({ type: "ADD_CUSTOM_CATEGORY", name });
    }, []),

    removeCustomCategory: useCallback((name: string) => {
      dispatch({ type: "REMOVE_CUSTOM_CATEGORY", name });
    }, []),

    replaceData: useCallback((data: AppData) => {
      dispatch({ type: "REPLACE", data });
    }, []),
  };

  return (
    <StoreContext.Provider value={{ data, loaded, isLoading, actions }}>
      {children}
    </StoreContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   Hooks
   ───────────────────────────────────────────── */

export function useAppData(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppData must be used within AppProvider");
  return ctx;
}
