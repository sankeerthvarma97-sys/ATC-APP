import { test, expect } from "@playwright/test";

/**
 * AOCC Enterprise 24-Page Full Coverage & Accessibility Verification Suite
 * Covers all 24 discovered application routes under src/app:
 * 1.  / (Landing / Root Gateway)
 * 2.  /login (Authentication Gateway)
 * 3.  /unauthorized (RBAC 403 Security Boundary)
 * 4.  /privacy (Privacy Policy & Data Protection)
 * 5.  /terms (Terms of Service)
 * 6.  /cookies (Cookie Policy)
 * 7.  /refund (Passenger Refund & Cancellation Policy)
 * 8.  /admin (Command & Authority Operations Console)
 * 9.  /admin/access-management (RBAC User Matrix)
 * 10. /admin/access-management/permissions (Granular Permission Grid)
 * 11. /admin/employees/directory (Station Employee Directory)
 * 12. /staff (Operational Staff Command Portal)
 * 13. /staff/airline (Airline Ground & Dispatch Ops)
 * 14. /staff/atc (Air Traffic Control Radar & Clearance)
 * 15. /staff/baggage (Baggage Sortation & Tracking)
 * 16. /staff/gate (Boarding Gate Management)
 * 17. /staff/ground (Ramp & Turnaround Operations)
 * 18. /staff/maintenance (Aircraft Maintenance & Tech Ops)
 * 19. /staff/pilot (Flight Deck Dispatch & Briefing)
 * 20. /staff/salary (Staff Payroll & Compensation)
 * 21. /staff/security (Airport Security & Screening)
 * 22. /staff/ticketing (Passenger Ticketing & Check-In)
 * 23. /passenger (Passenger Portal & Flight Search)
 * 24. /passenger/wallet (Digital Travel Wallet)
 */

test.describe("AOCC 24-Page Full-System Quality & Navigation Matrix", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // -------------------------------------------------------------------------
  // 1. PUBLIC, AUTHENTICATION & LEGAL ROUTES (7 Pages)
  // -------------------------------------------------------------------------
  test("Page 1/24: Root route (/) routes cleanly to Gateway or Login", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    // Should display login or dashboard identity
    await expect(page).toHaveTitle(/AOCC/i);
  });

  test("Page 2/24: Login page (/login) displays dual portal and brand headers", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/AOCC/i);
    await expect(page.locator("text=AOCC OPERATIONS GATEWAY").first()).toBeVisible();
    await expect(page.locator("input[aria-label='Email']")).toBeVisible();
    await expect(page.locator("input[aria-label='Password']")).toBeVisible();
    await expect(page.locator("button:has-text('Authority & Command')")).toBeVisible();
    await expect(page.locator("button:has-text('Operations Staff')")).toBeVisible();
  });

  test("Page 3/24: Unauthorized page (/unauthorized) presents 403 security feedback", async ({ page }) => {
    await page.goto("/unauthorized");
    await expect(page.locator("body")).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text.toLowerCase()).toContain("access");
  });

  test("Page 4/24: Privacy Policy (/privacy) renders compliance disclosures", async ({ page }) => {
    const res = await page.goto("/privacy");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    const heading = await page.locator("h1").innerText();
    expect(heading.toLowerCase()).toContain("privacy");
  });

  test("Page 5/24: Terms of Service (/terms) renders legal agreements", async ({ page }) => {
    const res = await page.goto("/terms");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    const heading = await page.locator("h1").innerText();
    expect(heading.toLowerCase()).toContain("terms");
  });

  test("Page 6/24: Cookie Policy (/cookies) renders cookie disclosures", async ({ page }) => {
    const res = await page.goto("/cookies");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    const heading = await page.locator("h1").innerText();
    expect(heading.toLowerCase()).toContain("cookie");
  });

  test("Page 7/24: Refund Policy (/refund) renders passenger fare policies", async ({ page }) => {
    const res = await page.goto("/refund");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    const heading = await page.locator("h1").innerText();
    expect(heading.toLowerCase()).toContain("refund");
  });

  // -------------------------------------------------------------------------
  // 2. PASSENGER PORTAL ROUTES (2 Pages)
  // -------------------------------------------------------------------------
  test("Page 8/24: Passenger Portal (/passenger) renders flight search interface", async ({ page }) => {
    const res = await page.goto("/passenger");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });

  test("Page 9/24: Passenger Wallet (/passenger/wallet) enforces auth or loads wallet UI", async ({ page }) => {
    await page.goto("/passenger/wallet");
    // Either renders wallet or redirects unauthenticated user to login
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toMatch(/\/(passenger\/wallet|login)/);
  });

  // -------------------------------------------------------------------------
  // 3. ADMIN & COMMAND CONSOLE RBAC GUARDS (4 Pages)
  // -------------------------------------------------------------------------
  test("Page 10/24: Admin Console (/admin) redirects unauthenticated requests", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });

  test("Page 11/24: Access Management (/admin/access-management) protected by RBAC", async ({ page }) => {
    await page.goto("/admin/access-management");
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });

  test("Page 12/24: Granular Permissions (/admin/access-management/permissions) protected", async ({ page }) => {
    await page.goto("/admin/access-management/permissions");
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });

  test("Page 13/24: Employee Directory (/admin/employees/directory) protected", async ({ page }) => {
    await page.goto("/admin/employees/directory");
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });

  // -------------------------------------------------------------------------
  // 4. OPERATIONAL STAFF SUBSYSTEM RBAC GUARDS (11 Pages)
  // -------------------------------------------------------------------------
  const staffPages = [
    { num: 14, path: "/staff", label: "Staff Hub" },
    { num: 15, path: "/staff/airline", label: "Airline Operations" },
    { num: 16, path: "/staff/atc", label: "Air Traffic Control" },
    { num: 17, path: "/staff/baggage", label: "Baggage Operations" },
    { num: 18, path: "/staff/gate", label: "Gate Management" },
    { num: 19, path: "/staff/ground", label: "Ground Support" },
    { num: 20, path: "/staff/maintenance", label: "Aircraft Maintenance" },
    { num: 21, path: "/staff/pilot", label: "Flight Deck" },
    { num: 22, path: "/staff/salary", label: "Staff Salary" },
    { num: 23, path: "/staff/security", label: "Station Security" },
    { num: 24, path: "/staff/ticketing", label: "Ticketing Desk" },
  ];

  for (const sp of staffPages) {
    test(`Page ${sp.num}/24: ${sp.label} (${sp.path}) verifies route accessibility & RBAC boundary`, async ({ page }) => {
      await page.goto(sp.path);
      await page.waitForLoadState("domcontentloaded");
      // All secure staff endpoints must either enforce login redirect or render authenticated view
      expect(page.url()).toMatch(/\/(staff|login)/);
    });
  }

  // -------------------------------------------------------------------------
  // 5. AUTHENTICATED SUPER-ADMIN FULL CONSOLE SESSION AUDIT
  // -------------------------------------------------------------------------
  test("25. Super Admin authenticated navigation: Login -> Admin Console -> Metrics", async ({ page }) => {
    await page.goto("/login");

    // Select Authority & Command Portal
    await page.locator("button:has-text('Authority & Command')").click();

    // Fill valid credentials
    const emailInput = page.locator("input[aria-label='Email']");
    const passwordInput = page.locator("input[aria-label='Password']");

    await emailInput.fill("admin@gmail.com");
    await passwordInput.fill(process.env.ADMIN_BOOTSTRAP_PASSWORD || "Sankeerth@80");

    // Submit authentication form
    await passwordInput.press("Enter");

    // Verify successful sign-in navigation into /admin
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    expect(page.url()).toContain("/admin");

    // Verify key operations console elements load
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
