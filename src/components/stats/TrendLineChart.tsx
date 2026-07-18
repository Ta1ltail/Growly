"use client";

import { useId, useState, useMemo } from "react";

export interface TrendPoint {
  date: Date;
  rate: number; // 0..100
}

const PAD = 8; // vertical padding (% of viewBox) so 0%/100% aren't clipped

export function TrendLineChart({
  points,
  height = 160,
}: {
  points: TrendPoint[];
  height?: number;
}) {
  const gradId = useId();
  const [active, setActive] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div
        className="grid place-items-center text-sm text-faint"
        style={{ height }}
      >
        No trend data yet
      </div>
    );
  }

  const n = points.length;
  const x = useMemo(() => {
    if (n === 1) return () => 50;
    return (i: number) => (i / (n - 1)) * 100;
  }, [n]);
  const y = (rate: number) => PAD + (1 - rate / 100) * (100 - 2 * PAD);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.rate)}`)
    .join(" ");
  const area = `${line} L ${x(n - 1)} 100 L ${x(0)} 100 Z`;

  // Grid lines at 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="relative w-full" style={{ height }}>
      {/* SVG chart layer */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines (no text labels to avoid distortion from preserveAspectRatio) */}
        {gridLines.map((g) => (
          <line
            key={g}
            x1={0}
            y1={y(g)}
            x2={100}
            y2={y(g)}
            stroke="var(--c-line)"
            strokeWidth={0.3}
            strokeDasharray="2,3"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Area fill */}
        <path d={area} fill={`url(#${gradId})`} />

        {/* Line */}
        <path
          d={line}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Y-axis labels as HTML (not SVG, so they aren't distorted) */}
      <div className="pointer-events-none absolute inset-y-0 -left-1 flex w-8 flex-col justify-between py-0 text-right pr-1">
        {gridLines.map((g) => (
          <span
            key={g}
            className="font-mono text-[9px] leading-none text-faint"
          >
            {g}%
          </span>
        ))}
      </div>

      {/* Point dots */}
      {points.map((p, i) => (
        <span
          key={p.date.toISOString()}
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-all duration-200"
          style={{
            left: `${x(i)}%`,
            top: `${y(p.rate)}%`,
            background:
              active === i ? "var(--c-accent)" : "var(--c-accent-glow)",
            boxShadow:
              active === i
                ? "0 0 0 3px color-mix(in srgb, var(--c-accent) 30%, transparent)"
                : "none",
            transform: `translate(-50%,-50%) scale(${active === i ? 1.5 : 1})`,
          }}
        />
      ))}

      {/* Hover hit-areas */}
      <div className="absolute inset-0 flex">
        {points.map((p, i) => (
          <button
            key={p.date.toISOString()}
            type="button"
            className="h-full flex-1 cursor-default outline-none"
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
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 text-center shadow-xl backdrop-blur-sm"
          style={{
            left: `${x(active)}%`,
            top: `${y(points[active].rate) - 1}%`,
          }}
        >
          <div
            className="mx-auto mb-1 h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--c-accent)" }}
          />
          <div className="font-mono text-sm font-bold tabular-nums">
            {points[active].rate}%
          </div>
          <div className="whitespace-nowrap text-[10px] text-muted">
            {points[active].date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      )}

      {/* X-axis labels (show every few points to avoid crowding) */}
      <div className="absolute -bottom-5 left-0 right-0 flex">
        {points.map((p, i) => {
          const step = Math.max(1, Math.floor(n / 8));
          if (i % step !== 0 && i !== n - 1) return <div key={i} className="flex-1" />;
          return (
            <div key={i} className="flex-1 text-center">
              <span className="font-mono text-[9px] text-faint">
                {p.date.toLocaleDateString(undefined, {
                  month: "numeric",
                  day: "numeric",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
