"use client";

// Interactive completion line chart (spec §11 "Interactive Graphs"): smooth
// line + gradient area, hover tooltips, responsive. The SVG uses a 0..100
// viewBox with preserveAspectRatio="none" so it fills any width; the stroke
// stays crisp via vector-effect="non-scaling-stroke" and the points + tooltip
// are HTML-overlaid (percent-positioned) so they never distort.

import { useId, useState } from "react";

export interface TrendPoint {
  date: Date;
  rate: number; // 0..100
}

const PAD = 6; // vertical padding (% of viewBox) so 0%/100% aren't clipped

export function TrendLineChart({ points, height = 160 }: { points: TrendPoint[]; height?: number }) {
  const gradId = useId();
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) {
    return <div className="grid place-items-center text-sm text-faint" style={{ height }}>No data</div>;
  }

  const n = points.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (rate: number) => PAD + (1 - rate / 100) * (100 - 2 * PAD);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.rate)}`).join(" ");
  const area = `${line} L ${x(n - 1)} 100 L ${x(0)} 100 Z`;

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Point dots (percent-positioned so they stay round) */}
      {points.map((p, i) => (
        <span
          key={p.date.toISOString()}
          className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-transform"
          style={{
            left: `${x(i)}%`,
            top: `${y(p.rate)}%`,
            background: "var(--c-accent)",
            transform: `translate(-50%,-50%) scale(${active === i ? 1.6 : 1})`,
          }}
        />
      ))}

      {/* Hover hit-areas: one equal column per point */}
      <div className="absolute inset-0 flex">
        {points.map((p, i) => (
          <button
            key={p.date.toISOString()}
            type="button"
            className="h-full flex-1 cursor-default"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((a) => (a === i ? null : a))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
            aria-label={`${p.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${p.rate}%`}
          />
        ))}
      </div>

      {/* Tooltip */}
      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2 py-1 text-center shadow-lg"
          style={{ left: `${x(active)}%`, top: `${y(points[active].rate) - 4}%` }}
        >
          <div className="font-mono text-xs font-bold">{points[active].rate}%</div>
          <div className="whitespace-nowrap text-[10px] text-muted">
            {points[active].date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
        </div>
      )}
    </div>
  );
}
