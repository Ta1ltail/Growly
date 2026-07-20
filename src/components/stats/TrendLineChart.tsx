"use client";

// Simple clean trend line chart. SVG-based with hover tooltips.
// Preserves the same TrendPoint interface — zero changes needed on the stats page.

import { useState, useMemo } from "react";

export interface TrendPoint {
  date: Date;
  rate: number; // 0..100
}

/* ── Chart layout ─────────────────────────────────────────── */

const W = 640;
const H = 320;
const PAD = { l: 48, r: 16, t: 16, b: 36 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

function x(i: number, n: number): number {
  if (n <= 1) return PAD.l + innerW / 2;
  return PAD.l + (i / (n - 1)) * innerW;
}
function y(rate: number): number {
  return PAD.t + (1 - rate / 100) * innerH;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Component ────────────────────────────────────────────── */

export function TrendLineChart({ points }: { points: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const n = points.length;

  const pts = useMemo(
    () =>
      points.map((p, i) => ({
        x: x(i, n),
        y: y(p.rate),
        date: p.date,
        rate: p.rate,
      })),
    [points, n],
  );

  // Build simple bezier path
  const linePath = useMemo(() => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [pts]);

  const areaPath = useMemo(() => {
    if (pts.length < 2) return "";
    const bottom = ` L ${pts[pts.length - 1].x} ${H - PAD.b} L ${pts[0].x} ${H - PAD.b} Z`;
    return linePath + bottom;
  }, [linePath, pts]);

  const gridLines = [0, 25, 50, 75, 100];
  const hoveredPt = hovered !== null ? pts[hovered] : null;

  // Empty state
  if (n === 0) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-faint">
        <svg className="size-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-8" />
        </svg>
        <span className="text-xs font-medium">No trend data yet</span>
      </div>
    );
  }

  return (
    <div className="relative size-full select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridLines.map((g) => (
          <line
            key={g}
            x1={PAD.l} y1={y(g)} x2={W - PAD.r} y2={y(g)}
            stroke="var(--c-line)" strokeWidth="0.5" strokeDasharray="6,4"
          />
        ))}

        {/* Bottom axis */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--c-line)" strokeWidth="0.75" />

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#area-grad)" />}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--c-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Y-axis labels */}
        {gridLines.map((g) => (
          <text key={g} x={PAD.l - 6} y={y(g) + 4} textAnchor="end" className="fill-faint" fontSize="10" fontFamily="monospace">
            {g}%
          </text>
        ))}

        {/* X-axis labels */}
        {pts.map((pt, i) => {
          if (n <= 7 || i === 0 || i === n - 1 || i % Math.ceil(n / 5) === 0) {
            return (
              <text key={i} x={pt.x} y={H - PAD.b + 14} textAnchor="middle" className="fill-faint" fontSize="9" fontFamily="monospace">
                {formatDate(pt.date)}
              </text>
            );
          }
          return null;
        })}

        {/* Data points */}
        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={hovered === i ? 6 : 3}
            fill={hovered === i ? "var(--c-accent)" : "var(--c-surface)"}
            stroke="var(--c-accent)"
            strokeWidth={2}
            className="transition-all duration-150"
          />
        ))}

        {/* Crosshair */}
        {hovered !== null && (
          <line
            x1={pts[hovered].x} y1={PAD.t}
            x2={pts[hovered].x} y2={H - PAD.b}
            stroke="var(--c-accent)" strokeWidth="0.5" opacity="0.3"
          />
        )}
      </svg>

      {/* Hit areas */}
      <div
        className="absolute flex"
        style={{
          left: `${(PAD.l / W) * 100}%`,
          right: `${(PAD.r / W) * 100}%`,
          top: `${(PAD.t / H) * 100}%`,
          bottom: `${(PAD.b / H) * 100}%`,
        }}
      >
        {pts.map((pt, i) => (
          <button
            key={i}
            type="button"
            className="block h-full flex-1 min-w-0 appearance-none border-0 bg-transparent p-0 m-0 outline-none"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            aria-label={`${pt.rate}% on ${formatDate(pt.date)}`}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hoveredPt && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${(hoveredPt.x / W) * 100}%`,
            top: `${(hoveredPt.y / H) * 100}%`,
            transform: hoveredPt.y < 80 ? "translate(-50%, 16px)" : "translate(-50%, -100%)",
          }}
        >
          <div className="rounded-lg border border-line/70 bg-surface/95 px-3 py-2 text-center shadow-md">
            <div className="font-mono text-base font-bold tabular-nums text-accent leading-none">
              {hoveredPt.rate}%
            </div>
            <div className="mt-0.5 text-[10px] font-medium text-muted leading-none whitespace-nowrap">
              {hoveredPt.date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
