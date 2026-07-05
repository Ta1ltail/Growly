// CelebrationOverlay — full-screen modal for achievements, level-ups, streak
// milestones, title unlocks, and shop unlocks. Queues multiple events and
// shows confetti for legendary achievements.
//
// Integrates with AppProvider via buildCelebrationQueue + acknowledgeCelebration.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { buildCelebrationQueue } from "@project101/shared";
import { useAppData } from "../../lib/AppProvider";
import { colors } from "../../lib/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function seed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

/// Confetti burst for legendary achievements — pieces animate from top
/// of screen downward with rotation using Animated API.
function ConfettiBurst({ accent }: { accent: string; glow: string }) {
  const animValues = useMemo(() => {
    const s = seed(accent);
    let a = s;
    const rand = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return Array.from({ length: 30 }, () => {
      const translateY = new Animated.Value(-50);
      const rotate = new Animated.Value(0);
      return {
        translateY,
        rotate,
        left: rand() * 100,
        delay: rand() * 0.4,
        duration: 1.5 + rand() * 1.5,
        size: 4 + Math.round(rand() * 6),
        color: [accent, "#fff", "#fbbf24", "#22d3ee"][Math.floor(rand() * 4)],
      };
    });
  }, [accent]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    animValues.forEach((v) => {
      Animated.parallel([
        Animated.timing(v.translateY, {
          toValue: Math.random() * 600 + 200,
          duration: v.duration * 1000,
          delay: v.delay * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(v.rotate, {
          toValue: 1,
          duration: v.duration * 1000,
          delay: v.delay * 1000,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [animValues]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {animValues.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: `${v.left}%`,
            width: v.size,
            height: v.size * 1.4,
            backgroundColor: v.color,
            borderRadius: i % 2 === 0 ? 9999 : 1,
            opacity: 0.9,
            transform: [
              { translateY: v.translateY },
              {
                rotate: v.rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${360 + i * 45}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

export function CelebrationOverlay() {
  const { data, actions } = useAppData();
  const today = useMemo(() => new Date(), []);

  const queue = useMemo(
    () => buildCelebrationQueue(data, today),
    [data, today],
  );

  const [index, setIndex] = useState(0);
  const event = queue[index];
  const visible = event != null;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  function dismiss() {
    if (!event) return;
    actions.acknowledgeCelebration(event);
    if (index < queue.length - 1) {
      setIndex(index + 1);
    } else {
      setIndex(0);
    }
  }

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Glow */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: event.glow,
          },
        ]}
      />

      {event.confetti && (
        <ConfettiBurst accent={event.accent} glow={event.glow} />
      )}

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: event.accent }]}>
          {event.eyebrow}
        </Text>

        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconBg,
              {
                backgroundColor: `${event.accent}1f`,
              },
            ]}
          >
            {event.badgeDef ? (
              <Text style={{ fontSize: 48 }}>{event.badgeDef.icon}</Text>
            ) : (
              <Text style={{ fontSize: 48 }}>{event.emoji}</Text>
            )}
          </View>
        </View>

        <Text style={styles.name}>{event.name}</Text>
        <Text style={styles.description}>{event.description}</Text>

        {event.reward && (
          <View style={styles.rewardRow}>
            {event.reward.split("·").map((part, i) => {
              const text = part.replace("🪙", "").trim();
              return (
                <View
                  key={i}
                  style={[styles.rewardChip, { backgroundColor: `${event.accent}1f` }]}
                >
                  <Text style={[styles.rewardText, { color: event.accent }]}>
                    {text}
                    {part.includes("🪙") ? " 🪙" : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {queue.length > 1 && (
          <View style={styles.progressRow}>
            {Array.from({ length: queue.length }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      i === index
                        ? event.accent
                        : i < index
                          ? `${event.accent}40`
                          : colors.line,
                    width: i === index ? 16 : 6,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={dismiss}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: event.accent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.buttonText}>
            {queue.length > 1 && index < queue.length - 1
              ? "Next →"
              : "Awesome!"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
    top: SCREEN_H * 0.3,
    left: SCREEN_W * 0.5 - 100,
  },
  card: {
    width: Math.min(320, SCREEN_W - 32),
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 28,
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconBg: {
    width: 88,
    height: 88,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  rewardRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  rewardChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 20,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
