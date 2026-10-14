// Diagnostic script to authenticate as Super Admin and probe Staff Directory and Payroll APIs
import { chromium } from "playwright";

async function run() {
  console.log("=== DIAGNOSING STAFF DIRECTORY & PAYROLL ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    }
  });

  page.on("pageerror", (err) => {
    console.error("[BROWSER PAGE ERROR]", err.message);
  });

  // Step 1: Login
  console.log("1. Navigating to login...");
  await page.goto("http://127.0.0.1:3005/login");
  await page.fill('input[type="email"]', "admin@gmail.com");
  await page.fill('input[type="password"]', "Sankeerth@80");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log("Current URL after login:", page.url());

  // Step 2: Test API endpoints directly using the authenticated page context
  console.log("2. Testing API endpoints in authenticated context...");

  const testApi = async (url, options = {}) => {
    const res = await page.evaluate(async ({ url, options }) => {
      try {
        const r = await fetch(url, options);
        const text = await r.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}
        return { status: r.status, ok: r.ok, json, rawSnippet: text.slice(0, 200) };
      } catch (err) {
        return { error: err.message };
      }
    }, { url, options });
    return res;
  };

  const staffRes = await testApi("/api/employees");
  console.log("GET /api/employees ->", staffRes.status, "count:", staffRes.json?.employees?.length ?? staffRes.rawSnippet);

  const dirRes = await testApi("/api/employees/directory?page=1&limit=10");
  console.log("GET /api/employees/directory ->", dirRes.status, "totalCount:", dirRes.json?.totalCount, "records:", dirRes.json?.records?.length ?? dirRes.rawSnippet);

  const payrollRes = await testApi("/api/finance/payroll");
  console.log("GET /api/finance/payroll ->", payrollRes.status, "runs:", payrollRes.json?.runs?.length ?? payrollRes.rawSnippet);

  const previewRes = await testApi("/api/finance/payroll?preview=true");
  console.log("GET /api/finance/payroll?preview=true ->", previewRes.status, "preview:", previewRes.json?.preview ?? previewRes.rawSnippet);

  const salaryRes = await testApi("/api/finance/salary");
  console.log("GET /api/finance/salary ->", salaryRes.status, "roster:", salaryRes.json?.roster?.length ?? salaryRes.rawSnippet);

  // Step 3: Navigate to /admin/employees/directory
  console.log("3. Navigating to /admin/employees/directory...");
  await page.goto("http://127.0.0.1:3005/admin/employees/directory");
  await page.waitForTimeout(3000);
  const dirBody = await page.innerText("body");
  console.log("Directory page has 'Employee Directory'?", dirBody.includes("Employee Directory") || dirBody.includes("Personnel"));
  console.log("Directory page error message?", dirBody.includes("Failed") || dirBody.includes("Error") ? "YES" : "NO");

  // Step 4: Navigate to /authority and click Staff Directory
  console.log("4. Navigating to /authority...");
  await page.goto("http://127.0.0.1:3005/authority");
  await page.waitForTimeout(2000);

  // Take screenshot or check section
  console.log("Clicking Staff Directory in sidebar...");
  const staffBtn = page.locator('button:has-text("Staff Directory")');
  if (await staffBtn.count() > 0) {
    await staffBtn.first().click();
    await page.waitForTimeout(2000);
    const authBody = await page.innerText("body");
    console.log("Authority with Staff Directory loaded. Contains 'Airport Staff'?", authBody.includes("Airport Staff") || authBody.includes("Total Roster"));
  }

  // Step 5: Click Payroll & Salary
  console.log("Clicking Payroll & Salary in sidebar...");
  const payrollBtn = page.locator('button:has-text("Payroll & Salary")');
  if (await payrollBtn.count() > 0) {
    await payrollBtn.first().click();
    await page.waitForTimeout(2000);
    const payBody = await page.innerText("body");
    console.log("Payroll tab loaded. Contains 'Autonomous Payroll Scheduler'?", payBody.includes("Autonomous Payroll Scheduler") || payBody.includes("Payroll"));
    console.log("Does it contain error text?", payBody.includes("Failed to load") ? "YES: Failed to load" : "NO");
  }

  await browser.close();
  console.log("=== DIAGNOSIS COMPLETE ===");
}

run().catch(console.error);
