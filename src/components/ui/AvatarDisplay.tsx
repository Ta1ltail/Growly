// Small inline avatar – glyph or image fallback.
// Used in friends, leaderboard, and other list views.

import { resolveAvatar } from "@/lib/cosmetics";

interface Props {
  avatar: string | null | undefined;
  size?: number;
}

export function AvatarDisplay({ avatar, size = 36 }: Props) {
  const resolved = resolveAvatar(avatar ?? undefined);
  if (resolved.kind === "image") {
    return (
      <div
        className="shrink-0 overflow-hidden rounded-full bg-surface2"
        style={{ width: size, height: size }}
      >
        <img
          src={resolved.src}
          alt=""
          className="size-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-surface2 text-muted"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      <span aria-hidden>{resolved.glyph}</span>
    </div>
  );
}
