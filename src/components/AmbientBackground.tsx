// Fixed ambient background giving the app depth without the old gradient's
// scroll-cutting. Layers, back-to-front:
//   1. a faint dotted grid texture (edge-faded) for subtle structure,
//   2. four softly drifting, blurred accent "aurora" blobs on two distinct
//      drift paths so they never move in lockstep,
//   3. a vignette that darkens the corners to focus the content.
// It's a negative z-index child of <body> (base color sits on <html>), so it
// stays behind all content and never intercepts clicks. All motion pauses under
// prefers-reduced-motion (handled globally in globals.css), leaving the layers
// as static atmosphere. Works in both themes via accent CSS variables.

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Dotted grid texture — faded toward the edges so it reads as depth, not a sheet. */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--c-line) 70%, transparent) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 0%, transparent 78%)",
        }}
      />

      {/* Aurora blobs. Mixed sizes/blurs/opacities + two drift paths = organic motion. */}
      <div
        className="absolute -left-[12%] -top-[15%] size-[48vw] rounded-full blur-[110px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent) 24%, transparent)",
          animation: "drift-1 30s var(--ease-in-out, ease-in-out) infinite",
        }}
      />
      <div
        className="absolute -right-[8%] top-[14%] size-[36vw] rounded-full blur-[120px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent-glow) 20%, transparent)",
          animation: "drift-2 26s var(--ease-in-out, ease-in-out) infinite",
          animationDelay: "-6s",
        }}
      />
      <div
        className="absolute -bottom-[15%] left-[26%] size-[42vw] rounded-full blur-[130px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent) 14%, transparent)",
          animation: "drift-1 38s var(--ease-in-out, ease-in-out) infinite",
          animationDelay: "-14s",
        }}
      />
      <div
        className="absolute -bottom-[8%] -right-[6%] size-[30vw] rounded-full blur-[120px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent-glow) 14%, transparent)",
          animation: "drift-2 32s var(--ease-in-out, ease-in-out) infinite",
          animationDelay: "-20s",
        }}
      />

      {/* Corner vignette for focus + depth. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 0%, transparent 55%, color-mix(in srgb, var(--c-bg) 55%, transparent) 100%)",
        }}
      />
    </div>
  );
}
