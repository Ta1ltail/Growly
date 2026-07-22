"use client";

import { useRef } from "react";
import {
  BarChart3,
  Target,
  Zap,
  Shield,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useOnceInView } from "@/hooks/useOnceInView";

const FEATURES: {
  icon: LucideIcon;
  title: string;
  desc: string;
}[] = [
  {
    icon: Target,
    title: "Habit tracking",
    desc: "Mark habits done/missed/skipped with one tap. Schedule daily, weekly, or monthly.",
  },
  {
    icon: BarChart3,
    title: "Rich analytics",
    desc: "Completion rates, streaks, consistency scores, and smart insights powered by your actual data.",
  },
  {
    icon: Zap,
    title: "Gamification",
    desc: "XP, levels, titles, achievements, and a shop with unlockable cosmetics. Progress feels rewarding.",
  },
  {
    icon: Shield,
    title: "Honest tracking",
    desc: "Past days lock automatically. Streaks are earned, not manufactured. No cheating.",
  },
  {
    icon: Smartphone,
    title: "Cross-platform sync",
    desc: "Seamlessly sync across devices. Cloud-backed storage ensures your data is always up to date, everywhere.",
  },
  {
    icon: Sparkles,
    title: "Beautiful UI",
    desc: "Dark/light themes, custom accent colors, smooth animations, and a fully responsive design.",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  index: number;
}) {
  return (
    <div
      className="group animate-scale-in rounded-2xl border border-line/60 bg-surface/50 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:bg-surface hover:shadow-lg hover:shadow-accent/5"
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
    >
      <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent/20">
        <Icon className="size-[18px]" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useOnceInView(ref);

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-500 ${
            inView ? "animate-fade-slide-up-lg" : "opacity-0"
          }`}
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="size-3" />
            Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to&nbsp;stay&nbsp;consistent
          </h2>
          <p className="mt-3 text-muted">
            A modern habit tracker that respects your data, your time, and your
            journey.
          </p>
        </div>

        {/* Feature grid */}
        <div
          className={`mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${
            inView ? "animate-fade-in" : "opacity-0"
          }`}
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
