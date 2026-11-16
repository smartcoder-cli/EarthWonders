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

  console.log("1. Loading preview for Sagrada Família...");
  await page.goto("http://localhost:5173/preview.html?id=sagrada", { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => document.getElementById("label")?.dataset?.ready === "1", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200));

  // 1. 斜 45 度整体天际线全景
  await page.screenshot({ path: join(artifactDir, "verify_sagrada_skyline_overview.png") });
  console.log("Captured verify_sagrada_skyline_overview.png");

  // 2. 诞生立面经典正视角（对应水池倒影全景角度：东侧正面）
  await page.evaluate(() => {
    const { camera } = window.__preview || {};
    if (camera) {
      camera.position.set(230, 85, 30);
      camera.lookAt(0, 85, 0);
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: join(artifactDir, "verify_sagrada_nativity_canonical.png") });
  console.log("Captured verify_sagrada_nativity_canonical.png");

  // 3. 受难立面倾斜骨骼廊柱（西侧视角）
  await page.evaluate(() => {
    const { camera } = window.__preview || {};
    if (camera) {
      camera.position.set(-220, 80, 20);
      camera.lookAt(0, 75, 0);
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: join(artifactDir, "verify_sagrada_passion_bones.png") });
  console.log("Captured verify_sagrada_passion_bones.png");

  // 4. 钟楼威尼斯碎瓷马赛克石冠、中央耶稣基督四臂大十字架与圣母星特写
  await page.evaluate(() => {
    const { camera } = window.__preview || {};
    if (camera) {
      camera.position.set(70, 145, 90);
      camera.lookAt(0, 140, -10);
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: join(artifactDir, "verify_sagrada_spires_closeup.png") });
  console.log("Captured verify_sagrada_spires_closeup.png");

  // 5. 夜景多光谱模式（暖金泛光 + 圣母星冷蓝白星芒 + 基督十字圣光）
  await page.evaluate(() => {
    const { scene, group } = window.__preview || {};
    if (group?.userData?.setNightMode) {
      group.userData.setNightMode(true);
    }
    if (scene) {
      scene.background.setHex(0x060810);
      if (scene.fog) scene.fog.color.setHex(0x060810);
    }
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: join(artifactDir, "verify_sagrada_night_luminous.png") });
  console.log("Captured verify_sagrada_night_luminous.png");

  // 6. 主应用全景实景照片弹窗与 3D 地球场景验证
  console.log("2. Loading main app for Sagrada Família...");
  await page.goto("http://localhost:5173/?id=sagrada", { waitUntil: "load", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 6500)); // 等待飞行进入与地标加载

  // 点击实景照片对比按钮
  await page.evaluate(() => {
    const btn = document.querySelector('button[title*="实景"]') || document.querySelector('.reference-photo-btn') || document.getElementById('btn-ref-photo');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: join(artifactDir, "verify_sagrada_main_panorama_modal.png") });
  console.log("Captured verify_sagrada_main_panorama_modal.png");

} catch (err) {
  console.error("Screenshot test error:", err);
} finally {
  await browser.close();
}
