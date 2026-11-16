import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log("1. Visiting Eiffel Tower (?id=eiffel)...");
  await page.goto("http://localhost:5173/?id=eiffel", { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 6000));

  const btnOrbit = await page.$("#btn-drone-orbit");
  if (!btnOrbit) throw new Error("Missing #btn-drone-orbit");

  console.log("2. Starting orbit via keyboard 'O'...");
  await page.keyboard.press("o");
  await new Promise(r => setTimeout(r, 400));

  let info = await page.evaluate(() => ({
    active: document.getElementById("btn-drone-orbit")?.classList.contains("active"),
    text: document.getElementById("btn-drone-orbit")?.innerText.trim(),
    status: document.getElementById("status")?.innerText
  }));
  console.log("State after starting orbit:", info);
  if (!info.active) throw new Error("Orbit did not activate!");

  console.log("3. Orbiting for 2.5s (camera moving)...");
  const posStart = await page.evaluate(() => window.__viewer.camera.raw.position.toArray());
  await new Promise(r => setTimeout(r, 2500));
  const posEnd = await page.evaluate(() => window.__viewer.camera.raw.position.toArray());
  console.log("Position delta over 2.5s:", [
    (posEnd[0] - posStart[0]).toFixed(2),
    (posEnd[1] - posStart[1]).toFixed(2),
    (posEnd[2] - posStart[2]).toFixed(2)
  ]);

  console.log("4. Testing user gesture interruption: pointerdown on viewer canvas...");
  await page.mouse.click(700, 450);
  await new Promise(r => setTimeout(r, 400));

  info = await page.evaluate(() => ({
    active: document.getElementById("btn-drone-orbit")?.classList.contains("active"),
    text: document.getElementById("btn-drone-orbit")?.innerText.trim(),
    status: document.getElementById("status")?.innerText
  }));
  console.log("State after user clicked canvas to interrupt:", info);
  if (info.active) throw new Error("Orbit did not disengage upon user interaction!");

  console.log("5. Testing restart via clicking the dock button directly...");
  await page.click("#btn-drone-orbit");
  await new Promise(r => setTimeout(r, 400));
  info = await page.evaluate(() => ({
    active: document.getElementById("btn-drone-orbit")?.classList.contains("active"),
    text: document.getElementById("btn-drone-orbit")?.innerText.trim(),
    status: document.getElementById("status")?.innerText
  }));
  console.log("State after direct button click:", info);
  if (!info.active) throw new Error("Orbit did not restart on button click!");

  console.log("6. Testing stop via clicking dock button again...");
  await page.click("#btn-drone-orbit");
  await new Promise(r => setTimeout(r, 400));
  info = await page.evaluate(() => ({
    active: document.getElementById("btn-drone-orbit")?.classList.contains("active"),
    text: document.getElementById("btn-drone-orbit")?.innerText.trim(),
    status: document.getElementById("status")?.innerText
  }));
  console.log("State after stopping via button:", info);
  if (info.active) throw new Error("Orbit did not stop on button click!");

  console.log(">>> ALL ORBIT VERIFICATION CHECKS PASSED PERFECTLY! <<<");
  await browser.close();
})();
