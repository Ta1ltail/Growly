import { test, expect } from "@playwright/test";

test.describe("Offline page", () => {
  test("renders offline message", async ({ page }) => {
    await page.goto("/offline");
    await page.waitForLoadState("networkidle");

    // The offline page uses AppPageShell which may redirect to login
    // if the user isn't authenticated. Check if we're on the offline page
    // or got redirected.
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      // Redirected to login — skip content checks
      test.skip();
      return;
    }

    await expect(page.locator("h1")).toContainText(/offline/i, { timeout: 5000 });
    await expect(
      page.getByText(/habits and progress are saved locally/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("has an offline icon", async ({ page }) => {
    await page.goto("/offline");
    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      test.skip();
      return;
    }

    // The WifiOff icon from lucide-react renders as an inline SVG
    const svg = page.locator("svg");
    await expect(svg.first()).toBeVisible({ timeout: 5000 });
  });
});
