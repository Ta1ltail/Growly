// Enhanced ambient background — deeper, richer atmosphere with floating
// particle stars, layered aurora glows on separate drift paths, and a soft
// vignette. The particles add a magical "night sky" feel, especially in
// dark mode, while the warm light mode keeps it subtle and cozy.
//
// All motion pauses under prefers-reduced-motion (globals.css does this
// automatically), leaving a static but still pleasant background.
//
// Layers, back-to-front:
//   1. a faint dotted grid texture (edge-faded) for subtle structure,
//   2. floating star/ember particles at various depths,
//   3. four softly drifting, blurred accent "aurora" blobs,
//   4. a vignette that darkens the corners to focus the content.

export function AmbientBackground() {
  return (
    <div data-ambient aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Dotted grid texture — faded toward the edges so it reads as depth, not a sheet. */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--c-line) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 0%, transparent 75%)",
        }}
      />

      {/* Floating star/particle layer — scattered across the viewport. */}
      <ParticleLayer />

      {/* Aurora blobs. More layers + richer colors for depth. */}
      {/* Primary glow — large, slow, dominant accent color */}
      <div
        className="absolute -left-[10%] -top-[12%] size-[52vw] rounded-full blur-[120px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent) 28%, transparent)",
          animation: "drift-1 32s ease-in-out infinite",
        }}
      />
      {/* Secondary glow — accent glow, offset */}
      <div
        className="absolute -right-[6%] top-[10%] size-[40vw] rounded-full blur-[130px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent-glow) 22%, transparent)",
          animation: "drift-2 28s ease-in-out infinite",
          animationDelay: "-5s",
        }}
      />
      {/* Tertiary warm pulse — adds a subtle warm counterpoint */}
      <div
        className="absolute left-[20%] top-[40%] size-[36vw] rounded-full blur-[140px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent) 12%, transparent)",
          animation: "drift-1 40s ease-in-out infinite",
          animationDelay: "-12s",
        }}
      />
      {/* Bottom-right accent */}
      <div
        className="absolute -bottom-[10%] -right-[4%] size-[34vw] rounded-full blur-[130px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent-glow) 16%, transparent)",
          animation: "drift-2 34s ease-in-out infinite",
          animationDelay: "-18s",
        }}
      />

      {/* Bottom-left warm glow for balance */}
      <div
        className="absolute -bottom-[20%] left-[10%] size-[44vw] rounded-full blur-[150px]"
        style={{
          background: "color-mix(in srgb, var(--c-accent) 10%, transparent)",
          animation: "drift-1 36s ease-in-out infinite",
          animationDelay: "-9s",
        }}
      />

      {/* Corner vignette for focus + depth. Tinted to match the theme mood. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 0%, transparent 50%, color-mix(in srgb, var(--c-bg) 60%, transparent) 100%)",
        }}
      />
    </div>
  );
}

function ParticleLayer() {
  // Deterministic pseudo-random for SSR consistency.
  const particles = [
    { x: 8, y: 15, size: 2, delay: 0, duration: 6, alt: false },
    { x: 22, y: 40, size: 1.5, delay: 1.2, duration: 7, alt: true },
    { x: 35, y: 8, size: 2.5, delay: 0.6, duration: 5.5, alt: false },
    { x: 48, y: 55, size: 1.5, delay: 2.0, duration: 8, alt: true },
    { x: 60, y: 20, size: 2, delay: 0.3, duration: 6.5, alt: false },
    { x: 72, y: 70, size: 1.5, delay: 1.8, duration: 7.5, alt: true },
    { x: 82, y: 10, size: 2, delay: 0.9, duration: 5.8, alt: false },
    { x: 92, y: 45, size: 1.5, delay: 2.5, duration: 7.2, alt: true },
    { x: 15, y: 80, size: 1.5, delay: 1.5, duration: 6.8, alt: false },
    { x: 50, y: 85, size: 2, delay: 3.0, duration: 7.8, alt: true },
    { x: 68, y: 35, size: 1.5, delay: 0.8, duration: 5.2, alt: false },
    { x: 78, y: 60, size: 2, delay: 1.1, duration: 6.2, alt: true },
  ];

  return (
    <>
      {particles.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "color-mix(in srgb, var(--c-accent) 60%, var(--c-bg))",
            opacity: 0,
            animation: `particle-float${p.alt ? "-alt" : ""} ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}
