"use client";

// Interactive trend line chart with SVG rendering, hover tooltips,
// and animated line drawing. Fills its parent container by default.

import { useId, useState, useEffect, useRef } from "react";

export interface TrendPoint {
  date: Date;
  rate: number; // 0..100
}

// Padding within the SVG viewBox so labels aren't clipped
const PAD_TOP = 5;
const PAD_BOT = 8;
const PAD_LEFT = 10;
const PAD_RIGHT = 4;

const CHART_W = 100;
const CHART_H = 100;

function xPos(i: number, n: number): number {
  if (n <= 1) return PAD_LEFT + (CHART_W - PAD_LEFT - PAD_RIGHT) / 2;
  return PAD_LEFT + (i / (n - 1)) * (CHART_W - PAD_LEFT - PAD_RIGHT);
}

function yPos(rate: number): number {
  return PAD_TOP + (1 - rate / 100) * (CHART_H - PAD_TOP - PAD_BOT);
}

export function TrendLineChart({
  points,
}: {
  points: TrendPoint[];
}) {
  const gradId = useId();
  const glowId = `glow-${gradId}`;
  const [active, setActive] = useState<number | null>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const n = points.length;

  // Animate the line drawing on mount / data change
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Trigger reflow then animate
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
    path.style.strokeDashoffset = "0";
    return () => {
      path.style.transition = "";
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
    };
  }, [points]);

  if (n === 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-faint">
        No trend data yet
      </div>
    );
  }

  // Build SVG path
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(i, n)} ${yPos(p.rate)}`)
    .join(" ");
  const area = `${line} L ${xPos(n - 1, n)} ${CHART_H - PAD_BOT} L ${xPos(0, n)} ${CHART_H - PAD_BOT} Z`;

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="relative size-full">
      {/* ── SVG chart ── */}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full select-none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--c-accent)" stopOpacity="0.02" />
          </linearGradient>
          <filter id={glowId} x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
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
            x2={CHART_W - PAD_RIGHT}
            y2={yPos(g)}
            stroke="var(--c-line)"
            strokeWidth={0.25}
            strokeDasharray="2,3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Bottom axis line */}
        <line
          x1={PAD_LEFT}
          y1={CHART_H - PAD_BOT}
          x2={CHART_W - PAD_RIGHT}
          y2={CHART_H - PAD_BOT}
          stroke="var(--c-line)"
          strokeWidth={0.35}
          vectorEffect="non-scaling-stroke"
        />

        {/* Area fill */}
        <path d={area} fill={`url(#${gradId})`} />

        {/* Line */}
        <path
          ref={pathRef}
          d={line}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${glowId})`}
          style={{ willChange: "stroke-dashoffset" }}
        />

        {/* Data point dots */}
        {points.map((p, i) => {
          const cx = xPos(i, n);
          const cy = yPos(p.rate);
          const isActive = active === i;
          return (
            <g key={p.date.toISOString()}>
              {/* Hover glow ring */}
              {isActive && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="none"
                  stroke="var(--c-accent)"
                  strokeWidth={2.5}
                  opacity={0.25}
                  vectorEffect="non-scaling-stroke"
                  className="animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
              )}
              {/* Outer dot */}
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 3.5 : 2}
                fill={isActive ? "var(--c-accent)" : "transparent"}
                stroke={isActive ? "var(--c-accent)" : "var(--c-accent-glow)"}
                strokeWidth={isActive ? 0 : 1.5}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-200"
              />
              {/* Inner dot (always shows accent color) */}
              <circle
                cx={cx}
                cy={cy}
                r={isActive ? 2 : 1.5}
                fill={isActive ? "var(--c-surface)" : "var(--c-accent)"}
                vectorEffect="non-scaling-stroke"
                className="transition-all duration-200"
              />
            </g>
          );
        })}
      </svg>

      {/* ── Y-axis labels ── */}
      <div
        className="pointer-events-none absolute flex flex-col justify-between text-right"
        style={{
          top: `${PAD_TOP}%`,
          bottom: `${PAD_BOT}%`,
          left: 0,
          width: `${PAD_LEFT}%`,
        }}
      >
        {[...gridLines].reverse().map((g) => (
          <span
            key={g}
            className="translate-y-1/2 pr-1.5 font-mono text-[9px] leading-none text-faint"
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
            className="block h-full flex-1 min-w-0 appearance-none border-0 bg-transparent p-0 m-0 cursor-default outline-none"
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
          className="pointer-events-none absolute z-10 -translate-x-1/2 animate-rise"
          style={{
            left: `${xPos(active, n)}%`,
            top: `${yPos(points[active].rate)}%`,
            marginTop: -10,
            animationDuration: "0.15s",
          }}
        >
          <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-center shadow-xl backdrop-blur-sm">
            <div className="font-mono text-sm font-bold tabular-nums leading-none text-accent">
              {points[active].rate}%
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[9px] font-medium text-muted leading-none">
              {points[active].date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          {/* Arrow */}
          <div
            className="mx-auto size-2 -mt-px rotate-45 border-l border-t border-line bg-surface"
            style={{ width: 6, height: 6 }}
          />
        </div>
      )}

      {/* ── X-axis labels ── */}
      <div
        className="pointer-events-none absolute flex items-start"
        style={{
          left: `${PAD_LEFT}%`,
          right: `${PAD_RIGHT}%`,
          top: `${100 - PAD_BOT}%`,
          height: `${PAD_BOT}%`,
        }}
      >
        {points.map((p, i) => {
          const step = Math.max(1, Math.floor(n / 7));
          if (i % step !== 0 && i !== n - 1) {
            return <div key={i} className="flex-1" />;
          }
          return (
            <div key={i} className="flex-1 flex justify-center pt-0.5">
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
