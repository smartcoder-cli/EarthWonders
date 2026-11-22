import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const artifactDir = "C:\\Users\\smart\\.gemini\\antigravity-cli\\brain\\543ca279-be62-4654-94a3-f53fd944ae3c";
mkdirSync(artifactDir, { recursive: true });

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
});

const pageErrors = [];
const consoleErrors = [];

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  page.on("pageerror", (err) => {
    console.error("[PAGE_ERROR]", err.message);
    pageErrors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("[CONSOLE_ERROR]", msg.text());
      consoleErrors.push(msg.text());
    }
  });

  console.log("Step 1: Open EarthWonders at http://localhost:5173/");
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4000));

  console.log("Step 2: Click Himeji Castle in wonder list");
  await page.waitForSelector('button[data-id="himeji"]', { timeout: 10000 });
  await page.click('button[data-id="himeji"]');

  // Flight duration is ~4.8s + model load time
  console.log("Step 3: Wait for camera flight and 3D model loading...");
  await new Promise((r) => setTimeout(r, 6500));

  const dayPath = join(artifactDir, "verify_himeji_day.png");
  await page.screenshot({ path: dayPath, type: "png" });
  console.log("✓ Saved verify_himeji_day.png");

  console.log("Step 4: Check Detail Panel & Photo comparison");
  const detailTitle = await page.$eval("#detail-title", (el) => el.textContent);
  console.log("Detail title:", detailTitle);

  console.log("Step 5: Toggle Night Mode");
  const btnNightmode = await page.$("#btn-nightmode");
  if (btnNightmode) {
    await btnNightmode.click();
    await new Promise((r) => setTimeout(r, 1500));
    const nightPath = join(artifactDir, "verify_himeji_night.png");
    await page.screenshot({ path: nightPath, type: "png" });
    console.log("✓ Saved verify_himeji_night.png");
    await btnNightmode.click(); // revert
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("Step 6: Toggle Wireframe Mode");
  const btnWireframe = await page.$("#btn-wireframe");
  if (btnWireframe) {
    await btnWireframe.click();
    await new Promise((r) => setTimeout(r, 1500));
    const wirePath = join(artifactDir, "verify_himeji_wireframe.png");
    await page.screenshot({ path: wirePath, type: "png" });
    console.log("✓ Saved verify_himeji_wireframe.png");
    await btnWireframe.click(); // revert
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("Step 7: Check Hotspot Pins");
  const hotspotPins = await page.$$(".hotspot-pin");
  console.log(`Found ${hotspotPins.length} hotspot pins for Himeji`);
  if (hotspotPins.length > 0) {
    await hotspotPins[0].click(); // Click Daitenshu & Shachihoko hotspot pin
    await new Promise((r) => setTimeout(r, 2500));
    const hotspotPath = join(artifactDir, "verify_himeji_hotspot.png");
    await page.screenshot({ path: hotspotPath, type: "png" });
    console.log("✓ Saved verify_himeji_hotspot.png");
  }

  console.log("All verifications completed!");
  console.log(`Page errors: ${pageErrors.length}, Console errors: ${consoleErrors.length}`);
} catch (err) {
  console.error("Verification failed:", err);
} finally {
  await browser.close();
}
