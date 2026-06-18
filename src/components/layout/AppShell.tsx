"use client";

// App shell: sidebar (desktop) + bottom nav (mobile) + the page content area.
// Content is offset by the sidebar width on desktop and given a max width.

import type { ReactNode } from "react";
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
  return (
    <div className="min-h-screen">
      <Sidebar />
      <BottomNav />
      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 md:pb-10 md:pt-8">
          {children}
          <KeyboardShortcutsModal />
          <OnboardingWizard />
        </main>
      </div>
      <CelebrationManager />
      <AccentThemeApplier />
      <DevMode />
    </div>
  );
}
