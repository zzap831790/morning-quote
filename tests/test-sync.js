// Fires Android's once-a-day wake up by hand and checks when the closed-app reminder rings.
// How to run: from the folder that holds morning-quote, start a local server with
//   python3 -m http.server 8765
// then, with Playwright installed:
//   node morning-quote/tests/test-sync.js

const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--headless=new"] });
  const context = await browser.newContext({ permissions: ["notifications"] });
  const page = await context.newPage();
  await page.goto("http://localhost:8765/morning-quote/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await context.newCDPSession(page);
  await cdp.send("ServiceWorker.enable");
  const regId = await new Promise((res) => {
    cdp.on("ServiceWorker.workerRegistrationUpdated", (e) => { for (const r of e.registrations) if (r.scopeURL.includes("morning-quote")) res(r.registrationId); });
  });
  const fire = async () => { await cdp.send("ServiceWorker.dispatchPeriodicSyncEvent", { origin: "http://localhost:8765", registrationId: regId, tag: "morning-reminder" }); await page.waitForTimeout(800); };
  const count = () => page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).length);
  const today = await page.evaluate(() => dateKey(new Date()));
  const setNote = (note) => page.evaluate(async (n) => { const c = await caches.open("morning-quote-state"); await c.put("state", new Response(JSON.stringify(n))); await c.delete("reminded"); }, note);
  const clear = () => page.evaluate(async () => { for (const n of await (await navigator.serviceWorker.ready).getNotifications()) n.close(); });

  await setNote({ reminderOn: true, reminderTime: "00:00", lastReacted: null }); await fire();
  console.log((await count()) === 1 ? "PASS" : "FAIL", "closed-app reminder rings when due and not reacted");
  await clear(); await fire();
  console.log((await count()) === 0 ? "PASS" : "FAIL", "does not ring twice the same day");
  await clear(); await setNote({ reminderOn: true, reminderTime: "00:00", lastReacted: today }); await fire();
  console.log((await count()) === 0 ? "PASS" : "FAIL", "does not ring if already reacted today");
  await clear(); await setNote({ reminderOn: true, reminderTime: "23:59", lastReacted: null }); await fire();
  console.log((await count()) === 0 ? "PASS" : "FAIL", "does not ring before the reminder time");
  await clear(); await setNote({ reminderOn: false, reminderTime: "00:00", lastReacted: null }); await fire();
  console.log((await count()) === 0 ? "PASS" : "FAIL", "does not ring when reminder is off");
  await browser.close();
})();
