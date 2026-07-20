"use client";

// Modern interactive trend line chart — redesigned with smooth cubic bezier
// curves, a floating crosshair, animated entrance, and elegant tooltips.
// Preserves the same TrendPoint input interface so the stats page needs
// zero changes.

import { useId, useState, useEffect, useRef, useMemo } from "react";

export interface TrendPoint {
  date: Date;
  rate: number; // 0..100
}

/* ── Smooth monotone cubic interpolation ────────────────────────────
 *  Generates SVG path commands with C (cubic bezier) control points
 *  that pass exactly through each point while keeping the curve
 *  monotone between them — no overshoot, no ringing. */

interface Pt {
  x: number;
  y: number;
}

function monotoneCubicPath(points: Pt[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const n = points.length;

  // Tangents (Fritsch–Carlson / Steffen monotone)
  const m: number[] = new Array(n);
  for (let i = 1; i < n; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const s = dx !== 0 ? dy / dx : 0;
    if (i === 1) {
      m[0] = s;
    } else if (i === n - 1) {
      m[n - 1] = s;
    } else {
      const prevDx = points[i - 1].x - points[i - 2].x;
      const prevDy = points[i - 1].y - points[i - 2].y;
      const prevS = prevDx !== 0 ? prevDy / prevDx : 0;
      if (s * prevS <= 0) {
        m[i - 1] = 0;
      } else {
        const w1 = 2 * dx + prevDx;
        const w2 = dx + 2 * prevDx;
        m[i - 1] = (w1 + w2) !== 0 ? (w1 * s + w2 * prevS) / (w1 + w2) : 0;
      }
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < n; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const cpx = p0.x + dx / 3;
    const cpx2 = p0.x + (2 * dx) / 3;
    d += ` C ${cpx} ${p0.y + m[i - 1] * dx / 3}, ${cpx2} ${p1.y - m[i] * dx / 3}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/* ── Chart dimensions ───────────────────────────────────────────────
 *  Using a 1000×500 viewBox for high-resolution rendering with
 *  plenty of padding for labels. */

const W = 1000;
const H = 500;
const PAD_L = 72;
const PAD_R = 24;
const PAD_T = 24;
const PAD_B = 48;

const innerW = W - PAD_L - PAD_R;
const innerH = H - PAD_T - PAD_B;

function xPos(i: number, n: number): number {
  if (n <= 1) return PAD_L + innerW / 2;
  return PAD_L + (i / Math.max(n - 1, 1)) * innerW;
}

function yPos(rate: number): number {
  return PAD_T + (1 - rate / 100) * innerH;
}

/* ── Tick formatting ──────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Determine which x-axis labels to show (spaced to avoid overlap)

/* ── Component ────────────────────────────────────────────────────── */

export function TrendLineChart({ points }: { points: TrendPoint[] }) {
  const baseId = useId().replace(/[\]:]/g, "");
  const gradId = `${baseId}-grad`;
  const areaGradId = `${baseId}-area`;
  const glowId = `${baseId}-glow`;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const n = points.length;

  // Trigger the entrance animation once on mount / data change
  useEffect(() => {
    setEntered(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [points]);

  // Animate the line drawing
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !entered) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Trigger reflow
    path.getBoundingClientRect();
    path.style.transition =
      "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
    path.style.strokeDashoffset = "0";
    return () => {
      path.style.transition = "";
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
    };
  }, [points, entered]);

  // Compute pixel positions for each point
  const pts = useMemo(() => {
    if (n === 0) return [];
    return points.map((p, i) => ({
      x: xPos(i, n),
      y: yPos(p.rate),
      date: p.date,
      rate: p.rate,
    }));
  }, [points, n]);

  // Build paths
  const coords = pts.map((p) => ({ x: p.x, y: p.y }));
  const linePath = useMemo(() => monotoneCubicPath(coords), [coords]);
  const areaPath = useMemo(() => {
    if (pts.length < 2) return "";
    const bottomLeft = `L ${pts[pts.length - 1].x} ${H - PAD_B} L ${pts[0].x} ${H - PAD_B} Z`;
    return `${linePath} ${bottomLeft}`;
  }, [linePath, pts]);

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100];

  // Average rate
  const avgRate = useMemo(
    () => (n > 0 ? Math.round(points.reduce((s, p) => s + p.rate, 0) / n) : 0),
    [points],
  );

  // Smart x-axis label intervals
  const xLabels = useMemo(() => {
    const map = new Map<number, string>();
    if (n === 0) return map;

    // Estimate available width per label in SVG units (rough)
    const labelWidthEstimate = 64; // ~64 SVG units per label
    const maxLabels = Math.max(1, Math.floor(innerW / labelWidthEstimate));
    const step = Math.max(1, Math.floor(n / maxLabels));

    for (let i = 0; i < n; i++) {
      if (i % step === 0 || i === n - 1) {
        map.set(i, formatDate(points[i].date));
      }
    }
    return map;
  }, [points, n]);

  // Hovered point data
  const activePoint = activeIndex !== null ? pts[activeIndex] : null;

  // === Empty state ===
  if (n === 0) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-faint">
        <svg
          className="size-10 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-8" />
        </svg>
        <span className="text-xs font-medium">No trend data yet</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative size-full select-none">
      {/* ══ SVG layer ══ */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          {/* Area gradient — accent at the line, fading to transparent */}
          <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.30" />
            <stop offset="40%" stopColor="var(--c-accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0.02" />
          </linearGradient>

          {/* Line glow */}
          <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Grid lines ── */}
        {gridLines.map((g) => (
          <line
            key={g}
            x1={PAD_L}
            y1={yPos(g)}
            x2={W - PAD_R}
            y2={yPos(g)}
            stroke="var(--c-line)"
            strokeWidth="0.5"
            strokeDasharray="8,6"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Bottom axis */}
        <line
          x1={PAD_L}
          y1={H - PAD_B}
          x2={W - PAD_R}
          y2={H - PAD_B}
          stroke="var(--c-line)"
          strokeWidth="0.75"
          vectorEffect="non-scaling-stroke"
        />

        {/* ── Average line (dashed) ── */}
        {n > 1 && avgRate > 0 && (
          <>
            <line
              x1={PAD_L}
              y1={yPos(avgRate)}
              x2={W - PAD_R}
              y2={yPos(avgRate)}
              stroke="var(--c-muted)"
              strokeWidth="0.75"
              strokeDasharray="6,4"
              vectorEffect="non-scaling-stroke"
              opacity={0.4}
            />
            {/* Average label — clamped to stay within chart bounds */}
            <rect
              x={W - PAD_R - 48}
              y={Math.min(Math.max(yPos(avgRate) - 10, 4), H - PAD_B - 22)}
              width={48}
              height={18}
              rx={4}
              fill="var(--c-surface)"
              stroke="var(--c-line)"
              strokeWidth="0.5"
            />
            <text
              x={W - PAD_R - 24}
              y={Math.min(Math.max(yPos(avgRate) + 4, 16), H - PAD_B - 6)}
              textAnchor="middle"
              className="fill-muted"
              fontSize="10"
              fontFamily="monospace"
            >
              avg {avgRate}%
            </text>
          </>
        )}

        {/* ── Crosshair line (active hover) ── */}
        {activeIndex !== null && (
          <line
            x1={pts[activeIndex].x}
            y1={PAD_T}
            x2={pts[activeIndex].x}
            y2={H - PAD_B}
            stroke="var(--c-accent)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
            opacity={0.35}
            className="transition-all duration-150"
          />
        )}

        {/* ── Area fill ── */}
        {entered && (
          <path
            d={areaPath}
            fill={`url(#${areaGradId})`}
            className="transition-all duration-700"
          />
        )}

        {/* ── Line ── */}
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${glowId})`}
          style={{
            willChange: "stroke-dashoffset",
            visibility: entered ? "visible" : "hidden",
          }}
        />

        {/* ── Data points ── */}
        {pts.map((pt, i) => {
          const isActive = activeIndex === i;
          const show = entered;
          return (
            <g
              key={i}
              className="transition-all duration-300"
              style={{
                opacity: show ? 1 : 0,
                transitionDelay: `${0.1 + i * 0.03}s`,
              }}
            >
              {/* Outer halo (active only) */}
              {isActive && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={16}
                  fill="none"
                  stroke="var(--c-accent)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.12}
                  className="animate-ping"
                  style={{ animationDuration: "2s" }}
                />
              )}

              {/* Glow ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 10 : 0}
                fill="none"
                stroke="var(--c-accent)"
                strokeWidth="6"
                vectorEffect="non-scaling-stroke"
                opacity={isActive ? 0.2 : 0}
                className="transition-all duration-200"
              />

              {/* Outer dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 7 : 4}
                fill={
                  isActive ? "var(--c-accent)" : "var(--c-surface)"
                }
                stroke={
                  isActive ? "var(--c-accent)" : "var(--c-accent-glow)"
                }
                strokeWidth={isActive ? 0 : 2.5}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-200"
              />

              {/* Inner core */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 3 : 2.5}
                fill={
                  isActive ? "var(--c-surface)" : "var(--c-accent)"
                }
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-200"
              />
            </g>
          );
        })}

        {/* ── Y-axis labels ── */}
        {gridLines.map((g) => (
          <text
            key={g}
            x={PAD_L - 8}
            y={yPos(g) + 4}
            textAnchor="end"
            className="fill-faint"
            fontSize="11"
            fontFamily="monospace"
            opacity={g === 0 ? 0.5 : 0.7}
          >
            {g}%
          </text>
        ))}

        {/* ── X-axis labels ── */}
        {pts.map((pt, i) => {            if (!xLabels.has(i)) return null;
          const isToday =
            i === n - 1 ||
            pt.date.toDateString() === new Date().toDateString();
          return (
            <text
              key={i}
              x={pt.x}
              y={H - PAD_B + 18}
              textAnchor="middle"
              className={isToday ? "fill-accent" : "fill-faint"}
              fontSize="10"
              fontFamily="monospace"
              fontWeight={isToday ? 600 : 400}
            >
              {xLabels.get(i)}
            </text>
          );
        })}

        {/* Today marker */}
        <text
          x={pts[n - 1].x}
          y={H - PAD_B + 32}
          textAnchor="middle"
          className="fill-accent"
          fontSize="8"
          fontFamily="monospace"
          fontWeight={600}
          opacity={0.6}
        >
          today
        </text>
      </svg>

      {/* ══ Hover hit areas (overlay) ══ */}
      <div
        className="absolute flex"
        style={{
          left: `${(PAD_L / W) * 100}%`,
          right: `${(PAD_R / W) * 100}%`,
          top: `${(PAD_T / H) * 100}%`,
          bottom: `${(PAD_B / H) * 100}%`,
        }}
      >
        {pts.map((pt, i) => (
          <button
            key={i}
            type="button"
            className="block h-full flex-1 min-w-0 appearance-none border-0 bg-transparent p-0 m-0 cursor-default outline-none"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex(null)}
            aria-label={`${pt.rate}% — ${pt.date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}`}
          />
        ))}
      </div>        {/* ══ Floating Tooltip (edge-safe) ══ */}
      {activePoint && (
        <div
          className="pointer-events-none absolute z-20 animate-rise"
          style={{
            left: `${(activePoint.x / W) * 100}%`,
            top: `${(activePoint.y / H) * 100}%`,
            transform: activePoint.y < 80
              ? "translate(-50%, 20px)"
              : "translate(-50%, -100%)",
            marginTop: activePoint.y < 80 ? 0 : -12,
            animationDuration: "0.18s",
          }}
        >
          <div className="rounded-xl border border-line/80 bg-surface/95 px-3.5 py-2.5 text-center shadow-xl backdrop-blur-md">
            {/* Percentage — large & bold */}
            <div className="font-mono text-lg font-bold tabular-nums leading-none text-accent">
              {activePoint.rate}%
            </div>
            {/* Date — subtle */}
            <div className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-muted leading-none">
              {activePoint.date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          {/* Arrow — flips direction when tooltip is below the point */}
          <div className={`mx-auto ${activePoint.y < 80 ? "mb-px rotate-[-135deg]" : "-mt-px"} size-2.5 rotate-45 border-b border-r border-line/80 bg-surface`} />
        </div>
      )}

      {/* ══ Hover value badge (top-right summary) ══ */}
      {activePoint && (
        <div
          className="pointer-events-none absolute z-10 animate-fade-in"
          style={{
            top: 4,
            right: 4,
            animationDuration: "0.15s",
          }}
        >
          <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-2.5 py-1.5">
            <span className="font-mono text-xs font-bold tabular-nums text-accent">
              {activePoint.rate}%
            </span>
            <span className="text-[9px] text-muted">completion</span>
          </div>
        </div>
      )}
    </div>
  );
}
