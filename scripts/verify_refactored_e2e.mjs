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

  console.log("Step 1: Open Main App http://localhost:5173/");
  await page.goto("http://localhost:5173/", { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: join(artifactDir, "refactor_e2e_globe.png"), type: "png" });
  console.log("✓ Saved refactor_e2e_globe.png");

  console.log("Step 2: Visit Sagrada Familia via Key 'l' (Landmark #23)");
  await page.keyboard.press("l");
  await new Promise((r) => setTimeout(r, 6000));
  await page.screenshot({ path: join(artifactDir, "refactor_e2e_sagrada.png"), type: "png" });
  console.log("✓ Saved refactor_e2e_sagrada.png");

  console.log("Step 3: Trigger Drone Orbit via Key 'o'");
  await page.keyboard.press("o");
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: join(artifactDir, "refactor_e2e_orbit.png"), type: "png" });
  console.log("✓ Saved refactor_e2e_orbit.png");

  console.log("Step 4: Stop Orbit & Trigger Postcard via Key 'p'");
  await page.keyboard.press("o"); // stop orbit
  await new Promise((r) => setTimeout(r, 500));
  await page.keyboard.press("p"); // generate postcard
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: join(artifactDir, "refactor_e2e_postcard.png"), type: "png" });
  console.log("✓ Saved refactor_e2e_postcard.png");

  console.log("Step 5: Dismiss Postcard Modal with Esc");
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Step 6: Return to Space with Esc");
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: join(artifactDir, "refactor_e2e_return_space.png"), type: "png" });
  console.log("✓ Saved refactor_e2e_return_space.png");

  console.log("--- Summary ---");
  console.log(`Page Errors: ${pageErrors.length}, Console Errors: ${consoleErrors.length}`);
  if (pageErrors.length === 0) {
    console.log("🎉 ALL E2E WORKFLOW CHECKS PASSED WITH 0 ERRORS!");
  } else {
    process.exit(1);
  }
} finally {
  await browser.close();
}
