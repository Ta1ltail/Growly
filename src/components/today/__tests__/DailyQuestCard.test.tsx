// @vitest-environment happy-dom
//
// Tests for DailyQuestCard — shows daily quest progress and claim button.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { DailyQuestCard } from "../DailyQuestCard";
import { SyncContext, type SyncContextValue } from "@/components/sync/SyncProvider";

// Default sync context for tests — simulates sync having completed (the
// realistic state when DailyQuestCard renders in production).
const DEFAULT_SYNC_VALUE: SyncContextValue = {
  syncReady: true,
  syncRetrying: false,
  syncRetryCount: 0,
  timedOut: false,
};

function renderWithSync(
  ui: ReactNode,
  syncValue: SyncContextValue = DEFAULT_SYNC_VALUE,
) {
  return render(
    <SyncContext.Provider value={syncValue}>
      {ui}
    </SyncContext.Provider>,
  );
}

// Mock store dependencies
const mockClaimDailyQuest = vi.fn();
const mockRefreshDailyQuest = vi.fn();
const mockUseAppDataSelector = vi.fn();

vi.mock("@/lib/store", () => ({
  useAppDataSelector: (sel: any) => mockUseAppDataSelector(sel),
  refreshDailyQuest: (...args: any[]) => mockRefreshDailyQuest(...args),
  claimDailyQuest: (...args: any[]) => mockClaimDailyQuest(...args),
}));

// Mock child components to simplify testing
vi.mock("@/components/ui/Card", () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
}));

vi.mock("@/components/ui/ProgressBar", () => ({
  ProgressBar: ({ value, color }: any) => <div data-testid="progress-bar" data-value={value} data-color={color} />,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DailyQuestCard", () => {
  function setQuest(overrides?: any) {
    const defaultQuest = {
      description: "Complete 3 health habits",
      target: 3,
      current: 0,
      reward: 10,
      category: "Health",
      claimed: false,
      ...overrides,
    };
    mockUseAppDataSelector.mockImplementation((sel: any) => {
      const data = { economy: { currentQuest: defaultQuest } };
      return sel(data);
    });
  }

  it("renders null when there is no quest", () => {
    mockUseAppDataSelector.mockReturnValue(undefined);
    const { container } = renderWithSync(<DailyQuestCard />);
    expect(container.innerHTML).toBe("");
  });

  it("does not call refreshDailyQuest when sync is not ready", () => {
    mockUseAppDataSelector.mockReturnValue(undefined);
    renderWithSync(<DailyQuestCard />, {
      syncReady: false,
      syncRetrying: false,
      syncRetryCount: 0,
      timedOut: false,
    });
    expect(mockRefreshDailyQuest).not.toHaveBeenCalled();
  });

  it("does call refreshDailyQuest when sync has timed out", () => {
    mockUseAppDataSelector.mockReturnValue(undefined);
    renderWithSync(<DailyQuestCard />, {
      syncReady: false,
      syncRetrying: true,
      syncRetryCount: 1,
      timedOut: true,
    });
    expect(mockRefreshDailyQuest).toHaveBeenCalledTimes(1);
  });

  it("renders quest title 'Daily Quest'", () => {
    setQuest();
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText("Daily Quest")).toBeTruthy();
  });

  it("renders quest description", () => {
    setQuest({ description: "Read for 30 minutes" });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText("Read for 30 minutes")).toBeTruthy();
  });

  it("shows progress current/target", () => {
    setQuest({ current: 1, target: 3 });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("/3")).toBeTruthy();
  });

  it("shows reward amount", () => {
    setQuest({ reward: 15 });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText("+15")).toBeTruthy();
  });

  it("shows category badge when category is provided", () => {
    setQuest({ category: "Workout" });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText("Workout")).toBeTruthy();
  });

  it("does not show category badge when category is null", () => {
    setQuest({ category: undefined });
    renderWithSync(<DailyQuestCard />);
    expect(screen.queryByText("Health")).toBeNull();
  });

  it("shows claim button when completed and unclaimed", () => {
    setQuest({ current: 3, target: 3, claimed: false });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText(/Claim 10 coins/)).toBeTruthy();
  });

  it("does NOT show claim button when not completed", () => {
    setQuest({ current: 1, target: 3, claimed: false });
    renderWithSync(<DailyQuestCard />);
    expect(screen.queryByText(/Claim/)).toBeNull();
  });

  it("does NOT show claim button when already claimed", () => {
    setQuest({ current: 3, target: 3, claimed: true });
    renderWithSync(<DailyQuestCard />);
    // "Claimed" text appears in the claimed state, so use a more specific regex
    expect(screen.queryByText(/Claim \d+ coins/)).toBeNull();
  });

  it("calls claimDailyQuest when claim button is clicked", () => {
    setQuest({ current: 3, target: 3, claimed: false });
    renderWithSync(<DailyQuestCard />);
    fireEvent.click(screen.getByText(/Claim \d+ coins/));
    expect(mockClaimDailyQuest).toHaveBeenCalledTimes(1);
  });

  it("shows claimed state when claimed is true", () => {
    setQuest({ current: 3, target: 3, claimed: true });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText(/Claimed/)).toBeTruthy();
  });

  it("shows 'Resets at midnight' when claimed", () => {
    setQuest({ current: 3, target: 3, claimed: true });
    renderWithSync(<DailyQuestCard />);
    expect(screen.getByText(/Resets at midnight/)).toBeTruthy();
  });

  it("calls refreshDailyQuest on mount when sync is ready", () => {
    setQuest();
    renderWithSync(<DailyQuestCard />);
    expect(mockRefreshDailyQuest).toHaveBeenCalledTimes(1);
  });

  it("renders progress bar with correct percentage", () => {
    setQuest({ current: 2, target: 4 });
    const { container } = renderWithSync(<DailyQuestCard />);
    const bar = container.querySelector('[data-testid="progress-bar"]');
    expect(bar?.getAttribute("data-value")).toBe("50");
  });
});
