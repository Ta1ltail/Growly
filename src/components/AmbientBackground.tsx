// Fixed ambient background: a few softly drifting, blurred accent blobs that
// give the app depth without the old gradient's scroll-cutting. It's a
// negative z-index child of <body> (base color sits on <html>), so it stays
// behind all content and never intercepts clicks. Drift pauses under
// prefers-reduced-motion (handled globally in globals.css), leaving the blobs
// as static atmosphere. Works in both themes via accent CSS variables.

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-float absolute -left-[12%] -top-[15%] size-[48vw] rounded-full blur-[110px]"
        style={{ background: "color-mix(in srgb, var(--c-accent) 22%, transparent)" }}
      />
      <div
        className="animate-float absolute -right-[8%] top-[18%] size-[36vw] rounded-full blur-[120px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent-glow) 18%, transparent)",
          animationDuration: "28s",
          animationDelay: "-6s",
        }}
      />
      <div
        className="animate-float absolute -bottom-[15%] left-[28%] size-[42vw] rounded-full blur-[130px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent) 12%, transparent)",
          animationDuration: "34s",
          animationDelay: "-14s",
        }}
      />
    </div>
  );
}
