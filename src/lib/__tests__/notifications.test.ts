// Tests for notifications — mocks supabase client.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNotification } from "../notifications";

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("../supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createNotification", () => {
  it("inserts a notification with required fields", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await createNotification({
      userId: "user-1",
      type: "achievement",
      title: "New achievement!",
    });
    expect(result.error).toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith("notifications");
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-1",
      type: "achievement",
      title: "New achievement!",
      body: "",
      from_user: null,
      link: "",
    });
  });

  it("passes optional body, fromUser, and link", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await createNotification({
      userId: "user-2",
      type: "friend_request",
      title: "Friend request",
      body: "User wants to be friends",
      fromUser: "user-abc",
      link: "/friends",
    });
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-2",
      type: "friend_request",
      title: "Friend request",
      body: "User wants to be friends",
      from_user: "user-abc",
      link: "/friends",
    });
  });

  it("returns error message when insert fails", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "RLS violation" } });
    const result = await createNotification({
      userId: "user-1",
      type: "system",
      title: "Test",
    });
    expect(result.error).toBe("RLS violation");
  });

  it("handles system type", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await createNotification({
      userId: "user-1",
      type: "system",
      title: "System update",
    });
    expect(result.error).toBeUndefined();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "system" }),
    );
  });

  it("handles friend_accept type", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await createNotification({
      userId: "user-1",
      type: "friend_accept",
      title: "Friend accepted",
    });
    expect(result.error).toBeUndefined();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "friend_accept" }),
    );
  });
});
