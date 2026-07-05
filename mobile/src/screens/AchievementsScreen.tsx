import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

import { CATEGORIES, RARITY_ORDER, RARITY_LABEL, RARITY_STYLE, type AchievementCategory, type Rarity, summarizeProgress } from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { ProgressBar } from "../components/ui/ProgressBar";
import { PageHeader } from "../components/ui/PageHeader";
import { colors } from "../lib/colors";

const CATEGORY_OPTS: { value: AchievementCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "streak", label: "Streak" },
  { value: "completion", label: "Completion" },
  { value: "consistency", label: "Consistency" },
  { value: "category", label: "Category" },
  { value: "special", label: "Special" },
];

export default function AchievementsScreen() {
  const { data } = useAppData();
  const today = new Date();
  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [status, setStatus] = useState<"all" | "unlocked" | "locked">("all");
  const [query, setQuery] = useState("");

  const rarityCounts = useMemo(() => {
    const counts: Record<Rarity, { unlocked: number; total: number }> = {
      common: { unlocked: 0, total: 0 },
      rare: { unlocked: 0, total: 0 },
      epic: { unlocked: 0, total: 0 },
      legendary: { unlocked: 0, total: 0 },
    };
    for (const a of summary.achievements) {
      counts[a.def.rarity].total += 1;
      if (a.unlocked) counts[a.def.rarity].unlocked += 1;
    }
    return counts;
  }, [summary.achievements]);

  const nextAchievable = useMemo(() => {
    return summary.achievements
      .filter((a) => !a.unlocked && a.progressPct > 0)
      .sort((a, b) => b.progressPct - a.progressPct)
      .slice(0, 3);
  }, [summary.achievements]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summary.achievements
      .filter((a) => category === "all" || a.def.category === category)
      .filter((a) => status === "all" || (status === "unlocked" ? a.unlocked : !a.unlocked))
      .filter((a) => !q || a.def.name.toLowerCase().includes(q) || a.def.description.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        const r = RARITY_ORDER[b.def.rarity] - RARITY_ORDER[a.def.rarity];
        if (r !== 0) return r;
        return b.progressPct - a.progressPct;
      });
  }, [summary.achievements, category, status, query]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Achievements" subtitle={`${summary.unlockedCount} of ${summary.totalCount} unlocked`} />

      {/* Rarity summary */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {(Object.keys(RARITY_STYLE) as Rarity[]).map((rarity) => {
          const c = rarityCounts[rarity];
          const r = RARITY_STYLE[rarity];
          const pct = c.total ? Math.round((c.unlocked / c.total) * 100) : 0;
          return (
            <Card key={rarity} style={{ flex: 1, padding: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 18 }}>{r.medal}</Text>
                <Text style={{ color: colors.faint, fontFamily: "monospace", fontSize: 13, fontWeight: "700" }}>{c.unlocked}/{c.total}</Text>
              </View>
              <Text style={{ color: r.accent, fontSize: 11, fontWeight: "700", marginTop: 4 }}>{RARITY_LABEL[rarity]}</Text>
              <ProgressBar value={pct} color={r.accent} />
            </Card>
          );
        })}
      </View>

      {/* Next achievable */}
      {nextAchievable.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>📈 Next achievable</Text>
          {nextAchievable.map((a) => {
            const r = RARITY_STYLE[a.def.rarity];
            return (
              <Card key={a.def.id} style={{ padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 28 }}>{a.def.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>{a.def.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>{a.def.description}</Text>
                    <ProgressBar value={a.progressPct} color={r.accent} />
                  </View>
                  <Text style={{ color: r.accent, fontFamily: "monospace", fontSize: 12, fontWeight: "700" }}>{a.progressPct}%</Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Filters */}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search achievements…"
        placeholderTextColor={colors.faint}
        style={styles.searchInput}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {CATEGORY_OPTS.map((c) => (
            <FilterChip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(c.value)} />
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[{ value: "all" as const, label: "All" }, { value: "unlocked" as const, label: "Unlocked" }, { value: "locked" as const, label: "Locked" }].map((c) => (
            <FilterChip key={c.value} label={c.label} active={status === c.value} onPress={() => setStatus(c.value)} />
          ))}
        </View>
      </ScrollView>

      {/* Grid */}
      {visible.length === 0 ? (
        <Card style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>No achievements match your filters.</Text>
        </Card>
      ) : (
        visible.map((a) => {
          const r = RARITY_STYLE[a.def.rarity];
          return (
            <Card key={a.def.id} style={{ padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Text style={{ fontSize: 32 }}>{a.def.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{a.def.name}</Text>
                    <Text style={{ color: r.accent, backgroundColor: `${r.accent}1a`, fontSize: 10, fontWeight: "700", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: "hidden" }}>
                      {RARITY_LABEL[a.def.rarity]}
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{a.def.description}</Text>
                  {a.unlocked ? (
                    <Text style={{ color: "#10b981", fontSize: 12, fontWeight: "600", marginTop: 4 }}>✅ Unlocked</Text>
                  ) : (
                    <View style={{ marginTop: 4 }}>
                      <ProgressBar value={a.progressPct} color={r.accent} />
                      <Text style={{ color: colors.faint, fontFamily: "monospace", fontSize: 11, marginTop: 2 }}>{a.current}/{a.target}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: active ? `${colors.accent}4d` : "#334155", backgroundColor: active ? `${colors.accent}1a` : "transparent" }}
    >
      <Text style={{ color: active ? colors.accent : colors.muted, fontSize: 12, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f1f5f9",
    fontSize: 14,
  },
});
