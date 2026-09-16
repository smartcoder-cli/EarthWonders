import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ids = ["giza", "wall", "petra", "colosseum", "chichen", "machu", "taj", "christ"];
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "textures", "_previews");
mkdirSync(outDir, { recursive: true });

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  page.on("pageerror", (err) => console.error("pageerror", err));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("console", msg.text());
  });

  for (const id of ids) {
    const url = `http://127.0.0.1:5173/preview.html?id=${id}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(
      () => document.getElementById("label")?.dataset.ready === "1",
      { timeout: 45000 },
    );
    await new Promise((r) => setTimeout(r, 700));
    const dest = join(outDir, `${id}.png`);
    await page.screenshot({ path: dest, type: "png" });
    console.log("shot", dest);
  }

  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction(
    () => (document.getElementById("status")?.textContent ?? "").length > 4,
    { timeout: 60000 },
  );
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: join(outDir, "globe.png"), type: "png" });
  console.log("shot globe");

  for (const key of ["1", "4", "7"]) {
    await page.keyboard.press(key);
    await new Promise((r) => setTimeout(r, 7000));
    await page.screenshot({ path: join(outDir, `globe-${key}.png`), type: "png" });
    console.log("shot globe", key);
  }
} finally {
  await browser.close();
}
