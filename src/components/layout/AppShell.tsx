"use client";

// App shell: sidebar (desktop) + bottom nav (mobile) + the page content area.
// Content is offset by the sidebar width on desktop and given a max width.
// Uses safe-area variables for mobile compatibility.

import { type ReactNode, lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { CelebrationManager } from "@/components/celebrations/CelebrationManager";
import { AccentThemeApplier } from "@/components/economy/AccentThemeApplier";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SyncIndicator } from "@/components/sync/SyncIndicator";
import { StorageQuotaWarning } from "@/components/sync/StorageQuotaWarning";
import { SyncWarningBanner } from "@/components/sync/SyncWarningBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { reloadCache } from "@/lib/store";
import { startReminderService, stopReminderService } from "@/lib/reminderService";
import { SoundManager } from "@/lib/sound/SoundManager";

const DevModeLazy = lazy(() =>
  import("@/components/devmode/DevMode").then((m) => ({
    default: m.DevMode,
  })),
);

const KeyboardShortcutsModalLazy = lazy(() =>
  import("@/components/ui/KeyboardShortcutsModal").then((m) => ({
    default: m.KeyboardShortcutsModal,
  })),
);

const OnboardingWizardLazy = lazy(() =>
  import("@/components/ui/OnboardingWizard").then((m) => ({
    default: m.OnboardingWizard,
  })),
);

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  const pathname = usePathname();

  // Preload sounds and start the reminder service on mount
  useEffect(() => {
    SoundManager.instance.preload();
    startReminderService();
    return () => stopReminderService();
  }, []);

  // Scroll position restoration: saves scroll position per route on every
  // scroll event, and restores it when navigating back to a previously
  // visited page. Uses sessionStorage so it survives soft navigations but
  // not full page reloads (intentional — a reload should start at the top).
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll:${pathname}`);
    if (saved) {
      // Use requestAnimationFrame to wait for the DOM to settle after mount
      const raf = requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname]);

  useEffect(() => {
    const prevPathname = pathname;
    const handleScroll = () => {
      // Only save the current page's scroll position (ignore during navigation)
      sessionStorage.setItem(`scroll:${prevPathname}`, String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      // Save on cleanup (navigation away) to capture the last position
      sessionStorage.setItem(`scroll:${prevPathname}`, String(window.scrollY));
    };
  }, [pathname]);

  // Pull-to-refresh: reloads app data cache from storage
  const ptrState = usePullToRefresh(async () => {
    reloadCache();
    // Brief delay so the refresh indicator is visible
    await new Promise((r) => setTimeout(r, 400));
  });

  return (
    <div className="min-h-screen bg-bg">
      <PullToRefreshIndicator
        pulling={ptrState.pulling}
        progress={ptrState.progress}
        refreshing={ptrState.refreshing}
      />
      <Sidebar />
      <BottomNav />
      <div className="md:pl-60">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-4 pb-[calc(4rem+var(--safe-area-bottom,0px))] pt-4 outline-none sm:px-6 md:pb-12 md:pt-8"
        >
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
          <Suspense fallback={null}>
            <KeyboardShortcutsModalLazy />
          </Suspense>
          <Suspense fallback={null}>
            <OnboardingWizardLazy />
          </Suspense>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            background: "var(--c-surface)",
            border: "1px solid var(--c-line)",
            color: "var(--c-ink)",
          },
        }}
      />
      <CelebrationManager />
      <AccentThemeApplier />
      <Suspense fallback={null}>
        <DevModeLazy />
      </Suspense>
      <SyncIndicator />
      <StorageQuotaWarning />
      <SyncWarningBanner />
    </div>
  );
}
