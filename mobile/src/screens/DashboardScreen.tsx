// DashboardScreen — at-a-glance command center: today's progress, momentum
// stats, smart insights, and next milestones.

import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  summarizeProgress,
  dateKey,
  consistencyScore,
  dayCompletion,
  habitStreaks,
  isScheduled,
  lastNDaysCompletion,
  buildInsights,
  frozenSet,
} from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { colors } from "../lib/colors";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ProgressRing } from "../components/ui/ProgressRing";
import { TrendBars } from "../components/ui/TrendBars";

export default function DashboardScreen() {
  const { data, isLoading } = useAppData();
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const active = useMemo(
    () => data.habits.filter((h) => !h.archived),
    [data.habits],
  );

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
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);

  const streaks = useMemo(() => {
    let best = 0,
      current = 0;
    for (const h of active) {
      const s = habitStreaks(h, data.marks, today, frozen);
      best = Math.max(best, s.best);
      current = Math.max(current, s.current);
    }
    return { best, current };
  }, [active, data.marks, today, frozen]);

  const insights = useMemo(
    () => buildInsights(active, data.marks, today),
    [active, data.marks, today],
  );

  const summary = useMemo(
    () => summarizeProgress(data, today),
    [data, today],
  );

  // Weekly trend
  const weekData = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, 7),
    [active, data.marks, today],
  );
  const weekAvg = weekData.length
    ? Math.round(
        weekData.reduce((s, d) => s + d.rate, 0) / weekData.length,
      )
    : 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title="Dashboard"
        subtitle="Your habits at a glance"
      />

      {/* Today's Progress */}
      <Card style={styles.card}>
        <View style={styles.todayRow}>
          <ProgressRing value={progress} size={56} stroke={7}>
            <Text style={styles.ringText}>{progress}%</Text>
          </ProgressRing>
          <View style={styles.todayInfo}>
            <Text style={styles.sectionLabel}>Today</Text>
            <Text style={styles.dateText}>
              {today.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.timeText}>
              {today.getHours() < 12
                ? "☀️ Morning"
                : today.getHours() < 17
                  ? "🌤️ Afternoon"
                  : "🌙 Evening"}
              {" · "}
              {24 - today.getHours() - 1}h left
            </Text>
          </View>
        </View>
        <View style={styles.todayStats}>
          <View style={styles.todayStat}>
            <Text style={styles.todayStatLabel}>Done</Text>
            <Text style={[styles.todayStatValue, { color: colors.done }]}>
              {doneToday}
            </Text>
          </View>
          <View style={styles.todayStat}>
            <Text style={styles.todayStatLabel}>Remaining</Text>
            <Text style={[styles.todayStatValue, { color: "#f59e0b" }]}>
              {todaysHabits.length - doneToday}
            </Text>
          </View>
          <View style={styles.todayStat}>
            <Text style={styles.todayStatLabel}>Total</Text>
            <Text style={styles.todayStatValue}>{todaysHabits.length}</Text>
          </View>
        </View>
        <Text style={styles.statusText}>
          {todaysHabits.length - doneToday > 0
            ? `${todaysHabits.length - doneToday} habit${todaysHabits.length - doneToday !== 1 ? "s" : ""} remaining`
            : "🎉 All done!"}
        </Text>
      </Card>

      {/* Stat Cards Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon={<Text style={{ fontSize: 18 }}>📊</Text>}
          value={`${consistency}%`}
          label="14-day consistency"
          accent
          style={{ flex: 1 }}
        />
        <StatCard
          icon={<Text style={{ fontSize: 18 }}>🔥</Text>}
          value={streaks.current}
          label="Current streak"
          style={{ flex: 1 }}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          icon={<Text style={{ fontSize: 18 }}>📈</Text>}
          value={streaks.best}
          label="Best streak"
          style={{ flex: 1 }}
        />
        <StatCard
          icon={<Text style={{ fontSize: 18 }}>✅</Text>}
          value={active.length}
          label="Active habits"
          style={{ flex: 1 }}
        />
      </View>

      {/* Progress Section */}
      <Text style={styles.sectionTitle}>Your Progress</Text>

      {/* XP & Level */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Level {summary.level.level}</Text>
        <Text style={styles.cardSubtitle}>
          {summary.title.current.name}
        </Text>
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>XP</Text>
          <Text style={styles.xpValue}>{summary.xp.toLocaleString()}</Text>
        </View>
        {!summary.level.isMax && (
          <View style={styles.xpBarSection}>
            <ProgressBar value={summary.level.progressPct} />
            <Text style={styles.xpBarLabel}>
              {summary.level.xpIntoLevel.toLocaleString()} /{" "}
              {summary.level.xpForNext.toLocaleString()}
            </Text>
          </View>
        )}
      </Card>

      {/* Coin Balance + Badge Count */}
      <View style={styles.statsGrid}>
        <Card style={{ flex: 1, padding: 14 }}>
          <Text style={styles.smallLabel}>Coins</Text>
          <Text style={styles.bigValue}>{summary.coinBalance.toLocaleString()}</Text>
        </Card>
        <Card style={{ flex: 1, padding: 14 }}>
          <Text style={styles.smallLabel}>Badges</Text>
          <Text style={styles.bigValue}>
            {summary.unlockedCount}/{summary.totalCount}
          </Text>
          <ProgressBar
            value={
              summary.totalCount
                ? Math.round(
                    (summary.unlockedCount / summary.totalCount) * 100,
                  )
                : 0
            }
            style={{ marginTop: 6 }}
          />
        </Card>
      </View>

      {/* Next Milestones */}
      {summary.nextMilestones.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Next Milestones</Text>
          {summary.nextMilestones.slice(0, 2).map((m) => {
            const pct =
              m.target > 0
                ? Math.min(100, Math.round((m.current / m.target) * 100))
                : 0;
            return (
              <View key={m.label} style={styles.milestoneRow}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneLabel}>{m.label}</Text>
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

      {/* Weekly Trend */}
      {weekData.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.trendHeader}>
            <Text style={styles.cardTitle}>Weekly Trend</Text>
            <Text style={styles.trendAvg}>{weekAvg}% avg</Text>
          </View>
          <TrendBars data={weekData} height={100} />
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Insights</Text>
          {insights.map((ins, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                ins.tone === "good" && styles.insightGood,
                ins.tone === "warn" && styles.insightWarn,
              ]}
            >
              <Text
                style={[
                  styles.insightText,
                  ins.tone === "good" && { color: colors.done },
                  ins.tone === "warn" && { color: colors.skipped },
                ]}
              >
                {ins.text}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.empty,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.empty,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  todayInfo: {
    flex: 1,
  },
  ringText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    fontFamily: "monospace",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
  },
  dateText: {
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  todayStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  todayStat: {
    flex: 1,
    backgroundColor: colors.surface2 + "80",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  todayStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
  },
  todayStatValue: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "monospace",
    color: colors.ink,
  },
  statusText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 12,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.accent,
    marginBottom: 12,
  },
  xpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 14,
    color: colors.ink,
  },
  xpValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
    fontFamily: "monospace",
  },
  xpBarSection: {
    marginTop: 4,
  },
  xpBarLabel: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "right",
    marginTop: 4,
    fontFamily: "monospace",
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 4,
  },
  bigValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    fontFamily: "monospace",
  },
  milestoneRow: {
    marginBottom: 14,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  milestoneLabel: {
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  milestoneCount: {
    fontSize: 11,
    fontFamily: "monospace",
    color: colors.muted,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  trendAvg: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    fontFamily: "monospace",
  },
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.surface + "80",
  },
  insightGood: {
    borderColor: colors.done + "40",
  },
  insightWarn: {
    borderColor: colors.skipped + "40",
  },
  insightText: {
    fontSize: 13,
    color: colors.accent,
    lineHeight: 18,
  },
});
