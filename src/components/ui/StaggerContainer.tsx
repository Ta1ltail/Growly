"use client";

// Staggered entrance animation wrapper. Children animate in sequentially when
// the container mounts. Uses CSS animations with custom-property delays
// instead of motion's spring-based staggerChildren — removes the 35KB
// motion dependency for a 2KB CSS alternative.
//
// Usage:
//   <StaggerContainer className="grid gap-3 sm:grid-cols-2">
//     <StaggerItem key={item.id}>...</StaggerItem>
//   </StaggerContainer>

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

export function StaggerContainer({
  children,
  className,
  style,
  staggerDelay = 0.05,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  staggerDelay?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>(":scope > .stagger-item");
    items.forEach((item, i) => {
      item.style.setProperty("--i", String(i));
    });
  }, [children, staggerDelay]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={
        {
          "--stagger-delay": `${staggerDelay}s`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`stagger-item ${className ?? ""}`}>{children}</div>;
}
