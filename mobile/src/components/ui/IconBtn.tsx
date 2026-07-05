// Mobile IconBtn — small icon button with WCAG-compliant touch target (44px).
// Matches the web's IconBtn with danger variant and scale animation.

import React, { useRef } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Animated,
  type ViewStyle,
} from "react-native";
import { colors } from "../../lib/colors";

interface Props {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
  style?: ViewStyle;
}

export function IconBtn({ children, label, onPress, danger, style }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={styles.touchArea}
    >
      <Animated.View
        style={[
          styles.container,
          danger && styles.danger,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        {children}
      </Animated.View>
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
  container: {
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  danger: {
    backgroundColor: colors.missed + "1A",
  },
});
