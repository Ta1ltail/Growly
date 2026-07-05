// Mobile MarkButton — circular toggle cycling none → done → missed → skipped.
// Matches the web's MarkButton with locked and frozen states.
// 44px min touch target wrapped around the visible circle.

import React from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { colors } from "../../lib/colors";
import type { MarkStatus } from "@project101/shared";

interface Props {
  status: MarkStatus | undefined;
  onPress: () => void;
  size?: number;
  locked?: boolean;
  frozen?: boolean;
}

const STATUS_STYLES: Record<MarkStatus, { bg: string; border: string }> = {
  done: { bg: colors.done, border: colors.done },
  missed: { bg: colors.missed, border: colors.missed },
  skipped: { bg: colors.skipped, border: colors.skipped },
};

const STATUS_GLYPH: Record<MarkStatus, string> = {
  done: "✓",
  missed: "✗",
  skipped: "–",
};

export function MarkButton({
  status,
  onPress,
  size = 24,
  locked = false,
  frozen = false,
}: Props) {
  const isInteractive = !locked || !!status;
  const statusStyle = status ? STATUS_STYLES[status] : null;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityLabel={
        locked && !status
          ? "Locked"
          : status
            ? `Marked ${status}`
            : "Not marked"
      }
      accessibilityRole="button"
      style={styles.touchArea}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: statusStyle?.bg ?? colors.surface2,
            borderColor: statusStyle?.border ?? colors.line,
            opacity: locked && !status ? 0.5 : 1,
          },
        ]}
      >
        {status ? (
          <Text style={[styles.glyph, { fontSize: size * 0.45 }]}>
            {STATUS_GLYPH[status]}
          </Text>
        ) : locked ? (
          <Text style={[styles.glyph, { fontSize: size * 0.4, opacity: 0.5 }]}>
            🔒
          </Text>
        ) : null}

        {frozen && (
          <View
            style={[
              styles.freezeBadge,
              {
                width: size * 0.5,
                height: size * 0.5,
                borderRadius: size * 0.25,
              },
            ]}
          >
            <Text style={[styles.freezeIcon, { fontSize: size * 0.28 }]}>
              ❄
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    color: colors.white,
    fontWeight: "700",
  },
  freezeBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  freezeIcon: {
    color: colors.white,
  },
});
