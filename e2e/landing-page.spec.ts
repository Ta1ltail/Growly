import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero section with title and CTA buttons", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Hero section — motion components may start with opacity:0, so check
    // presence rather than visibility for the heading
    await expect(page.locator("h1")).toContainText(/make every day/i);

    // CTA buttons — these are <a> links, always visible
    await expect(
      page.getByRole("link", { name: /start your streak/i }),
    ).toBeVisible({ timeout: 8000 });

    // Sign-in link from nav bar
    const signIn = page.getByRole("link", { name: /sign in/i }).first();
    await expect(signIn).toBeVisible({ timeout: 5000 });
  });

  test("navigates to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("navigates to register page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("features section renders all feature cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Scroll to trigger lazy-loaded sections
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(1500);

    const features = [
      "Habit tracking",
      "Rich analytics",
      "Gamification",
      "Honest tracking",
      "Works offline",
      "Beautiful UI",
    ];

    for (const feature of features) {
      await expect(page.locator(`h3:has-text("${feature}")`).first()).toBeAttached({
        timeout: 5000,
      });
    }
  });

  test("trust bar section is present", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);

    await expect(
      page.getByText(/trusted by habit builders/i),
    ).toBeAttached({ timeout: 5000 });

    for (const name of ["Product Hunt", "TechCrunch", "Hacker News"]) {
      await expect(page.getByText(name).first()).toBeAttached();
    }
  });

  test("footer is present with links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await expect(
      page.getByText(/honest habit tracking/i),
    ).toBeAttached({ timeout: 5000 });

    await expect(page.getByText("Features").first()).toBeAttached();
    await expect(page.getByText("Privacy").first()).toBeAttached();
  });
});
