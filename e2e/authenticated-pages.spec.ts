import { test, expect } from "@playwright/test";

// The app uses Next.js middleware (src/proxy.ts) that checks for a valid
// Supabase auth session on every request. Without a real session cookie,
// all non-public routes are redirected to /login.
//
// To test authenticated pages end-to-end, you need:
// 1. A running Supabase instance with valid env vars
// 2. A test user account (or the seed users from migration 005)
// 3. The test to log in via the /login form before navigating to protected pages
//
// These tests document the expected redirect behavior when no session exists
// and provide the login flow that would be needed for full E2E auth testing.

test.describe("Authenticated pages", () => {
  test("redirects to login when no session exists", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    // Middleware redirects to /login?redirect=%2Fdashboard
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect=%2Fdashboard");
  });

  test("today page redirects to login without session", async ({ page }) => {
    await page.goto("/today", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/login");
  });

  test("habits page redirects to login without session", async ({ page }) => {
    await page.goto("/habits", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/login");
  });

  test("stats page redirects to login without session", async ({ page }) => {
    await page.goto("/stats", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/login");
  });

  test("achievements page redirects to login without session", async ({ page }) => {
    await page.goto("/achievements", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/login");
  });
});
