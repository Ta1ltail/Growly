"use client";

import { useId, useState, useMemo } from "react";

export interface TrendPoint {
  date: Date;
  rate: number; // 0..100
}

// Padding percentages so 0%/100% labels aren't clipped
const PAD_TOP = 6;
const PAD_BOT = 6;
const PAD_LEFT = 8; // room for Y-axis labels
const PAD_RIGHT = 2;

export function TrendLineChart({
  points,
  height = 180,
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

  // Map data indices/rates to SVG viewBox percentages
  const xPos = useMemo(() => {
    if (n === 1) return () => PAD_LEFT + (100 - PAD_LEFT - PAD_RIGHT) / 2;
    return (i: number) =>
      PAD_LEFT + (i / (n - 1)) * (100 - PAD_LEFT - PAD_RIGHT);
  }, [n]);

  const yPos = (rate: number) =>
    PAD_TOP + (1 - rate / 100) * (100 - PAD_TOP - PAD_BOT);

  // Build SVG path
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(p.rate)}`)
    .join(" ");
  const area = `${line} L ${xPos(n - 1)} ${100 - PAD_BOT} L ${xPos(0)} ${100 - PAD_BOT} Z`;

  // Grid lines at 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="relative w-full" style={{ height }}>
      {/* ── SVG chart layer ── */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow-${gradId}">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines.map((g) => (
          <line
            key={g}
            x1={PAD_LEFT}
            y1={yPos(g)}
            x2={100 - PAD_RIGHT}
            y2={yPos(g)}
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
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#glow-${gradId})`}
        />

        {/* Data point dots */}
        {points.map((p, i) => {
          const cx = xPos(i);
          const cy = yPos(p.rate);
          const isActive = active === i;
          return (
            <g key={p.date.toISOString()}>
              {/* Outer glow ring for active dot */}
              {isActive && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="none"
                  stroke="var(--c-accent)"
                  strokeWidth={3}
                  opacity={0.3}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 3.5 : 2.5}
                fill={
                  isActive ? "var(--c-accent)" : "var(--c-accent-glow)"
                }
                stroke="var(--c-surface)"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-200"
              />
            </g>
          );
        })}
      </svg>

      {/* ── Y-axis labels ── */}
      <div
        className="pointer-events-none absolute left-0 flex flex-col justify-between text-right"
        style={{
          top: `${PAD_TOP}%`,
          bottom: `${PAD_BOT}%`,
          width: `${PAD_LEFT}%`,
        }}
      >
        {gridLines.map((g) => (
          <span
            key={g}
            className="font-mono text-[9px] leading-none text-faint translate-y-1/2 pr-1"
          >
            {g}%
          </span>
        ))}
      </div>

      {/* ── Hover hit-areas ── */}
      <div
        className="absolute flex"
        style={{
          left: `${PAD_LEFT}%`,
          right: `${PAD_RIGHT}%`,
          top: `${PAD_TOP}%`,
          bottom: `${PAD_BOT}%`,
        }}
      >
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

      {/* ── Tooltip ── */}
      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2.5 text-center shadow-xl backdrop-blur-sm"
          style={{
            left: `${xPos(active)}%`,
            top: `${yPos(points[active].rate)}%`,
            marginTop: -8,
          }}
        >
          <div
            className="mx-auto mb-1.5 h-1.5 w-1.5 rounded-full"
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

      {/* ── X-axis labels ── */}
      <div
        className="absolute left-0 right-0 flex"
        style={{
          top: `${100 - PAD_BOT}%`,
          height: `${PAD_BOT}%`,
        }}
      >
        {points.map((p, i) => {
          const step = Math.max(1, Math.floor(n / 7));
          if (i % step !== 0 && i !== n - 1)
            return (
              <div
                key={i}
                className="flex-1"
                style={{ marginLeft: 0, marginRight: 0 }}
              />
            );
          return (
            <div
              key={i}
              className="flex-1 flex items-end justify-center pb-0.5"
            >
              <span className="font-mono text-[9px] text-faint whitespace-nowrap">
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
