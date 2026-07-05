// Mobile Button — matches the web's Button component with variant/size/press animation.
// Uses Animated API for spring-based scale-down feedback.

import React, { useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Animated,
  type ViewStyle,
  type TextStyle,
  type GestureResponderEvent,
} from "react-native";
import { colors } from "../../lib/colors";

export type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle;
  label?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  onPress,
  disabled,
  style,
  label,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      stiffness: 400,
      damping: 15,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 400,
      damping: 15,
    }).start();
  };

  const containerStyle: ViewStyle[] = [baseStyles.base, variants[variant], sizes[size], style ?? {}];
  const textStyle: TextStyle[] = [baseStyles.text, textVariants[variant], textSizes[size]];

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="button"
        style={({ pressed }) => [
          ...containerStyle,
          pressed && variant === "primary" && { opacity: 0.9 },
          pressed && variant === "soft" && { backgroundColor: colors.accent + "30" },
          disabled && { opacity: 0.5 },
        ]}
      >
        {typeof children === "string" ? (
          <Text style={textStyle}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    </Animated.View>
  );
}

const baseStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    // whiteSpace is handled by Text wrapping
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
});

const variants: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.accent },
  soft: { backgroundColor: colors.accent + "1A" },
  outline: { borderWidth: 1, borderColor: colors.line },
  ghost: {},
  danger: { backgroundColor: colors.missed },
};

const sizes: Record<ButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: 12, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 8 },
  icon: { width: 36, height: 36, padding: 0 },
};

const textVariants: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.white },
  soft: { color: colors.accent },
  outline: { color: colors.muted },
  ghost: { color: colors.muted },
  danger: { color: colors.white },
};

const textSizes: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 12 },
  md: { fontSize: 14 },
  icon: { fontSize: 14 },
};
