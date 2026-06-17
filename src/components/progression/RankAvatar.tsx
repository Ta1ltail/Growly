// Avatar framed by a rank-based border + glow (spec §9 "Rank-based avatar
// borders"). The gradient ring and shadow intensity come from RANK_STYLE so
// the same avatar reads as more prestigious at higher ranks. Legendary adds a
// slow conic shine (animate-spin-slow, defined in globals.css).

import type { Rank } from "@/lib/titles";
import { RANK_STYLE } from "@/lib/ranks";
import { resolveAvatar } from "@/lib/cosmetics";

export function RankAvatar({
  rank,
  avatar,
  size = 80,
  className = "",
}: {
  rank: Rank;
  avatar: string | undefined;
  size?: number;
  className?: string;
}) {
  const r = RANK_STYLE[rank];
  const resolved = resolveAvatar(avatar);
  const ringWidth = Math.max(3, Math.round(size * 0.05));
  const inner = size - ringWidth * 2;

  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: r.gradient,
        boxShadow: `0 8px 28px -8px ${r.glow}, 0 0 0 1px rgba(255,255,255,0.12) inset`,
      }}
    >
      {r.animated && (
        <span
          aria-hidden
          className="animate-[spin-slow_7s_linear_infinite] pointer-events-none absolute inset-0 rounded-full opacity-50"
          style={{ background: `conic-gradient(from 0deg, transparent, ${r.accent}, transparent 45%)` }}
        />
      )}
      <span
        className="relative grid place-items-center overflow-hidden rounded-full bg-surface"
        style={{ width: inner, height: inner }}
      >
        {resolved.kind === "image" ? (
          <img src={resolved.src} alt="" className="size-full object-cover" />
        ) : (
          <span style={{ fontSize: inner * 0.5 }} aria-hidden>
            {resolved.glyph}
          </span>
        )}
      </span>
    </div>
  );
}
