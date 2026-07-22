"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight IntersectionObserver hook — fires once when element enters view.
 * Disconnects after first intersection to avoid unnecessary work.
 */
export function useOnceInView(
  ref: React.RefObject<Element | null>,
  threshold = 0.08,
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}
