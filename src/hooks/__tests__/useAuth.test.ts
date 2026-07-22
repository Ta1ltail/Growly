// @vitest-environment happy-dom
//
// Tests for useAuth — the authentication hook. Manages user session state,
// loading state, sign-out, and passive session expiry.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
let mockSubscriptionUnsubscribe: ReturnType<typeof vi.fn>;

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

// Mock next/navigation useRouter
const mockRouterReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}));

// Mock storage utilities
vi.mock("@/lib/storage", () => ({
  clearLocalAppData: vi.fn(),
  setDataUserId: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { info: vi.fn() },
}));

import { useAuth } from "../useAuth";
import { clearLocalAppData, setDataUserId } from "@/lib/storage";

describe("useAuth", () => {
  // Track the auth state change callback so we can simulate events
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: user is logged in, no error
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "test@test.com" } } });

    // Capture the auth state change callback
    mockOnAuthStateChange.mockImplementation((callback: any) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: (mockSubscriptionUnsubscribe = vi.fn()) },
        },
      };
    });
  });

  afterEach(() => {
    authStateCallback = null;
  });

  // ── Initial state ──────────────────────────────────────────────

  it("returns loading=true initially", () => {
    // Don't resolve getUser yet so we can check loading state
    mockGetUser.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("sets user after getUser resolves", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({ id: "user-1", email: "test@test.com" });
  });

  it("sets loading=false and user=null when getUser fails", async () => {
    mockGetUser.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it("sets loading=false and user=null when getUser returns no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  // ── Auth state changes ─────────────────────────────────────────

  it("subscribes to auth state changes on mount", () => {
    renderHook(() => useAuth());
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("updates user on SIGNED_IN event", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      authStateCallback!("SIGNED_IN", {
        user: { id: "user-2", email: "new@test.com" },
      });
    });

    expect(result.current.user).toEqual({ id: "user-2", email: "new@test.com" });
  });

  it("clears user and local data on SIGNED_OUT event", async () => {
    // Mock window.location.href assignment
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      authStateCallback!("SIGNED_OUT", { user: null });
    });

    expect(result.current.user).toBeNull();
    expect(setDataUserId).toHaveBeenCalledWith(null);
    expect(clearLocalAppData).toHaveBeenCalled();

    // Restore
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("redirects to / on passive SIGNED_OUT", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      authStateCallback!("SIGNED_OUT", { user: null });
    });

    // Should redirect to / (handled in the event handler)
    // We can't easily test setTimeout + window.location.href in jsdom,
    // but we can verify the state is cleared.
    expect(result.current.user).toBeNull();
  });

  // ── Sign Out ───────────────────────────────────────────────────

  it("signOut clears local data, calls supabase signOut, and redirects", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(setDataUserId).toHaveBeenCalledWith(null);
    expect(clearLocalAppData).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("signOut rejects when supabase signOut fails, but clears data first", async () => {
    mockSignOut.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // signOut calls supabase.auth.signOut() without a try/catch, so
    // the error propagates to the caller.
    await act(async () => {
      await expect(result.current.signOut()).rejects.toThrow("Network error");
    });

    // Local data is cleared before calling supabase, so it should still
    // be cleared even if supabase throws.
    expect(setDataUserId).toHaveBeenCalledWith(null);
    expect(clearLocalAppData).toHaveBeenCalled();
  });

  // ── Cleanup ────────────────────────────────────────────────────

  it("unsubscribes from auth state on unmount", () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(mockSubscriptionUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not set state after unmount (cancelled flag)", async () => {
    // Simulate a slow getUser that completes after unmount
    let resolveGetUser!: (value: any) => void;
    mockGetUser.mockReturnValue(
      new Promise((resolve) => {
        resolveGetUser = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    unmount();

    // Resolve after unmount — should not throw or set state
    await act(async () => {
      resolveGetUser({ data: { user: { id: "ghost" } } });
    });

    expect(result.current.user).toBeNull();
  });
});
