// Checks that a slow internet connection does not hold up the quote: once the app has a saved
// copy, it shows it within a few seconds instead of waiting for every file to arrive.
// How to run: from the folder that holds morning-quote, with Playwright installed:
//   node morning-quote/tests/test-slow.js
// It starts its own server (tests/slow-server.py) on port 8766 and stops it at the end.

const { chromium, devices } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const URL = "http://localhost:8766/morning-quote/";
const flag = path.join(os.tmpdir(), "morning-quote-slow-" + process.pid);
const server = spawn("python3", [path.join(__dirname, "slow-server.py"), flag], { cwd: path.join(__dirname, "..", ".."), stdio: "ignore" });
const loading = () => document.getElementById("quote-text").textContent !== "Loading today's quote…";

(async () => {
  await new Promise((r) => setTimeout(r, 1000));
  const browser = await chromium.launch({ headless: false, args: ["--headless=new"] });
  const context = await browser.newContext({ ...devices["iPhone 13"], userAgent: devices["Pixel 5"].userAgent });
  const page = await context.newPage();

  // First visit at full speed: the service worker saves a copy of every file
  await page.goto(URL);
  await page.waitForFunction(loading);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.waitForFunction(loading);

  // Now every file takes 8 seconds. Four files in a row would be over 24 seconds.
  fs.writeFileSync(flag, "1");
  const started = Date.now();
  await page.evaluate(() => { document.getElementById("quote-text").textContent = "Loading today's quote…"; });
  page.reload().catch(() => {});
  const shown = await page.waitForFunction(loading, null, { timeout: 60000, polling: 200 }).then(() => true).catch(() => false);
  const seconds = (Date.now() - started) / 1000;
  const ok = shown && seconds < 8;
  console.log((ok ? "PASS" : "FAIL") + ` slow connection: quote ${shown ? "shown after " + seconds.toFixed(1) + " s" : "never shown"} (must be under 8 s)`);

  fs.rmSync(flag, { force: true });
  await browser.close();
  server.kill();
  process.exit(ok ? 0 : 1);
})();
