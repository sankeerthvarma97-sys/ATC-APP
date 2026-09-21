import { test, expect } from "@playwright/test";

test.describe("AOCC Aviation Platform End-to-End Suite", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });
  test("1. Login page loads with brand identity and role profiles", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/AOCC/i);
    await expect(page.locator("text=Airport Operations Control Center").first()).toBeVisible();
    await expect(page.locator("text=Multi-Portal Aviation Authority Access Gateway").first()).toBeVisible();

    // Verify presence of preset role login buttons
    await expect(page.locator("button:has-text('Gate Agent')")).toBeVisible();
    await expect(page.locator("button:has-text('Super Admin')")).toBeVisible();
    await expect(page.locator("button:has-text('ATC Controller')")).toBeVisible();
  });

  test("2. Unauthenticated access to /admin redirects to login with callbackUrl", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login\?callbackUrl=\/admin/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl=");
  });

  test("3. Unauthenticated access to /staff redirects to login with callbackUrl", async ({ page }) => {
    await page.goto("/staff");
    await page.waitForURL(/\/login\?callbackUrl=\/staff/);
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl=");
  });

  test("4. Production Health API endpoint returns 200 HEALTHY", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("HEALTHY");
    expect(data.service).toContain("AOCC");
    expect(typeof data.uptimeSeconds).toBe("number");
  });

  test("5. Fast Server-Side Global Search API returns selective records", async ({ request }) => {
    const res = await request.get("/api/search?q=JFK");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);
  });

  test("6. ICAO Flight Plan Dispatch API returns filed flight plans", async ({ request }) => {
    const res = await request.get("/api/flight-plans");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.flightPlans)).toBe(true);
  });

  test("7. Successful authentication as Gate Agent accesses staff operations", async ({ page }) => {
    await page.goto("/login");
    // Click Gate Agent quick-fill button
    await page.click("button:has-text('Gate Agent')");
    // Click Authenticate button
    await page.click("button[type='submit']");
    // Expect redirection to /staff/gate or /staff
    await page.waitForURL(/\/staff/);
    await expect(page.locator("body")).toContainText(/Gate|Aviation|Staff/i);
  });

  test("8. Super Admin authentication accesses National Command Center", async ({ page }) => {
    await page.goto("/login");
    // Click Super Admin quick-fill button
    await page.click("button:has-text('Super Admin')");
    // Click Authenticate button
    await page.click("button[type='submit']");
    // Expect redirection to /admin
    await page.waitForURL(/\/admin/);
    await expect(page.locator("text=AOCC AUTHORITY").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=LIVE · COMMAND CENTER ONLINE").first()).toBeVisible({ timeout: 15000 });
  });

  test("9. Ticketing Agent authentication accesses booking and passenger check-in", async ({ page }) => {
    await page.goto("/login");
    await page.click("button:has-text('Ticketing Agent')");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/staff\/ticketing/);

    await expect(page.locator("body")).toContainText(/Ticketing|Booking|Check-in|Passenger/i);
  });

  test("10. Tower Control portal renders ASDE-X Surface Movement Radar", async ({ page }) => {
    await page.goto("/login");
    await page.click("button:has-text('ATC Controller')");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/staff\/atc/);

    await expect(page.locator("text=ASDE-X SURFACE MOVEMENT RADAR").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=04L").first()).toBeAttached();
  });
});
