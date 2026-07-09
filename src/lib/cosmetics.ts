// Avatar/banner resolvers. `avatar` is a preset id (emoji) or data: URL.
// `banner` is a preset id that resolves to a CSS gradient.
// Both fall back to the first preset so a profile always has a valid look.

export interface AvatarPreset {
  id: string;
  glyph: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "rocket", glyph: "🚀" },
  { id: "fox", glyph: "🦊" },
  { id: "owl", glyph: "🦉" },
  { id: "wolf", glyph: "🐺" },
  { id: "fire", glyph: "🔥" },
  { id: "bolt", glyph: "⚡" },
  { id: "star", glyph: "⭐" },
  { id: "brain", glyph: "🧠" },
  { id: "ninja", glyph: "🥷" },
  { id: "crown", glyph: "👑" },
  { id: "dragon", glyph: "🐉" },
  { id: "diamond", glyph: "💎" },
];

export interface BannerPreset {
  id: string;
  gradient: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  { id: "aurora", gradient: "linear-gradient(120deg,#4b8bf7,#7c3aed,#22d3ee)" },
  { id: "sunset", gradient: "linear-gradient(120deg,#f59e0b,#f43f5e,#7c3aed)" },
  { id: "forest", gradient: "linear-gradient(120deg,#059669,#0ea5e9)" },
  { id: "ember", gradient: "linear-gradient(120deg,#f43f5e,#f59e0b)" },
  {
    id: "midnight",
    gradient: "linear-gradient(120deg,#1e293b,#334155,#0ea5e9)",
  },
  { id: "candy", gradient: "linear-gradient(120deg,#ec4899,#8b5cf6,#22d3ee)" },
];

export type ResolvedAvatar =
  | { kind: "image"; src: string }
  | { kind: "glyph"; glyph: string };

export function resolveAvatar(avatar: string | undefined): ResolvedAvatar {
  if (avatar && avatar.startsWith("data:"))
    return { kind: "image", src: avatar };
  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  return { kind: "glyph", glyph: (preset ?? AVATAR_PRESETS[0]).glyph };
}

export function resolveBanner(banner: string | undefined): string {
  const preset = BANNER_PRESETS.find((p) => p.id === banner);
  return (preset ?? BANNER_PRESETS[0]).gradient;
}
