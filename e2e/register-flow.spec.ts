import { test, expect } from "@playwright/test";

test.describe("Registration flow", () => {
  test("renders the register form with all inputs", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Heading
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible({ timeout: 15000 });

    // Username input
    await expect(
      page.getByLabel(/username/i),
    ).toBeVisible({ timeout: 10000 });

    // Email input
    await expect(
      page.getByLabel(/email address/i),
    ).toBeVisible({ timeout: 5000 });

    // Password input
    await expect(
      page.getByLabel(/^password$/i),
    ).toBeVisible({ timeout: 5000 });

    // Confirm password input
    await expect(
      page.getByLabel(/confirm password/i),
    ).toBeVisible({ timeout: 5000 });

    // Submit button
    await expect(
      page.getByRole("button", { name: /create account/i }),
    ).toBeVisible();
  });

  test("shows branding tagline on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Left panel branding — rendered inside a motion div with initial opacity: 0
    await expect(
      page.locator("h2").filter({ hasText: /start your journey/i }),
    ).toBeAttached({ timeout: 10000 });
  });

  test("social signup buttons are present", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const githubBtn = page.getByRole("button", { name: /github/i });
    await expect(githubBtn).toBeVisible({ timeout: 5000 });

    const googleBtn = page.getByRole("button", { name: /google/i });
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });

  test("has a link to sign in page", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("link", { name: /sign in/i }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("Growly logo navigates to home", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const logoLink = page.getByRole("link", { name: /growly/i }).first();
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("shows password mismatch error", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Fill form with mismatched passwords
    await page.getByLabel(/username/i).fill("testuser");
    await page.getByLabel(/email address/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("StrongP@ss1");
    await page.getByLabel(/confirm password/i).fill("DifferentP@ss1");

    await page.getByRole("button", { name: /create account/i }).click();

    // Should show error about mismatched passwords
    await expect(
      page.getByText(/passwords don't match/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows password too short error", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/username/i).fill("testuser");
    await page.getByLabel(/email address/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("Ab1");
    await page.getByLabel(/confirm password/i).fill("Ab1");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/at least 6 characters/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows username too short error", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/username/i).fill("a");
    await page.getByLabel(/email address/i).fill("test@example.com");
    await page.getByLabel(/^password$/i).fill("StrongP@ss1");
    await page.getByLabel(/confirm password/i).fill("StrongP@ss1");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/at least 2 characters/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator("#password");
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill("VisibleP@ss1");

    await expect(passwordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /show password/i }).first().click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /hide password/i }).first().click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("username input sanitizes special characters", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const usernameInput = page.getByLabel(/username/i);
    await usernameInput.fill("user@name!test");
    // The input's onChange replaces non-alphanumeric chars (except underscore)
    // The rendered value should not contain @ or !
    const value = await usernameInput.inputValue();
    expect(value).not.toContain("@");
    expect(value).not.toContain("!");
  });

  test("terms and privacy text is present", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/terms of service/i),
    ).toBeAttached({ timeout: 5000 });

    await expect(
      page.getByText(/privacy policy/i),
    ).toBeAttached({ timeout: 5000 });
  });

  // Full auth flow requires a running Supabase instance with valid env vars
  // and a test user account. Unskip and configure the test user credentials
  // in your .env or Playwright config:
  //
  //   TEST_USER_EMAIL=test@example.com
  //   TEST_USER_PASSWORD=TestP@ss123
  //   TEST_USER_USERNAME=testuser
  //
  test.skip("complete registration flow (requires Supabase)", async ({ page }) => {
    const testEmail = `e2e-${Date.now()}@test.growly.app`;
    const testPassword = "TestP@ss123";
    const testUsername = `e2e-${Date.now()}`;

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Fill the form
    await page.getByLabel(/username/i).fill(testUsername);
    await page.getByLabel(/email address/i).fill(testEmail);
    await page.getByLabel(/^password$/i).fill(testPassword);
    await page.getByLabel(/confirm password/i).fill(testPassword);

    // Submit
    await page.getByRole("button", { name: /create account/i }).click();

    // After successful registration, should redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await expect(page.locator("body")).not.toBeEmpty();

    // Create a habit
    await expect(
      page.getByRole("button", { name: /add habit/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /add habit/i }).click();
    await page.getByLabel(/habit name/i).fill("E2E test habit");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("E2E test habit")).toBeVisible();

    // Logout
    await page.getByRole("button", { name: /avatar/i }).click();
    await page.getByText(/sign out/i).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Login again
    await page.getByLabel(/email address/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // Verify the habit persists
    await page.goto("/habits");
    await expect(page.getByText("E2E test habit")).toBeVisible({
      timeout: 10000,
    });
  });
});
