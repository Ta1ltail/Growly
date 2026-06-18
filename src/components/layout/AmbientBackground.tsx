// Static background — lightweight, no animations, no particles, no blur.
// Replaces the previous heavy ambient background that was causing FPS drops.

"use client";

export function AmbientBackground() {
  return (
    <div data-ambient aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Single static gradient overlay — no motion, no blur, no particles */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--c-accent) 12%, transparent) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
