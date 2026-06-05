/**
 * Screenshot script — takes Brand Pulse + Creative Momentum screenshots.
 * Uses real API response captured from /api/analyze, served via Playwright
 * route interception so the dashboard loads without waiting for Apify.
 *
 * Usage: npx tsx scripts/take-screenshots.ts
 */

import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.resolve(__dirname, "../public/screenshots");
const MOCK_RESPONSE_PATH = "/tmp/mock-api-response.json";

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const mockBody = fs.readFileSync(MOCK_RESPONSE_PATH, "utf8");

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Intercept /api/analyze — instant mock response, no Apify wait
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: mockBody });
  });

  console.log("Loading app...");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Click demo preset
  console.log("Clicking demo preset...");
  await page.getByRole("button", { name: /estée lauder vs lancôme/i }).click();

  // Wait for stage animations (~13.5s) + dashboard render
  console.log("Waiting for dashboard (~14s)...");
  await page.waitForFunction(
    () => document.body.innerText.includes("brands analyzed"),
    { timeout: 25000 }
  );
  await page.waitForTimeout(600);

  // Hide Next.js dev overlay and the search panel — keep only dashboard output
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-dialog],
      [data-nextjs-toast],
      #__next-build-indicator,
      button[data-nextjs-dev-tools-button] { display: none !important; }
    `,
  });
  await page.waitForTimeout(200);

  // Locate the dashboard card (tabs + content) — it's the div that contains "Brand Pulse" tab
  const dashCard = page.locator("div.rounded-xl").filter({ hasText: "Brand Pulse" }).first();
  const headToHead = page.locator("div.rounded-xl").filter({ hasText: "Head-to-Head" }).first();

  // ── Brand Pulse tab ────────────────────────────────────────────────────────
  console.log("Screenshotting Brand Pulse...");
  await page.getByRole("button", { name: /brand pulse/i }).first().click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  const dcBox = await dashCard.boundingBox();
  const hhBox = await headToHead.boundingBox().catch(() => null);

  if (dcBox) {
    const bottom = hhBox
      ? hhBox.y + hhBox.height + 20
      : dcBox.y + dcBox.height + 20;
    await page.screenshot({
      path: path.join(OUT_DIR, "brand-pulse.png"),
      clip: { x: dcBox.x - 8, y: dcBox.y - 8, width: dcBox.width + 16, height: bottom - dcBox.y + 16 },
    });
  } else {
    await dashCard.screenshot({ path: path.join(OUT_DIR, "brand-pulse.png") });
  }
  console.log("✅  brand-pulse.png");

  // ── Creative Momentum tab ──────────────────────────────────────────────────
  console.log("Screenshotting Creative Momentum...");
  await page.getByRole("button", { name: /creative momentum/i }).first().click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  const dcBox2 = await dashCard.boundingBox();
  if (dcBox2) {
    // Show top ~900px of the creative tab (Format, Hooks, CTAs)
    await page.screenshot({
      path: path.join(OUT_DIR, "creative-momentum.png"),
      clip: { x: dcBox2.x - 8, y: dcBox2.y - 8, width: dcBox2.width + 16, height: 900 },
    });
  } else {
    await dashCard.screenshot({ path: path.join(OUT_DIR, "creative-momentum.png") });
  }
  console.log("✅  creative-momentum.png");

  await browser.close();
  console.log(`\nSaved to ${path.relative(process.cwd(), OUT_DIR)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
