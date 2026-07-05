// Mobile ProgressBar — thin animated progress bar matching web's component.
// Uses Animated API for a smooth width transition.

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, type ViewStyle } from "react-native";
import { colors } from "../../lib/colors";

interface Props {
  value: number; // 0–100
  color?: string;
  style?: ViewStyle;
}

export function ProgressBar({ value, color, style }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(100, value));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clamped,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [clamped, widthAnim]);

  return (
    <View style={[styles.track, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
            backgroundColor: color ?? colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: "100%",
    borderRadius: 9999,
    backgroundColor: colors.surface2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 9999,
  },
});
