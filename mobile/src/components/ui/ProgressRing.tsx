// Mobile ProgressRing — SVG circular progress ring matching web's component.
// Requires `react-native-svg` (available via Expo): `npx expo install react-native-svg`

import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../lib/colors";

interface Props {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  children,
  style,
}: Props) {
  const animValue = useRef(new Animated.Value(0)).current;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct, animValue]);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <AnimatedSvgCircle
        size={size}
        stroke={stroke}
        r={r}
        circumference={circumference}
        animValue={animValue}
      />
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

// Separate component to use Animated for SVG props
function AnimatedSvgCircle({
  size,
  stroke,
  r,
  circumference,
  animValue,
}: {
  size: number;
  stroke: number;
  r: number;
  circumference: number;
  animValue: Animated.Value;
}) {
  const offsetAnim = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <AnimatedSvg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.surface2}
        strokeWidth={stroke}
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colors.accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offsetAnim as any}
      />
    </AnimatedSvg>
  );
}

// Wrapper to allow Animated.createAnimatedComponent with SVG
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
