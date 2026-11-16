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

const errors = [];

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });

  page.on("pageerror", (err) => {
    console.error("[PAGE_ERROR]", err.message);
    errors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("[CONSOLE_ERROR]", msg.text());
      errors.push(msg.text());
    }
  });

  console.log("1. Testing Preview Page: preview.html?id=hzmb");
  await page.goto("http://localhost:5173/preview.html?id=hzmb", { waitUntil: "networkidle0", timeout: 45000 });
  await page.waitForFunction(
    () => document.getElementById("label")?.dataset.ready === "1",
    { timeout: 30000 }
  );
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: join(artifactDir, "verify_split_hzmb_preview.png"), type: "png" });
  console.log("Captured verify_split_hzmb_preview.png");

  console.log("2. Testing Preview Page: preview.html?id=sagrada");
  await page.goto("http://localhost:5173/preview.html?id=sagrada", { waitUntil: "networkidle0", timeout: 45000 });
  await page.waitForFunction(
    () => document.getElementById("label")?.dataset.ready === "1",
    { timeout: 30000 }
  );
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: join(artifactDir, "verify_split_sagrada_preview.png"), type: "png" });
  console.log("Captured verify_split_sagrada_preview.png");

  console.log("3. Testing Main Application Globe View: /");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: join(artifactDir, "verify_split_main_globe.png"), type: "png" });
  console.log("Captured verify_split_main_globe.png");

  console.log("4. Testing Dynamic Landmark Fly-to: Giza Pyramid [Key 1]");
  await page.keyboard.press("1");
  await new Promise((r) => setTimeout(r, 5500));
  await page.screenshot({ path: join(artifactDir, "verify_split_fly_giza.png"), type: "png" });
  console.log("Captured verify_split_fly_giza.png");

  console.log("5. Testing Dynamic Landmark Fly-to: HZMB East Island [Key \\]");
  await page.keyboard.press("\\");
  await new Promise((r) => setTimeout(r, 6000));
  await page.screenshot({ path: join(artifactDir, "verify_split_fly_hzmb.png"), type: "png" });
  console.log("Captured verify_split_fly_hzmb.png");

  console.log("--- E2E Test Finished ---");
  if (errors.length === 0) {
    console.log("SUCCESS: 0 errors detected during full interactive workflow!");
  } else {
    console.warn(`WARNING: ${errors.length} errors recorded:`, errors);
  }
} finally {
  await browser.close();
}
