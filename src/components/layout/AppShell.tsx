"use client";

// App shell: sidebar (desktop) + bottom nav (mobile) + the page content area.
// Content is offset by the sidebar width on desktop and given a max width.

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { CelebrationManager } from "@/components/celebrations/CelebrationManager";
import { AccentThemeApplier } from "@/components/economy/AccentThemeApplier";
import { DevMode } from "@/components/devmode/DevMode";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { OnboardingWizard } from "@/components/ui/OnboardingWizard";

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <BottomNav />
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 md:pb-12 md:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
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
      <DevMode />
    </div>
  );
}
