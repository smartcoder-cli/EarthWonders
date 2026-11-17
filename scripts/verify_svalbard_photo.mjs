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

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  console.log("Navigating to http://localhost:5173/?id=svalbard");
  await page.goto("http://localhost:5173/?id=svalbard", { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 6500));

  // 截取全屏视图（包含 3D 模型与实景图对照面板）
  const fullScreenshot = join(artifactDir, "verify_svalbard_comparison_full.png");
  await page.screenshot({ path: fullScreenshot, type: "png" });
  console.log("✓ Saved full screenshot:", fullScreenshot);

  // 单独截取实景对照卡片元素
  const photoSection = await page.$("#photo-comparison");
  if (photoSection) {
    const photoScreenshot = join(artifactDir, "verify_svalbard_photo_card.png");
    await photoSection.screenshot({ path: photoScreenshot, type: "png" });
    console.log("✓ Saved photo card screenshot:", photoScreenshot);
  }

  // 截取右侧详情面板
  const detailPanel = await page.$("#detail");
  if (detailPanel) {
    const detailScreenshot = join(artifactDir, "verify_svalbard_detail_panel.png");
    await detailPanel.screenshot({ path: detailScreenshot, type: "png" });
    console.log("✓ Saved detail panel screenshot:", detailScreenshot);
  }

  console.log("E2E verification of Svalbard photo completed successfully.");
} finally {
  await browser.close();
}
