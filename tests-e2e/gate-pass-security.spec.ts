import { test, expect } from "@playwright/test";

test.describe("AOCC Airside Gate Pass & Turnstile Security Subsystem E2E", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Admin logs in, opens Security & Gate Passes section and verifies KPI cards", async ({ page }) => {
    await page.goto("/login");

    // Login as Admin
    await page.fill("input[aria-label='Email']", "admin@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    // Navigate to Security & Gate Passes section
    await page.click("button:has-text('Security & Gate Passes')");
    await expect(page.locator("text=Security Screening & Airside Verification").first()).toBeVisible({ timeout: 15000 });

    // Verify Tab switcher buttons are present
    await expect(page.locator("button:has-text('Airside Gate Passes & Turnstiles')").first()).toBeVisible();
    await expect(page.locator("button:has-text('Passenger Tickets & Boarding')").first()).toBeVisible();

    // Verify KPI counters
    await expect(page.locator("text=Active Gate Passes").first()).toBeVisible();
    await expect(page.locator("text=Ramp Cleared (Zone D)").first()).toBeVisible();
    await expect(page.locator("text=Turnstile Granted").first()).toBeVisible();
    await expect(page.locator("text=Access Denied Incursions").first()).toBeVisible();

    // Verify turnstile scanner simulator is present
    await expect(page.locator("text=Turnstile Scanner & Clearance Validator").first()).toBeVisible();
    await expect(page.locator("text=Authorized Airside Passes Directory").first()).toBeVisible();
  });

  test("2. Admin simulates turnstile badge taps for authorized and expired passes", async ({ page }) => {
    await page.goto("/login");

    // Login as Admin
    await page.fill("input[aria-label='Email']", "admin@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    // Navigate to Security & Gate Passes
    await page.click("button:has-text('Security & Gate Passes')");
    await expect(page.locator("text=Security Screening & Airside Verification").first()).toBeVisible({ timeout: 15000 });

    // Tap on preset button for Capt. Rohit (Crew/Ramp)
    await page.click("button:has-text('Capt. Rohit (Crew/Ramp)')");

    // Click "Simulate Turnstile Tap"
    await page.click("button:has-text('Simulate Turnstile Tap')");

    // Verify ACCESS GRANTED feedback appears
    await expect(page.locator("text=ACCESS GRANTED").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Capt. Rohit Verma").first()).toBeVisible();

    // Tap on preset button for Meera (Expired)
    await page.click("button:has-text('Meera (Expired)')");
    await page.click("button:has-text('Simulate Turnstile Tap')");

    // Verify ACCESS DENIED feedback appears
    await expect(page.locator("text=ACCESS DENIED").first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Admin opens Issue Gate Pass dialog, enters details, and creates a pass", async ({ page }) => {
    await page.goto("/login");

    // Login as Admin
    await page.fill("input[aria-label='Email']", "admin@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    // Navigate to Security & Gate Passes
    await page.click("button:has-text('Security & Gate Passes')");
    await expect(page.locator("text=Security Screening & Airside Verification").first()).toBeVisible({ timeout: 15000 });

    // Click "Issue New Gate Pass"
    await page.click("button:has-text('Issue New Gate Pass')");
    await expect(page.locator("text=Issue Airside Gate Pass").first()).toBeVisible();

    // Fill new pass form
    await page.fill("input[placeholder*='Ramesh Varma']", "Sandeep Nair");
    await page.fill("input[placeholder*='IND-PASS-8821']", "IND-ENG-9941");
    await page.fill("input[placeholder*='Air India Ground / Siemens']", "Rolls-Royce Aero Engines");
    await page.fill("input[placeholder*='Routine baggage system inspection']", "Trent 1000 Turbofan diagnostic review");

    // Submit dialog
    await page.click("button:has-text('Authorize & Issue Pass')");

    // Verify Digital Security Pass Badge Modal is shown with Sandeep Nair
    await expect(page.locator("text=AIRPORT OPERATIONS CONTROL").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Sandeep Nair").first()).toBeVisible();
    await expect(page.locator("text=Rolls-Royce Aero Engines").first()).toBeVisible();
  });
});
