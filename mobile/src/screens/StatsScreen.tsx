// StatsScreen — meaningful analytics: completion, streaks, consistency,
// per-category and per-weekday breakdowns, plain-language insights, and
// habit correlations.

import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import {
  addDays,
  CATEGORY_COLORS,
  rangeCompletion,
  lastNDaysCompletion,
  categoryCompletion,
  completionByWeekday,
  consistencyScore,
  buildInsights,
  habitStreaks,
  habitCorrelations,
  frozenSet,
  WEEKDAY_SHORT,
  weeklyProjection,
  summarizeProgress,
} from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { colors } from "../lib/colors";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { ProgressBar } from "../components/ui/ProgressBar";
import { TrendBars } from "../components/ui/TrendBars";

const PERIODS = [
  { value: 7, label: "Week" },
  { value: 30, label: "Month" },
  { value: 90, label: "90 days" },
];

export default function StatsScreen() {
  const { data, isLoading } = useAppData();
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState(30);

  const active = useMemo(
    () => data.habits.filter((h) => !h.archived),
    [data.habits],
  );

  const from = useMemo(() => addDays(today, -(period - 1)), [today, period]);

  const range = useMemo(
    () => rangeCompletion(active, data.marks, from, today),
    [active, data.marks, from, today],
  );

  const chartData = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, Math.min(period, 14)),
    [active, data.marks, today, period],
  );

  const byCategory = useMemo(
    () => categoryCompletion(active, data.marks, from, today),
    [active, data.marks, from, today],
  );

  const topCategories = useMemo(
    () => [...byCategory].sort((a, b) => b.rate - a.rate),
    [byCategory],
  );

  const week7 = useMemo(
    () => lastNDaysCompletion(active, data.marks, today, 7),
    [active, data.marks, today],
  );

  const byWeekday = useMemo(
    () => completionByWeekday(active, data.marks, today, period),
    [active, data.marks, today, period],
  );

  const consistency = useMemo(
    () => consistencyScore(active, data.marks, today, period),
    [active, data.marks, today, period],
  );

  const insights = useMemo(
    () => buildInsights(active, data.marks, today),
    [active, data.marks, today],
  );

  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const correlations = useMemo(
    () => habitCorrelations(active, data.marks),
    [active, data.marks],
  );

  // Prediction engine
  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const xpPerDay = useMemo(() => {
    if (active.length === 0 || summary.xp === 0) return 0;
    const firstDate = active.reduce((earliest, h) => {
      const d = new Date(h.createdAt);
      return d < earliest ? d : earliest;
    }, new Date());
    const daysElapsed = Math.max(
      1,
      Math.round((today.getTime() - firstDate.getTime()) / 86400000),
    );
    return Math.round(summary.xp / daysElapsed);
  }, [active, summary.xp, today]);

  const projection = useMemo(
    () =>
      weeklyProjection(
        active,
        data.marks,
        today,
        xpPerDay,
        summary.level.xpForNext - summary.level.xpIntoLevel,
      ),
    [active, data.marks, today, xpPerDay, summary.level],
  );

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const trendIcon =
    projection.trend === "up"
      ? "📈"
      : projection.trend === "down"
        ? "📉"
        : "➡️";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title="Statistics"
        subtitle="Your progress over time"
      />

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.value}
            onPress={() => setPeriod(p.value)}
            style={[
              styles.periodBtn,
              period === p.value && styles.periodActive,
            ]}
          >
            <Text
              style={[
                styles.periodText,
                period === p.value && styles.periodTextActive,
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {active.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyHint}>
            Add and mark some habits to unlock your stats.
          </Text>
        </Card>
      ) : (
        <>
          {/* Stat Cards */}
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Text style={{ fontSize: 18 }}>🎯</Text>}
              value={`${range.rate}%`}
              label="Completion"
              accent
              style={{ flex: 1 }}
            />
            <StatCard
              icon={<Text style={{ fontSize: 18 }}>📊</Text>}
              value={`${consistency}%`}
              label="Consistency"
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Text style={{ fontSize: 18 }}>✅</Text>}
              value={range.done}
              label="Done"
              style={{ flex: 1 }}
            />
            <StatCard
              icon={<Text style={{ fontSize: 18 }}>🔥</Text>}
              value={streaks.best}
              label="Best streak"
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Text style={{ fontSize: 18 }}>🔥</Text>}
              value={streaks.current}
              label="Current streak"
              style={{ flex: 1 }}
            />
            <StatCard
              icon={<Text style={{ fontSize: 18 }}>📈</Text>}
              value={`${xpPerDay}`}
              label="XP/day"
              style={{ flex: 1 }}
            />
          </View>

          {/* Insights */}
          {insights.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>✨ Insights</Text>
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

          {/* Projection */}
          <Text style={styles.sectionTitle}>📡 Projection</Text>
          <View style={styles.projectionGrid}>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={styles.projLabel}>Estimated completion</Text>
              <Text style={styles.projValue}>
                {projection.estimatedCompletion}%
              </Text>
              <Text style={styles.projTrend}>
                {trendIcon} {projection.trend}
              </Text>
            </Card>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={styles.projLabel}>Projected streak</Text>
              <Text style={styles.projValue}>
                {projection.estimatedStreak}d
              </Text>
              <Text style={styles.projSub}>In the next 7 days</Text>
            </Card>
          </View>
          <View style={styles.projectionGrid}>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={styles.projLabel}>XP per day</Text>
              <Text style={styles.projValue}>{xpPerDay}</Text>
              <Text style={styles.projSub}>Average</Text>
            </Card>
            <Card style={{ flex: 1, padding: 14 }}>
              <Text style={styles.projLabel}>Next level</Text>
              <Text style={styles.projValue}>
                {projection.estimatedDaysToNextLevel != null
                  ? `${projection.estimatedDaysToNextLevel}d`
                  : "—"}
              </Text>
              <Text style={styles.projSub}>At current pace</Text>
            </Card>
          </View>

          {/* Recent Trends */}
          <Text style={styles.sectionTitle}>Recent Trends</Text>
          {chartData.length > 0 && (
            <Card style={styles.card}>
              <TrendBars data={chartData} height={140} />
            </Card>
          )}

          {/* Last 7 Days */}
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          {week7.length > 0 && (
            <Card style={styles.card}>
              <TrendBars data={week7} height={120} />
            </Card>
          )}

          {/* Top Categories */}
          <Text style={styles.sectionTitle}>Top Categories</Text>
          <Card style={styles.card}>
            {topCategories.length === 0 ? (
              <Text style={styles.mutedText}>
                Complete some habits to see category breakdowns.
              </Text>
            ) : (
              topCategories.map(({ category, rate }) => {
                const catColor =
                  CATEGORY_COLORS[
                    category as keyof typeof CATEGORY_COLORS
                  ] ?? colors.accent;
                return (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLabel}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: catColor },
                          ]}
                        />
                        <Text style={styles.categoryName}>{category}</Text>
                      </View>
                      <Text style={styles.categoryRate}>{rate}%</Text>
                    </View>
                    <ProgressBar value={rate} color={catColor} />
                  </View>
                );
              })
            )}
          </Card>

          {/* By Weekday */}
          <Text style={styles.sectionTitle}>By Weekday</Text>
          <Card style={styles.card}>
            {byWeekday.map(({ weekday, rate }) => (
              <View key={weekday} style={styles.weekdayRow}>
                <Text style={styles.weekdayLabel}>
                  {WEEKDAY_SHORT[weekday]}
                </Text>
                <View style={styles.weekdayBar}>
                  <ProgressBar value={rate} />
                </View>
                <Text style={styles.weekdayRate}>{rate}%</Text>
              </View>
            ))}
          </Card>

          {/* Habit Correlations */}
          {correlations.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🔗 Habit Correlations</Text>
              <Card style={styles.card}>
                <Text style={styles.corrHint}>
                  Habits you tend to complete together. Higher strength = when you
                  do one, you almost always do the other.
                </Text>
                {correlations.slice(0, 6).map((pair) => (
                  <View key={`${pair.habitA.id}-${pair.habitB.id}`}>
                    <View style={styles.corrRow}>
                      <View style={styles.corrInfo}>
                        <Text style={styles.corrHabits}>
                          {pair.habitA.name}
                          <Text style={styles.corrPlus}> + </Text>
                          {pair.habitB.name}
                        </Text>
                        <Text style={styles.corrDays}>
                          {pair.bothDone} of {pair.totalShared} days together
                        </Text>
                      </View>
                      <View style={styles.corrStrength}>
                        <Text style={styles.corrStrengthValue}>
                          {pair.strength}%
                        </Text>
                        <Text style={styles.corrStrengthLabel}>strength</Text>
                      </View>
                    </View>
                    {correlations.indexOf(pair) <
                      Math.min(correlations.length - 1, 5) && (
                      <View style={styles.corrDivider} />
                    )}
                  </View>
                ))}
              </Card>
            </>
          )}
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
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  periodRow: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    padding: 4,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  periodBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  periodActive: {
    backgroundColor: colors.accent,
  },
  periodText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  periodTextActive: {
    color: colors.white,
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
  projectionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  projLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  projValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    fontFamily: "monospace",
  },
  projTrend: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textTransform: "capitalize",
  },
  projSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
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
  categoryRow: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink,
  },
  categoryRate: {
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.muted,
  },
  weekdayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  weekdayLabel: {
    width: 36,
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.muted,
  },
  weekdayBar: {
    flex: 1,
  },
  weekdayRate: {
    width: 36,
    fontSize: 12,
    fontFamily: "monospace",
    color: colors.muted,
    textAlign: "right",
  },
  mutedText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
  },
  corrHint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 16,
  },
  corrRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  corrInfo: {
    flex: 1,
  },
  corrHabits: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink,
  },
  corrPlus: {
    color: colors.faint,
  },
  corrDays: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  corrStrength: {
    alignItems: "center",
    marginLeft: 12,
  },
  corrStrengthValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent,
    fontFamily: "monospace",
  },
  corrStrengthLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  corrDivider: {
    height: 1,
    backgroundColor: colors.line,
    opacity: 0.5,
  },
});
