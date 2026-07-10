import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page has top navigation bar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Logo is present (multiple Growly links exist on the page: nav + footer)
    const growlyLinks = page.getByRole("link", { name: /growly/i });
    await expect(growlyLinks.first()).toBeVisible({ timeout: 5000 });

    // Nav links
    await expect(
      page.getByRole("link", { name: /sign in/i }).first(),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByRole("link", { name: /get started/i }).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("login page navigates to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create an account/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("register page navigates to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Growly logo on login page goes to home", async ({ page }) => {
    await page.goto("/login");
    // Logo link — the first Growly link
    const logoLink = page.getByRole("link", { name: /growly/i }).first();
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("404 page returns something", async ({ page }) => {
    await page.goto("/nonexistent-route-xyz");
    // Next.js 404 should render something
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
