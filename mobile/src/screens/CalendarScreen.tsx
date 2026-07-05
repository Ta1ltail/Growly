import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

import { dateKey, addDays, dayCompletion, isScheduled, canEditMark, frozenSet, isFrozen, CATEGORY_COLORS, prettyDate, formatTime } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { colors } from "../lib/colors";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function progressColor(rate: number): string {
  if (rate === 0) return "#1e293b";
  if (rate <= 25) return "#f43f5e";
  if (rate <= 50) return "#f59e0b";
  if (rate <= 75) return "#22c55e";
  return "#22c55e";
}

function shade(rate: number): { bg: string; border: string } {
  if (rate === 0) return { bg: "transparent", border: "transparent" };
  if (rate <= 25) return { bg: "rgba(244,63,94,0.15)", border: "rgba(244,63,94,0.3)" };
  if (rate <= 50) return { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" };
  if (rate <= 75) return { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)" };
  return { bg: "rgba(59,130,246,0.2)", border: "rgba(59,130,246,0.4)" };
}

export default function CalendarScreen() {
  const { data } = useAppData();
  const today = new Date();
  const grace = data.settings.graceHours ?? 5;
  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);
  const frozen = useMemo(() => frozenSet(data.economy), [data.economy]);
  const [anchor, setAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const monthCells = useMemo(() => {
    const year = anchor.getFullYear();
    const m = anchor.getMonth();
    const firstWeekday = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) out.push(new Date(year, m, day));
    return out;
  }, [anchor]);

  const selectedKey = dateKey(selected);
  const selectedHabits = useMemo(
    () => active.filter((h) => isScheduled(h, selected)).sort((a, b) => (a.timeOfDay ?? "99") < (b.timeOfDay ?? "99") ? -1 : 1),
    [active, selected],
  );
  const dayNotes = data.notes.filter((n) => n.links.date === selectedKey);
  const deadlines = data.goals.filter((g) => g.deadline === selectedKey);
  const editable = canEditMark(selectedKey, today, grace);
  const selectedIsToday = selectedKey === dateKey(today);

  function shiftMonth(delta: number) {
    setAnchor((p) => new Date(p.getFullYear(), p.getMonth() + delta, 1));
  }

  const headerLabel = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Text style={styles.navText}>←</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{headerLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Text style={styles.navText}>→</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setAnchor(new Date(today.getFullYear(), today.getMonth(), 1))} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={styles.weekdayLabel}>{w}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {monthCells.map((d, i) => {
          if (!d) return <View key={`b-${i}`} style={styles.cell} />;
          const rate = dayCompletion(active, data.marks, d) * 100;
          const isToday = dateKey(d) === dateKey(today);
          const isSelected = dateKey(d) === selectedKey;
          const s = shade(rate);
          return (
            <Pressable
              key={dateKey(d)}
              onPress={() => setSelected(d)}
              style={[
                styles.cell,
                { backgroundColor: s.bg, borderColor: isSelected ? colors.accent : isToday ? `${colors.accent}80` : s.border },
                isSelected && { borderWidth: 2 },
                isToday && !isSelected && { borderWidth: 1 },
              ]}
            >
              <Text style={[styles.dayNum, isToday && { color: colors.accent }]}>{d.getDate()}</Text>
              {rate > 0 && (
                <View style={[styles.dot, { backgroundColor: progressColor(rate) }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Day Detail */}
      <View style={{ marginTop: 20 }}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>
            {selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </Text>
          {selectedIsToday && <Text style={styles.todayBadge}>Today</Text>}
        </View>

        {deadlines.length > 0 && (
          <Card style={{ padding: 12, marginBottom: 8 }}>
            {deadlines.map((g) => (
              <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🏁</Text>
                <Text style={{ color: colors.ink, fontSize: 14, flex: 1 }}>Goal due: {g.title}</Text>
                <Text style={{ color: colors.muted, fontFamily: "monospace", fontSize: 12 }}>{g.current}/{g.target}</Text>
              </View>
            ))}
          </Card>
        )}

        {selectedHabits.length === 0 ? (
          <Card style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>No habits scheduled this day.</Text>
          </Card>
        ) : (
          <Card style={{ overflow: "hidden" }}>
            {selectedHabits.map((h) => {
              const status = data.marks[selectedKey]?.[h.id];
              const dayFrozen = status === "missed" && isFrozen(frozen, h.id, selectedKey);
              const statusIcon = status === "done" ? "✅" : status === "missed" ? (dayFrozen ? "❄️" : "❌") : status === "skipped" ? "➖" : "—";
              return (
                <View
                  key={h.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[h.category] || "#94a3b8" }} />
                  <Text style={{ color: colors.ink, fontSize: 14, flex: 1 }}>{h.name}</Text>
                  {h.timeOfDay && <Text style={{ color: colors.faint, fontFamily: "monospace", fontSize: 11 }}>{formatTime(h.timeOfDay)}</Text>}
                  {!editable && <Text style={{ fontSize: 14 }}>{statusIcon}</Text>}
                </View>
              );
            })}
          </Card>
        )}

        {dayNotes.length > 0 && (
          <Card style={{ padding: 16, marginTop: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>📝 Notes</Text>
            {dayNotes.map((n) => (
              <Text key={n.id} style={{ color: colors.muted, fontSize: 13, fontStyle: "italic", marginBottom: 4 }}>
                "{n.body}"
              </Text>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 8 },
  navBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: "#334155", alignItems: "center", justifyContent: "center" },
  navText: { color: colors.muted, fontSize: 16 },
  monthLabel: { color: colors.ink, fontSize: 16, fontWeight: "700", width: 180 },
  todayBtn: { backgroundColor: `${colors.accent}1a`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  todayBtnText: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  weekdayRow: { flexDirection: "row", marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: "center", color: colors.faint, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "transparent", padding: 2 },
  dayNum: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  detailTitle: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  todayBadge: { backgroundColor: `${colors.accent}26`, color: colors.accent, fontSize: 10, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" },
});
