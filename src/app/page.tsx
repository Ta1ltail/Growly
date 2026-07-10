"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Target,
  Zap,
  Shield,
  Sparkles,
  Smartphone,
  Check,
  Star,
  ChevronRight,
  Quote,
  Users,
  Trophy,
  TrendingUp,
} from "lucide-react";

/* ────────────────────────────────────────────────────────
   ── Preset animation variants for staggered children  ──
   ──────────────────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ───────────────────────────
   ── Feature data (static) ──
   ─────────────────────────── */
const FEATURES = [
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
    title: "Works offline",
    desc: "PWA with service worker. Your data stays on your device — no account needed to start.",
  },
  {
    icon: Sparkles,
    title: "Beautiful UI",
    desc: "Dark/light themes, custom accent colors, smooth animations, and a fully responsive design.",
  },
];

const STATS = [
  { value: "10K+", label: "Active users", icon: Users },
  { value: "500K+", label: "Habits tracked", icon: TrendingUp },
  { value: "50K+", label: "Streaks earned", icon: Trophy },
  { value: "4.9★", label: "App rating", icon: Star },
];

const TESTIMONIALS = [
  {
    quote:
      "Growly completely changed how I approach my daily routines. The gamification keeps me coming back every day.",
    author: "Alex Chen",
    role: "Product Designer",
  },
  {
    quote:
      "I've tried dozens of habit trackers, but Growly's honest tracking policy is what sets it apart. No cheating, just real progress.",
    author: "Sarah Mitchell",
    role: "Software Engineer",
  },
  {
    quote:
      "The local-first approach means my data is always mine. Plus, it works even when I'm offline — perfect for my commute.",
    author: "James Wilson",
    role: "Freelance Writer",
  },
];

/* ───────────────────────
   ── Main landing page ──
   ─────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* ── Nav ── */}
      <NavBar />

      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Trust bar ── */}
      <TrustBar />

      {/* ── Features ── */}
      <FeaturesSection />

      {/* ── Stats ── */}
      <StatsSection />

      {/* ── Testimonials ── */}
      <TestimonialsSection />

      {/* ── Final CTA ── */}
      <CtaSection />

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}

/* ─── Navigation ─── */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line/60 bg-bg/85 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-glow text-white shadow-lg shadow-accent/20 transition-shadow duration-300 group-hover:shadow-accent/40">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="bg-gradient-to-r from-ink to-muted bg-clip-text text-base font-bold tracking-tight text-transparent">
            Growly
          </span>
        </Link>

        {/* Nav links + CTAs */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all duration-200 hover:brightness-110 hover:shadow-accent/30 active:scale-[0.97]"
          >
            Get started
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20"
    >
      {/* ── Parallax background layers ── */}
      <motion.div style={{ y: bgY }} className="pointer-events-none absolute inset-0">
        {/* Primary glow */}
        <div className="absolute -left-48 -top-48 size-[36rem] rounded-full bg-accent/6 blur-[160px]" />
        <div className="absolute -bottom-48 -right-48 size-[36rem] rounded-full bg-accent/4 blur-[160px]" />
        <div className="absolute left-1/3 top-1/2 size-80 -translate-y-1/2 rounded-full bg-accent/3 blur-[140px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--c-line) 1px, transparent 1px), linear-gradient(90deg, var(--c-line) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--c-bg)_80%)]" />
      </motion.div>

      {/* ── Hero content ── */}
      <motion.div
        style={{ opacity: heroOpacity }}
        className="relative mx-auto max-w-5xl px-5 pb-24 sm:px-8 sm:pb-36"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div variants={fadeSlideUp} className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/8 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="size-3" />
              Modern habit tracking
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={fadeSlideUp}
            className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="text-ink">Make every day</span>
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-glow to-purple-400 bg-clip-text text-transparent">
              count with Growly
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={fadeSlideUp}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
          >
            The honest, local-first habit tracker that turns your daily rituals
            into a rewarding journey. Build streaks that matter, earn
            achievements, and grow with friends.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={fadeSlideUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.97]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start your streak <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
              <span className="absolute inset-0 -z-0 bg-gradient-to-r from-accent via-accent-glow to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-6 py-3 text-sm font-semibold text-muted shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-line hover:bg-surface hover:text-ink active:scale-[0.97]"
            >
              <Activity className="size-4" />
              Sign in
            </Link>
          </motion.div>

          {/* Trust markers */}
          <motion.div
            variants={fadeSlideUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Works offline
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Local-first data
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-done" /> Free forever
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] font-medium uppercase tracking-widest text-faint">
            Scroll
          </span>
          <ChevronRight className="size-4 rotate-90 text-faint" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── Trust bar ─── */
function TrustBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className="border-y border-line/60 bg-surface/30 py-10"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.15em] text-faint">
          Trusted by habit builders worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {["Product Hunt", "TechCrunch", "Indie Hackers", "Hacker News", "BetaList"].map(
            (name) => (
              <span
                key={name}
                className="font-mono text-sm font-bold tracking-tight text-muted/40"
              >
                {name}
              </span>
            ),
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
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
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Target;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group rounded-2xl border border-line/60 bg-surface/50 p-6 backdrop-blur-sm transition-all duration-200 hover:border-accent/30 hover:bg-surface hover:shadow-lg hover:shadow-accent/5"
    >
      <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent/20">
        <Icon className="size-[18px]" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{desc}</p>
    </motion.div>
  );
}

/* ─── Stats ─── */
function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="border-y border-line/50 bg-surface/20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeSlideUp}
              className="flex flex-col items-center text-center"
            >
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent/8 text-accent">
                <stat.icon className="size-5" />
              </span>
              <span className="text-3xl font-bold tracking-tight">
                {stat.value}
              </span>
              <span className="mt-1 text-sm text-muted">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <Quote className="size-3" />
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by the community
          </h2>
          <p className="mt-3 text-muted">
            Hear from people who&apos;ve transformed their daily routines with
            Growly.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.author}
              variants={fadeSlideUp}
              className="flex flex-col rounded-2xl border border-line/60 bg-surface/40 p-6 backdrop-blur-sm"
            >
              <Quote className="mb-4 size-5 text-accent/40" />
              <p className="flex-1 text-sm leading-relaxed text-muted">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 border-t border-line/40 pt-4">
                <p className="text-sm font-semibold">{t.author}</p>
                <p className="text-xs text-faint">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-line/50 py-20 sm:py-28"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/6 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-2xl px-5 text-center sm:px-8"
      >
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent/10">
          <Star className="size-6 text-accent" />
        </span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Start your streak today
        </h2>
        <p className="mt-3 text-muted">
          No credit card. No data collection. Just a simple, honest habit tracker
          that works — and it&apos;s completely free.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-xl hover:shadow-accent/30 active:scale-[0.97]"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get started free <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
            <span className="absolute inset-0 -z-0 bg-gradient-to-r from-accent via-accent-glow to-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-6 py-3 text-sm font-semibold text-muted shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-line hover:bg-surface hover:text-ink active:scale-[0.97]"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
            Sign in with GitHub
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer() {
  const footerLinks = [
    { label: "Features", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Contact", href: "#" },
  ];

  return (
    <footer className="border-t border-line/60 py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-glow text-white shadow-sm shadow-accent/20">
              <Activity className="size-4" strokeWidth={2.5} />
            </span>
            <span className="bg-gradient-to-r from-ink to-muted bg-clip-text text-sm font-bold tracking-tight text-transparent">
              Growly
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Version */}
          <p className="font-mono text-[10px] text-faint">
            honest habit tracking &middot; v0.5
          </p>
        </div>
      </div>
    </footer>
  );
}
