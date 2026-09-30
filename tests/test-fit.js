// Shows all 40 quotes on four phone sizes and reports any that do not fit on one screen.
// How to run: from the folder that holds morning-quote, start a local server with
//   python3 -m http.server 8765
// then, with Playwright installed:
//   node morning-quote/tests/test-fit.js

const { chromium } = require("playwright");
const sizes = [["iPhone 13, Safari tab", 390, 664], ["iPhone 13, from Home Screen", 390, 800], ["iPhone SE, from Home Screen", 375, 647], ["Android mid-size, installed", 393, 780]];
(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--headless=new"] });
  for (const [name, w, h] of sizes) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.clock.install({ time: new Date(2026, 8, 30, 7, 0) });
    await page.goto("http://localhost:8765/morning-quote/");
    await page.waitForFunction(() => document.getElementById("quote-text").textContent !== "Loading today's quote…");
    const over = [];
    for (const tr of ["stoic", "russian", "scifi", "scripture"]) {
      await page.selectOption("#tradition", tr);
      for (let d = 0; d < 10; d++) {
        await page.clock.setSystemTime(new Date(2026, 8, 30 + d, 7, 0));
        await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
        const r = await page.evaluate(() => ({ id: current.id, len: current.text.length, extra: document.documentElement.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth > innerWidth }));
        if (r.extra > 0 || r.wide) over.push(`${r.id}(${r.len} chars) +${r.extra}px${r.wide ? " SIDEWAYS" : ""}`);
      }
    }
    console.log(`${name} ${w}x${h}: ${over.length ? over.length + " spill: " + over.join(", ") : "all 40 fit on one screen"}`);
    await page.close();
  }
  await browser.close();
})();
