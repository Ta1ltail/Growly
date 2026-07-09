"use client";

// Staggered entrance animation wrapper. Children animate in sequentially when
// the container mounts. Uses motion's variants with staggerChildren for smooth
// spring-based entrances — replaces CSS-based .stagger-children.
//
// Usage:
//   <StaggerContainer className="grid gap-3 sm:grid-cols-2">
//     <StaggerItem key={item.id}>...</StaggerItem>
//   </StaggerContainer>

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
};

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
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.02,
          },
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
