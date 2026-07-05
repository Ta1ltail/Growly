// Mobile Card — matches the web's Card component with rounded corners,
// border, optional interactive (press scale), and glow.

import React, { useRef } from "react";
import { StyleSheet, View, Animated, Pressable, type ViewStyle } from "react-native";
import { colors } from "../../lib/colors";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  interactive?: boolean;
  glow?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, interactive, glow, onPress }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!interactive) return;
    Animated.spring(scaleAnim, {
      toValue: 1.015,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  const handlePressOut = () => {
    if (!interactive) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  const cardStyle: ViewStyle[] = [styles.card];
  if (glow) cardStyle.push(styles.glow);
  if (interactive) cardStyle.push(styles.interactive);
  if (style) cardStyle.push(style);

  const cardContent = (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      {interactive && onPress ? (
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardStyle}
        >
          {children}
        </Pressable>
      ) : (
        <View style={cardStyle}>{children}</View>
      )}
    </Animated.View>
  );

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface + "CC",
    padding: 16,
  },
  glow: {
    shadowColor: colors.accentGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  interactive: {},
});
