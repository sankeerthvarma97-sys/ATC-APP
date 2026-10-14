import { test, expect } from "@playwright/test";

test.describe("AOCC Employee Directory & Credential Management E2E", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Unauthenticated access to /admin/employees/directory redirects to /login", async ({ page }) => {
    await page.goto("/admin/employees/directory");
    await page.waitForURL(/\/login\?callbackUrl=/, { timeout: 20000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl=");
  });

  test("2. Admin accesses /admin/employees/directory and verifies KPI counters & search", async ({ page }) => {
    await page.goto("/login");

    // Login as Admin
    await page.fill("input[aria-label='Email']", "admin@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    // Navigate to Employee Directory
    await page.goto("/admin/employees/directory");
    await expect(page.locator("text=AOCC Employee Directory & Credentials").first()).toBeVisible({ timeout: 20000 });

    // Verify KPI counters
    await expect(page.locator("text=Total Accounts").first()).toBeVisible();
    await expect(page.locator("text=Active Accounts").first()).toBeVisible();
    await expect(page.locator("text=Suspended / Locked").first()).toBeVisible();
    await expect(page.locator("text=Virtual Staff").first()).toBeVisible();

    // Verify search input
    const searchInput = page.locator("input[placeholder*='Search exact ID']");
    await expect(searchInput).toBeVisible();

    // Search exact ID
    await searchInput.fill("EMP-1001");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Maya Rao").first()).toBeVisible();

    // Verify Change My Password button is present
    await expect(page.locator("button:has-text('Change My Password')")).toBeVisible();
  });

  test("3. Staff Portal at /staff shows Employee ID banner, Directory Search & Password Change cards", async ({ page }) => {
    await page.goto("/login");

    // Login as Operations Staff
    await page.click("button:has-text('Operations Staff')");
    await page.fill("input[aria-label='Email']", "ground@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/staff/, { timeout: 30000 });

    await page.goto("/staff");
    // Verify welcome banner with ID badge
    await expect(page.locator("text=AIRPORT OPERATIONAL CLEARANCE").first()).toBeVisible();
    await expect(page.locator("text=ID:").first()).toBeVisible();

    // Verify the two core security cards
    await expect(page.locator("text=24/7 Employee Directory & ID Search").first()).toBeVisible();
    await expect(page.locator("text=Security: Change Password").first()).toBeVisible();

    // Verify password change form fields
    await expect(page.locator("input[placeholder='Current password']")).toBeVisible();
    await expect(page.locator("input[placeholder='New password']")).toBeVisible();
    await expect(page.locator("input[placeholder='Confirm password']")).toBeVisible();
  });
});
