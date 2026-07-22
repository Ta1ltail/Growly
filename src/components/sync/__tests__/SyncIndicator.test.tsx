// @vitest-environment happy-dom
//
// Tests for SyncIndicator — sync status dot with animation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Hoisted mocks to avoid vi.mock hoisting issues
const mockGetSyncStatus = vi.hoisted(() => vi.fn(() => "idle"));
const mockSubscribeToSyncStatus = vi.hoisted(() => vi.fn(() => vi.fn()));
const mockUseAuth = vi.hoisted(() => vi.fn(() => ({ user: { id: "user-1" } })));

vi.mock("@/lib/supabase/sync", () => ({
  getSyncStatus: () => mockGetSyncStatus(),
  subscribeToSyncStatus: mockSubscribeToSyncStatus,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { SyncIndicator } from "../SyncIndicator";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSyncStatus.mockReturnValue("idle");
  mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
});

describe("SyncIndicator", () => {
  it("renders a status element with role='status'", () => {
    render(<SyncIndicator />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("is visible when syncing and user is logged in", () => {
    mockGetSyncStatus.mockReturnValue("syncing");
    const { container } = render(<SyncIndicator />);
    const el = container.querySelector('[role="status"]');
    expect(el?.className).toContain("opacity-100");
  });

  it("is hidden when idle and user is logged in", () => {
    mockGetSyncStatus.mockReturnValue("idle");
    const { container } = render(<SyncIndicator />);
    const el = container.querySelector('[role="status"]');
    expect(el?.className).toContain("opacity-0");
  });

  it("is hidden when no user", () => {
    mockUseAuth.mockReturnValue({ user: null as unknown as { id: string } });
    mockGetSyncStatus.mockReturnValue("error");
    const { container } = render(<SyncIndicator />);
    const el = container.querySelector('[role="status"]');
    expect(el?.className).toContain("opacity-0");
  });

  it("sets aria-label to 'Syncing' when syncing", () => {
    mockGetSyncStatus.mockReturnValue("syncing");
    render(<SyncIndicator />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-label")).toBe("Syncing");
  });

  it("sets aria-label to 'Sync error' when error", () => {
    mockGetSyncStatus.mockReturnValue("error");
    render(<SyncIndicator />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-label")).toBe("Sync error");
  });

  it("sets aria-label to 'Sync offline' when offline", () => {
    mockGetSyncStatus.mockReturnValue("offline");
    render(<SyncIndicator />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-label")).toBe("Sync offline");
  });

  it("subscribes to sync status changes", () => {
    render(<SyncIndicator />);
    expect(mockSubscribeToSyncStatus).toHaveBeenCalled();
  });

  it("shows spinning animation when syncing", () => {
    mockGetSyncStatus.mockReturnValue("syncing");
    const { container } = render(<SyncIndicator />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("applies correct color class for each status", () => {
    mockGetSyncStatus.mockReturnValue("error");
    const { container } = render(<SyncIndicator />);
    const el = container.querySelector('[role="status"]');
    expect(el?.className).toContain("bg-missed");
  });

  it("applies accent color when syncing", () => {
    mockGetSyncStatus.mockReturnValue("syncing");
    const { container } = render(<SyncIndicator />);
    const el = container.querySelector('[role="status"]');
    expect(el?.className).toContain("bg-accent");
  });
});
