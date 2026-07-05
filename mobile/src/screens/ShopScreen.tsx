import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";

import {
  SHOP_ITEMS, FREEZE_PRICE, FREEZE_MAX_PER_WINDOW, FREEZE_WINDOW_DAYS,
  canUseFreeze, freezesUsedInWindow, freezableDays, equippedOrDefault,
  coinBreakdown, summarizeProgress, prettyDate, parseDateKey,
  type CosmeticSlot, type ShopItem,
} from "@project101/shared";
import { useAppData } from "../lib/AppProvider";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { CoinChip } from "../components/economy/CoinChip";
import { colors } from "../lib/colors";

const SLOT_LABEL: Record<CosmeticSlot, string> = { flame: "Streak Flames", confetti: "Confetti Palettes", accent: "Accent Themes" };
const SLOTS: CosmeticSlot[] = ["flame", "confetti", "accent"];

export default function ShopScreen() {
  const { data, actions } = useAppData();
  const today = new Date();
  const summary = useMemo(() => summarizeProgress(data, today), [data, today]);
  const balance = summary.coinBalance;
  const level = summary.level.level;
  const breakdown = useMemo(
    () => coinBreakdown(summary.stats, summary.achievements.filter((a) => a.unlocked).map((a) => a.def.rarity), data.economy),
    [summary.stats, summary.achievements, data.economy],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <PageHeader title="Shop" subtitle="Spend coins earned from your habits" />

      {/* Balance chip */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <CoinChip amount={balance} size="lg" />
      </View>

      {/* Slot sections */}
      {SLOTS.map((slot) => {
        const items = SHOP_ITEMS.filter((i) => i.slot === slot);
        if (items.length === 0) return null;
        const equipped = equippedOrDefault(data.economy, slot);
        return (
          <View key={slot} style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {SLOT_LABEL[slot]}
            </Text>
            {/* Default item */}
            <CosmeticCard
              slot={slot}
              name="Default"
              description="The classic look. Always free."
              preview="#3b82f6"
              equipped={equipped === `${slot}-default`}
              onAction={() => actions.equipCosmetic(slot, `${slot}-default`)}
            />
            {items.map((item) => (
              <CosmeticCard
                key={item.id}
                slot={slot}
                item={item}
                owned={data.economy.owned.includes(item.id)}
                equipped={equipped === item.id}
                affordable={balance >= item.price}
                levelOk={!item.minLevel || level >= item.minLevel}
                onAction={() => {
                  if (data.economy.owned.includes(item.id)) actions.equipCosmetic(slot, item.id);
                  else actions.buyCosmetic(item.id);
                }}
              />
            ))}
          </View>
        );
      })}

      {/* Streak Freeze section */}
      <FreezeSection balance={balance} />
    </ScrollView>
  );
}

function CosmeticCard({
  slot, item, owned = false, equipped = false, affordable = false, levelOk = true,
  name, description, preview, onAction,
}: {
  slot: CosmeticSlot;
  item?: ShopItem;
  owned?: boolean;
  equipped?: boolean;
  affordable?: boolean;
  levelOk?: boolean;
  name?: string;
  description?: string;
  preview?: string;
  onAction: () => void;
}) {
  const displayName = name ?? item!.name;
  const displayDesc = description ?? item!.description;
  const displayPreview = preview ?? item!.preview;
  const canEquip = name !== undefined || owned;

  return (
    <Card style={{ padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: displayPreview } as any} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>{displayName}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{displayDesc}</Text>
        </View>
        {canEquip ? (
          equipped ? (
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>✅ Equipped</Text>
          ) : (
            <Pressable onPress={onAction} style={{ backgroundColor: `${colors.accent}1a`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>Equip</Text>
            </Pressable>
          )
        ) : !levelOk ? (
          <Text style={{ color: colors.faint, fontSize: 11 }}>🔒 Lv {item!.minLevel}</Text>
        ) : (
          <View>
            {item && <CoinChip amount={item.price} size="sm" />}
            <Pressable onPress={onAction} disabled={!affordable} style={{ marginTop: 4, backgroundColor: affordable ? colors.accent : "#334155", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" }}>{affordable ? "Buy" : "Not enough"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}

function FreezeSection({ balance }: { balance: number }) {
  const { data, actions } = useAppData();
  const today = new Date();
  const [habitId, setHabitId] = useState<string>("");

  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);
  const allowed = canUseFreeze(data.economy, today);
  const usedInWindow = freezesUsedInWindow(data.economy, today);
  const affordable = balance >= FREEZE_PRICE;
  const days = useMemo(() => (habitId ? freezableDays(data.economy, data.marks, habitId, today) : []), [habitId, data.economy, data.marks, today]);

  return (
    <View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Consumables</Text>
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <Text style={{ fontSize: 28 }}>❄️</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "600" }}>Streak Freeze</Text>
              <CoinChip amount={FREEZE_PRICE} size="sm" />
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              Protect one past missed day so it doesn't break your streak. Limited to {FREEZE_MAX_PER_WINDOW} per {FREEZE_WINDOW_DAYS} days.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <Pressable onPress={() => setHabitId("")} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: habitId === "" ? `${colors.accent}4d` : "#334155", backgroundColor: habitId === "" ? `${colors.accent}1a` : "transparent" }}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Choose habit…</Text>
                </Pressable>
                {active.map((h) => (
                  <Pressable key={h.id} onPress={() => setHabitId(h.id)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: habitId === h.id ? `${colors.accent}4d` : "#334155", backgroundColor: habitId === h.id ? `${colors.accent}1a` : "transparent" }}>
                    <Text style={{ color: habitId === h.id ? colors.accent : colors.muted, fontSize: 11 }}>{h.name}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {habitId && days.length === 0 && <Text style={{ color: colors.faint, fontSize: 11, marginTop: 4 }}>No eligible missed days.</Text>}
            {habitId && days.map((key) => (
              <Pressable
                key={key}
                onPress={() => { actions.redeemFreeze(habitId, key); setHabitId(""); }}
                disabled={!allowed || !affordable}
                style={{ marginTop: 4, backgroundColor: allowed && affordable ? colors.accent : "#334155", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: "flex-start" }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>❄️ Freeze {prettyDate(parseDateKey(key))}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
});
