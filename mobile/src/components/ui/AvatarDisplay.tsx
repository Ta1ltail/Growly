// Mobile AvatarDisplay — glyph or image avatar, matching web's component.
// Uses resolveAvatar from @project101/shared cosmetics.

import React from "react";
import { StyleSheet, View, Text, Image, type ViewStyle } from "react-native";
import { resolveAvatar } from "@project101/shared";
import { colors } from "../../lib/colors";

interface Props {
  avatar: string | null | undefined;
  size?: number;
  style?: ViewStyle;
}

export function AvatarDisplay({ avatar, size = 36, style }: Props) {
  const resolved = resolveAvatar(avatar ?? undefined);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  };

  if (resolved.kind === "image") {
    return (
      <View style={[styles.imageContainer, containerStyle]}>
        <Image
          source={{ uri: resolved.src }}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View style={[styles.glyphContainer, containerStyle]}>
      <Text style={[styles.glyph, { fontSize: size * 0.45 }]}>
        {resolved.glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  glyphContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
  },
  glyph: {
    textAlign: "center",
  },
});
