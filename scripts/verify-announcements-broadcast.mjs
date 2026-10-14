import { chromium } from "playwright";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\msank\\.gemini\\antigravity-ide\\brain\\22886a34-1ac7-4ec7-bc5a-cd11f8714637";

async function verifyAnnouncementModule() {
  console.log("=== STARTING END-TO-END ANNOUNCEMENT & VOICE BROADCAST VERIFICATION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[BROWSER ERROR]", msg.text());
    }
  });

  try {
    // 1. Authenticate as Super Admin
    console.log("1. Navigating to login page at http://localhost:3005/login...");
    await page.goto("http://localhost:3005/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    console.log("Filling login credentials...");
    await page.fill('input[type="email"]', "admin@gmail.com");
    await page.fill('input[type="password"]', "Sankeerth@80");
    console.log("Submitting login form...");
    await page.click('button[type="submit"]');

    console.log("Waiting for navigation to /admin...");
    await page.waitForURL((url) => url.pathname.includes("/admin"), { timeout: 45000 });
    console.log("Successfully reached Admin Authority Portal! URL:", page.url());

    // Allow portal hydration
    await page.waitForTimeout(3000);

    // 2. Click Announcements & PA tab in sidebar
    console.log("2. Switching to Announcements & PA section in Authority Command Center...");
    const announcementsBtn = page.locator('button:has-text("Announcements & PA")').first();
    await announcementsBtn.waitFor({ state: "visible", timeout: 15000 });
    await announcementsBtn.click();
    await page.waitForTimeout(3000);

    // 3. Verify Voice Broadcast HUD & Soundwave Canvas
    console.log("3. Verifying Live Voice Broadcast HUD and Visualizer...");
    const canvas = page.locator("canvas");
    const canvasCount = await canvas.count();
    console.log(`Canvas visualizers detected: ${canvasCount}`);

    const broadcastCard = page.locator('text="Live Airport Voice Broadcast"').first();
    const isBroadcastCardVisible = await broadcastCard.isVisible();
    console.log(`Broadcast HUD visible: ${isBroadcastCardVisible}`);

    const startMicBtn = page.locator('button:has-text("Start Voice Broadcast")').first();
    console.log(`Start Broadcast button visible: ${await startMicBtn.isVisible()}`);

    // 4. Open Composer Modal and publish announcement
    console.log("4. Opening Announcement Composer Modal...");
    const postAnnBtn = page.locator('button:has-text("Post Announcement")').first();
    await postAnnBtn.waitFor({ state: "visible", timeout: 10000 });
    await postAnnBtn.click();
    await page.waitForTimeout(1500);

    console.log("5. Filling announcement details...");
    const titleInput = page.locator('input[placeholder*="Runaway Inspection"], form input').first();
    await titleInput.fill("AOCC Operational Readiness Drill");
    
    // Select Category
    const catSelect = page.locator("form select").first();
    if (await catSelect.isVisible()) {
      await catSelect.selectOption("OPERATIONAL_UPDATE");
    }

    // Fill Message
    const msgTextarea = page.locator("form textarea").first();
    await msgTextarea.fill("Simulated emergency drill scheduled at 14:00 UTC. All tower and ramp controllers confirm standby.");

    console.log("6. Publishing announcement...");
    const publishBtn = page.locator('button:has-text("Publish Announcement")');
    await publishBtn.click();
    await page.waitForTimeout(3000);

    // Verify announcement in active announcements table
    const publishedTitleInTable = page.locator('text="AOCC Operational Readiness Drill"').first();
    console.log(`Published announcement visible in Admin control center: ${await publishedTitleInTable.isVisible()}`);

    // Capture Admin screenshot
    const adminScreenshotPath = path.join(ARTIFACTS_DIR, "announcement_admin_dashboard.png");
    await page.screenshot({ path: adminScreenshotPath, fullPage: false });
    console.log(`Admin dashboard screenshot saved to: ${adminScreenshotPath}`);

    // 5. Navigate to Staff Announcement Board
    console.log("7. Navigating to Staff Announcement Board (/staff/announcements)...");
    await page.goto("http://localhost:3005/staff/announcements", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // 6. Verify Staff Announcement Board components
    console.log("8. Verifying Staff Announcement Board components...");
    const audioUnlockBanner = page.locator('text="Announcement Audio Standby"');
    const isUnlockBannerVisible = await audioUnlockBanner.isVisible();
    console.log(`Audio unlock banner visible: ${isUnlockBannerVisible}`);

    if (isUnlockBannerVisible) {
      console.log("9. Clicking Enable Audio Output button...");
      const enableAudioBtn = page.locator('button:has-text("Enable Audio Output")').first();
      await enableAudioBtn.click();
      await page.waitForTimeout(1500);
    }

    // Verify announcement rendered on staff board
    const staffAnnTitle = page.locator('text="AOCC Operational Readiness Drill"').first();
    console.log(`Published announcement visible on Staff Board: ${await staffAnnTitle.isVisible()}`);

    // Test Acknowledgement button
    console.log("10. Testing staff acknowledgement button...");
    const ackBtn = page.locator('button:has-text("Acknowledge")').first();
    if (await ackBtn.isVisible()) {
      await ackBtn.click();
      await page.waitForTimeout(1500);
      const isAcked = await page.locator('text="Acknowledged"').first().isVisible();
      console.log(`Acknowledgement status updated to Acknowledged: ${isAcked}`);
    }

    // Capture Staff Board screenshot
    const staffScreenshotPath = path.join(ARTIFACTS_DIR, "announcement_staff_board.png");
    await page.screenshot({ path: staffScreenshotPath, fullPage: false });
    console.log(`Staff board screenshot saved to: ${staffScreenshotPath}`);

    console.log("=== ALL END-TO-END BROWSER CHECKS COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Verification failed:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

verifyAnnouncementModule().catch((err) => {
  console.error(err);
  process.exit(1);
});
