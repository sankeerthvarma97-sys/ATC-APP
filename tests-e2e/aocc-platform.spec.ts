import { test, expect } from "@playwright/test";

test.describe("AOCC Aviation Platform End-to-End Suite", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("1. Login page loads with brand identity and dual-portal switcher", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/AOCC/i);
    await expect(page.locator("text=AOCC OPERATIONS GATEWAY").first()).toBeVisible();
    await expect(page.locator("text=Airport Operations Control Center").first()).toBeVisible();

    // Verify presence of clean dual-portal toggle buttons
    await expect(page.locator("button:has-text('Authority & Command')")).toBeVisible();
    await expect(page.locator("button:has-text('Operations Staff')")).toBeVisible();

    // Verify email and password input fields are ready
    await expect(page.locator("input[aria-label='Email']")).toBeVisible();
    await expect(page.locator("input[aria-label='Password']")).toBeVisible();

    // Verify collapsible stations directory
    await expect(page.locator("text=Who Is Logging In? Operational Stations Directory").first()).toBeVisible();
  });

  test("2. Unauthenticated access to /admin redirects to login with callbackUrl", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login\?callbackUrl=/, { timeout: 20000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl=");
  });

  test("3. Unauthenticated access to /staff redirects to login with callbackUrl", async ({ page }) => {
    await page.goto("/staff");
    await page.waitForURL(/\/login\?callbackUrl=/, { timeout: 20000 });
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
    const res = await request.get("/api/search?q=HYD");
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
    // Switch to Operations Staff portal
    await page.click("button:has-text('Operations Staff')");
    // Enter Gate Agent credentials
    await page.fill("input[aria-label='Email']", "gate@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    // Submit authentication
    await page.click("button[type='submit']");
    // Expect redirection to /staff/gate or /staff
    await page.waitForURL(/\/staff/, { timeout: 30000 });
    await expect(page.locator("body")).toContainText(/Gate|Aviation|Staff/i);
  });

  test("8. Super Admin authentication accesses National Command Center", async ({ page }) => {
    await page.goto("/login");
    // Authority portal mode is selected by default
    await page.fill("input[aria-label='Email']", "admin@gmail.com");
    await page.fill("input[aria-label='Password']", process.env.ADMIN_BOOTSTRAP_PASSWORD || "Sankeerth@80");
    // Submit authentication
    await page.click("button[type='submit']");
    // Expect redirection to /admin
    await page.waitForURL(/\/admin/, { timeout: 30000 });
    await expect(page.locator("text=AOCC AUTHORITY").first()).toBeVisible({ timeout: 25000 });
    await expect(page.locator("text=LIVE · COMMAND CENTER ONLINE").first()).toBeVisible({ timeout: 25000 });
  });

  test("9. Ticketing Agent authentication accesses booking engine", async ({ page }) => {
    await page.goto("/login");
    await page.click("button:has-text('Operations Staff')");
    await page.fill("input[aria-label='Email']", "ticket@aocc.test");
    await page.fill("input[aria-label='Password']", "AoccDemo!2026");
    await page.click("button[type='submit']");
    await page.waitForURL(/\/staff\/ticketing/, { timeout: 30000 });

    await expect(page.locator("body")).toContainText(/Ticketing|Booking|Check-in|Passenger/i);
  });

  test("10. Ticket Verification API strictly enforces RBAC authentication", async ({ request }) => {
    const res = await request.post("/api/tickets/verify", {
      data: { pnr: "SKY-DEMO1" },
    });
    // Unauthenticated callers without VERIFY_TICKET token must be rejected with 401
    expect(res.status()).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test("11. Mobile Viewport loads login cleanly without horizontal scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    await expect(page.locator("input[aria-label='Email']")).toBeVisible();
    await expect(page.locator("input[aria-label='Password']")).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
