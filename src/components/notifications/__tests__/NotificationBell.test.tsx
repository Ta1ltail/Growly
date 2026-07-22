// @vitest-environment happy-dom
//
// Tests for NotificationBell — a link with unread badge.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationBell } from "../NotificationBell";

// Mock next/link to render a plain <a> for testing
vi.mock("next/link", () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>{children}</a>
  ),
}));

// Mock useNotifications — must use vi.hoisted because vi.mock is hoisted
// above all variable declarations in the module
const mockUnreadCount = vi.hoisted(() => vi.fn(() => 0));
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({ unreadCount: mockUnreadCount() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUnreadCount.mockReturnValue(0);
});

describe("NotificationBell", () => {
  it("renders a link to /notifications", () => {
    render(<NotificationBell />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/notifications");
  });

  it("renders an SVG bell icon", () => {
    const { container } = render(<NotificationBell />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("does not show badge when unreadCount is 0", () => {
    mockUnreadCount.mockReturnValue(0);
    const { container } = render(<NotificationBell />);
    const badge = container.querySelector(".bg-rose-500");
    expect(badge).toBeNull();
  });

  it("shows badge when unreadCount is > 0", () => {
    mockUnreadCount.mockReturnValue(3);
    const { container } = render(<NotificationBell />);
    const badge = container.querySelector(".bg-rose-500");
    expect(badge).toBeTruthy();
  });

  it("badge shows the unread count", () => {
    mockUnreadCount.mockReturnValue(5);
    render(<NotificationBell />);
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("badge shows 99+ when count > 99", () => {
    mockUnreadCount.mockReturnValue(150);
    render(<NotificationBell />);
    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("sets aria-label when unread count is 0", () => {
    mockUnreadCount.mockReturnValue(0);
    render(<NotificationBell />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("aria-label")).toBe("Notifications");
  });

  it("sets aria-label when unread count > 0", () => {
    mockUnreadCount.mockReturnValue(3);
    render(<NotificationBell />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("aria-label")).toBe("Notifications (3 unread)");
  });

  it("applies custom className", () => {
    const { container } = render(<NotificationBell className="custom-class" />);
    const link = container.querySelector(".custom-class");
    expect(link).toBeTruthy();
  });

  it("defaults to size 18", () => {
    const { container } = render(<NotificationBell />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("18");
    expect(svg?.getAttribute("height")).toBe("18");
  });
});
