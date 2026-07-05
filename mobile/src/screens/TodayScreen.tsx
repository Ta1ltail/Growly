// TodayScreen — first screen users see. Shows daily check-in streak, daily
// quest, daily spin, a daily reflection note prompt, and progress summary from
// the shared business logic using real app data from the store.

import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import {
  summarizeProgress,
  dateKey,
  consistencyScore,
  dayCompletion,
  habitStreaks,
  isScheduled,
  frozenSet,
  checkInReward,
} from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { colors } from "../lib/colors";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { DailyQuestCard } from "../components/today/DailyQuestCard";

export default function TodayScreen() {
  const { data, isLoading, actions } = useAppData();
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const summary = React.useMemo(
    () => summarizeProgress(data, today),
    [data.habits, data.marks, data.economy],
  );

  const active = useMemo(
    () => data.habits.filter((h) => !h.archived),
    [data.habits],
  );
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);

  const todaysHabits = useMemo(
    () => active.filter((h) => isScheduled(h, today)),
    [active, today],
  );

  const doneToday = todaysHabits.filter(
    (h) => data.marks[todayKey]?.[h.id] === "done",
  ).length;

  const progress = dayCompletion(active, data.marks, today);
  const consistency = useMemo(
    () => consistencyScore(active, data.marks, today, 14),
    [active, data.marks, today],
  );

  const streaks = useMemo(() => {
    let best = 0, current = 0;
    for (const h of active) {
      const s = habitStreaks(h, data.marks, today, frozen);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [active, data.marks, today, frozen]);

  // Daily check-in
  const alreadyChecked = data.economy.lastCheckIn === todayKey;
  const checkInStreak = data.economy.checkInStreak;
  const nextReward = checkInReward(checkInStreak + 1);

  // Daily spin
  const alreadySpun = data.economy.lastSpinDate === todayKey;
  const lastSpin = data.economy.lastSpinResult;

  // Daily reflection note
  const dailyNote = data.notes.find(
    (n) => n.links.date === todayKey && !n.links.habitId && !n.links.goalId,
  );
  const [noteText, setNoteText] = useState(dailyNote?.body ?? "");

  const [showSpinResult, setShowSpinResult] = useState(false);
  const [spinResult, setSpinResult] = useState<{ label: string; amount: number } | null>(null);

  function handleCheckIn() {
    const result = actions.claimDailyCheckIn();
    if (result.reward > 0) {
      // Give visual feedback — the state updates naturally via re-render
    }
  }

  function handleSpin() {
    const result = actions.doDailySpin();
    if (result) {
      setSpinResult(result);
      setShowSpinResult(true);
      setTimeout(() => setShowSpinResult(false), 3000);
    }
  }

  function handleNoteSave() {
    actions.setDailyNote(todayKey, noteText);
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const xpPct = summary.level.isMax
    ? 100
    : Math.round((summary.level.xpIntoLevel / summary.level.xpForNext) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Today" subtitle={`${today.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`} />

      {/* Daily Check-In */}
      <Card style={styles.card}>
        <View style={styles.checkinRow}>
          <View style={styles.checkinInfo}>
            <Text style={styles.cardTitle}>
              {alreadyChecked ? "✅ Checked in" : "📅 Daily Check-In"}
            </Text>
            <Text style={styles.checkinStreak}>
              {checkInStreak > 0
                ? `🔥 ${checkInStreak}-day streak`
                : "Start your streak!"}
            </Text>
            {!alreadyChecked && (
              <Text style={styles.checkinReward}>
                Reward: 🪙 +{nextReward}
              </Text>
            )}
          </View>
          {!alreadyChecked && (
            <Pressable
              onPress={handleCheckIn}
              style={({ pressed }) => [styles.checkinBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.checkinBtnText}>Check in</Text>
            </Pressable>
          )}
        </View>
      </Card>

      {/* Daily Quest */}
      <DailyQuestCard />

      {/* Daily Spin */}
      <Card style={styles.card}>
        <View style={styles.spinRow}>
          <View style={styles.spinInfo}>
            <Text style={styles.cardTitle}>
              {alreadySpun ? "🎰 Spun today" : "🎰 Daily Spin"}
            </Text>
            {alreadySpun && lastSpin ? (
              <Text style={styles.spinResult}>
                Won: 🪙 +{lastSpin.amount} ({lastSpin.label})
              </Text>
            ) : (
              <Text style={styles.spinSubtitle}>
                Spin for bonus coins!
              </Text>
            )}
          </View>
          {!alreadySpun && (
            <Pressable
              onPress={handleSpin}
              style={({ pressed }) => [styles.spinBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.spinBtnText}>🎲 Spin</Text>
            </Pressable>
          )}
        </View>
        {showSpinResult && spinResult && (
          <View style={styles.spinResultBanner}>
            <Text style={styles.spinResultEmoji}>🎉</Text>
            <Text style={styles.spinResultText}>
              +{spinResult.amount} coins! {spinResult.label}
            </Text>
          </View>
        )}
      </Card>

      {/* Progress Summary */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Your Progress</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Level</Text>
          <Text style={styles.statValue}>{summary.level.level}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Title</Text>
          <Text style={styles.statValue}>{summary.title.current.name}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>XP</Text>
          <Text style={styles.statValue}>{summary.xp.toLocaleString()}</Text>
        </View>
        {!summary.level.isMax && (
          <View style={styles.xpBar}>
            <ProgressBar value={xpPct} />
            <Text style={styles.xpBarLabel}>
              {summary.level.xpIntoLevel.toLocaleString()} / {summary.level.xpForNext.toLocaleString()}
            </Text>
          </View>
        )}
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Achievements</Text>
          <Text style={styles.statValue}>{summary.unlockedCount}/{summary.totalCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Coins</Text>
          <Text style={styles.coinValue}>🪙 {summary.coinBalance.toLocaleString()}</Text>
        </View>
      </Card>

      {/* Today's Habits Progress */}
      {active.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Today's Habits</Text>
          <View style={styles.todayStatsRow}>
            <View style={styles.todayStat}>
              <Text style={[styles.todayStatNum, { color: colors.done }]}>{doneToday}</Text>
              <Text style={styles.todayStatLabel}>Done</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={[styles.todayStatNum, { color: "#f59e0b" }]}>{todaysHabits.length - doneToday}</Text>
              <Text style={styles.todayStatLabel}>Left</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={[styles.todayStatNum, { color: colors.ink }]}>{todaysHabits.length}</Text>
              <Text style={styles.todayStatLabel}>Total</Text>
            </View>
          </View>
          <ProgressBar value={todaysHabits.length > 0 ? Math.round((doneToday / todaysHabits.length) * 100) : 0} color={colors.done} />
          <Text style={styles.statusText}>
            {todaysHabits.length - doneToday > 0
              ? `${todaysHabits.length - doneToday} habit${todaysHabits.length - doneToday !== 1 ? "s" : ""} remaining`
              : "🎉 All done!"}
          </Text>
        </Card>
      )}

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={[styles.quickStat, { flex: 1 }]}>
          <Text style={styles.quickStatNum}>{progress}%</Text>
          <Text style={styles.quickStatLabel}>Completion</Text>
        </View>
        <View style={[styles.quickStat, { flex: 1 }]}>
          <Text style={styles.quickStatNum}>{consistency}%</Text>
          <Text style={styles.quickStatLabel}>Consistency</Text>
        </View>
        <View style={[styles.quickStat, { flex: 1 }]}>
          <Text style={styles.quickStatNum}>{streaks.current}</Text>
          <Text style={styles.quickStatLabel}>Streak</Text>
        </View>
      </View>

      {/* Daily Reflection */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>📝 Daily Reflection</Text>
        <TextInput
          value={noteText}
          onChangeText={setNoteText}
          placeholder="How was your day? Write a quick reflection…"
          placeholderTextColor={colors.faint}
          multiline
          numberOfLines={3}
          style={styles.reflectionInput}
          onBlur={handleNoteSave}
        />
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Pressable
            onPress={handleNoteSave}
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.saveBtnText}>💾 Save</Text>
          </Pressable>
        </View>
      </Card>

      {/* Next Milestones */}
      {summary.nextMilestones.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Next Milestones</Text>
          {summary.nextMilestones.slice(0, 2).map((m) => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.current / m.target) * 100)) : 0;
            return (
              <View key={m.label} style={styles.milestoneRow}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.statLabel}>{m.label}</Text>
                  <Text style={styles.milestoneCount}>
                    {Math.max(0, m.target - m.current)} to go
                  </Text>
                </View>
                <ProgressBar value={pct} />
              </View>
            );
          })}
        </Card>
      )}

      {/* Empty state */}
      {active.length === 0 && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptyHint}>
            Create your first habit to start tracking!
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.empty },
  content: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, backgroundColor: colors.empty, alignItems: "center", justifyContent: "center" },
  card: { marginBottom: 16, padding: 16 },

  // Check-In
  cardTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  checkinRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  checkinInfo: { flex: 1 },
  checkinStreak: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 2 },
  checkinReward: { fontSize: 12, color: "#f59e0b" },
  checkinBtn: { backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  checkinBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Spin
  spinRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  spinInfo: { flex: 1 },
  spinSubtitle: { fontSize: 13, color: colors.muted },
  spinResult: { fontSize: 13, color: "#f59e0b", fontWeight: "600" },
  spinBtn: { backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  spinBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  spinResultBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(99,102,241,0.15)", borderRadius: 12, padding: 12, marginTop: 12,
  },
  spinResultEmoji: { fontSize: 20 },
  spinResultText: { color: "#a5b4fc", fontSize: 14, fontWeight: "600" },

  // Progress
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  statLabel: { fontSize: 14, color: colors.ink },
  statValue: { fontSize: 14, fontWeight: "600", color: colors.accent },
  coinValue: { fontSize: 14, fontWeight: "700", color: "#f59e0b" },
  xpBar: { marginTop: 4, marginBottom: 8 },
  xpBarLabel: { fontSize: 11, color: colors.muted, textAlign: "right", marginTop: 4 },

  // Today's habits
  todayStatsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  todayStat: { flex: 1, backgroundColor: "#1e293b", borderRadius: 12, padding: 12, alignItems: "center" },
  todayStatNum: { fontSize: 22, fontWeight: "700", fontFamily: "monospace" },
  todayStatLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
  statusText: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 8 },

  // Quick stats
  quickStats: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickStat: { backgroundColor: "#1e293b", borderRadius: 14, borderWidth: 1, borderColor: "#334155", padding: 14, alignItems: "center" },
  quickStatNum: { fontSize: 20, fontWeight: "700", fontFamily: "monospace", color: colors.ink },
  quickStatLabel: { fontSize: 10, color: colors.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

  // Reflection
  reflectionInput: {
    borderRadius: 12, borderWidth: 1, borderColor: "#334155", backgroundColor: "#1e293b",
    paddingHorizontal: 14, paddingVertical: 10, color: "#f1f5f9", fontSize: 14,
    textAlignVertical: "top", minHeight: 80, marginBottom: 8,
  },
  saveBtn: { backgroundColor: `${colors.accent}1a`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: colors.accent, fontSize: 12, fontWeight: "600" },

  // Milestones
  milestoneRow: { marginBottom: 16 },
  milestoneHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  milestoneCount: { fontSize: 11, fontFamily: "monospace", color: colors.muted },

  // Empty
  emptyCard: { alignItems: "center", paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: "500", color: colors.ink, marginBottom: 4 },
  emptyHint: { fontSize: 13, color: colors.muted, textAlign: "center" },
});
