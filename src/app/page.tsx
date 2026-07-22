"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isCapacitor } from "@/lib/capacitor";
import { useAuth } from "@/hooks/useAuth";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { DownloadApkSection } from "@/components/landing/DownloadApkSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

/* ───────────────────────
   ── Main landing page ──
   ─────────────────────── */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ── Mobile app (Capacitor) only: if already logged in, skip landing page ──
  useEffect(() => {
    if (loading) return;
    if (isCapacitor() && user) {
      router.replace("/profile");
    }
  }, [loading, user, router]);

  // Show a brief loading screen only in Capacitor mode while we verify auth.
  if (isCapacitor() && (loading || user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* ── Nav (desktop only) ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Download APK ── */}
      <DownloadApkSection />

      {/* ── Features ── */}
      <FeaturesSection />

      {/* ── Final CTA ── */}
      <CtaSection />

      {/* ── Footer (desktop only) ── */}
      <Footer />
    </div>
  );
}
