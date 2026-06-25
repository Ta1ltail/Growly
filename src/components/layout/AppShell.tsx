"use client";

// App shell: sidebar (desktop) + bottom nav (mobile) + the page content area.
// Content is offset by the sidebar width on desktop and given a max width.
// No AnimatePresence wrapper — individual pages have their own animate-fade-in
// entrance animation which avoids the layout-shifting bug where both exiting
// and entering pages occupy the DOM simultaneously during transitions.

import { type ReactNode, lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { CelebrationManager } from "@/components/celebrations/CelebrationManager";
import { AccentThemeApplier } from "@/components/economy/AccentThemeApplier";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { OnboardingWizard } from "@/components/ui/OnboardingWizard";

const DevModeLazy = lazy(() =>
  import("@/components/devmode/DevMode").then((m) => ({
    default: m.DevMode,
  })),
);

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <BottomNav />
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 md:pb-12 md:pt-8">
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
          <KeyboardShortcutsModal />
          <OnboardingWizard />
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
    </div>
  );
}
