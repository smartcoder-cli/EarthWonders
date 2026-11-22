import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const artifactDir = "C:\\Users\\smart\\.gemini\\antigravity-cli\\brain\\543ca279-be62-4654-94a3-f53fd944ae3c";
mkdirSync(artifactDir, { recursive: true });

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist", "--window-size=1600,1000"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

  console.log("Navigating to http://localhost:5173/?id=himeji...");
  await page.goto("http://localhost:5173/?id=himeji", { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 7000));

  // 1. 全景日间页面截图 (包含左侧详情、实景照片、3D模型、右侧地标导航)
  const pageDayPath = join(artifactDir, "himeji_page_day.png");
  await page.screenshot({ path: pageDayPath, type: "png" });
  console.log("✓ Saved himeji_page_day.png");

  // 2. 纯净 3D 模型近景鉴赏截图 (隐藏侧边栏面板以突出 3D 飞檐与天守群精细建模)
  await page.evaluate(() => {
    const detail = document.getElementById("detail");
    const panel = document.getElementById("panel");
    const btnMobile = document.getElementById("btn-mobile-list");
    const hotspotLayer = document.getElementById("hotspot-layer");
    if (detail) detail.style.display = "none";
    if (panel) panel.style.display = "none";
    if (btnMobile) btnMobile.style.display = "none";
    if (hotspotLayer) hotspotLayer.style.display = "none";
  });
  await new Promise((r) => setTimeout(r, 800));

  const modelCloseupPath = join(artifactDir, "himeji_model_pure.png");
  await page.screenshot({ path: modelCloseupPath, type: "png" });
  console.log("✓ Saved himeji_model_pure.png");

  // 恢复 UI 显示
  await page.evaluate(() => {
    const detail = document.getElementById("detail");
    const panel = document.getElementById("panel");
    const btnMobile = document.getElementById("btn-mobile-list");
    const hotspotLayer = document.getElementById("hotspot-layer");
    if (detail) detail.style.display = "";
    if (panel) panel.style.display = "";
    if (btnMobile) btnMobile.style.display = "";
    if (hotspotLayer) hotspotLayer.style.display = "";
  });
  await new Promise((r) => setTimeout(r, 500));

  // 3. 白鹭夜光投光效果截图 (Night Mode)
  console.log("Toggling Night Mode...");
  const btnNightmode = await page.$("#btn-nightmode");
  if (btnNightmode) {
    await page.evaluate((btn) => btn.click(), btnNightmode);
    await new Promise((r) => setTimeout(r, 1500));
    const nightPath = join(artifactDir, "himeji_page_night.png");
    await page.screenshot({ path: nightPath, type: "png" });
    console.log("✓ Saved himeji_page_night.png");
    // 恢复日间
    await page.evaluate((btn) => btn.click(), btnNightmode);
    await new Promise((r) => setTimeout(r, 500));
  }

  // 4. 点击热点 1：五重六阶大天守与金光鯱瓦
  console.log("Clicking Hotspot 1 (大天守与金光鯱瓦)...");
  await page.evaluate(() => {
    const pins = document.querySelectorAll(".hotspot-pin");
    if (pins[0]) pins[0].click();
  });
  await new Promise((r) => setTimeout(r, 3000));
  const spot1Path = join(artifactDir, "himeji_hotspot_shachihoko.png");
  await page.screenshot({ path: spot1Path, type: "png" });
  console.log("✓ Saved himeji_hotspot_shachihoko.png");

  // 5. 点击热点 2：连立式天守群与四合渡橹迷宫
  console.log("Clicking Hotspot 2 (连立式天守群与四合渡橹迷宫)...");
  await page.evaluate(() => {
    const pins = document.querySelectorAll(".hotspot-pin");
    if (pins[1]) pins[1].click();
  });
  await new Promise((r) => setTimeout(r, 3000));
  const spot2Path = join(artifactDir, "himeji_hotspot_renritsu.png");
  await page.screenshot({ path: spot2Path, type: "png" });
  console.log("✓ Saved himeji_hotspot_renritsu.png");

  console.log("All 5 showcase screenshots captured successfully!");
} catch (err) {
  console.error("Capture failed:", err);
} finally {
  await browser.close();
}
