// Checks every feature on a phone-sized screen: quote, emoji, comment cap, streak, traditions, reminder, offline, manifest.
// How to run: from the folder that holds morning-quote, start a local server with
//   python3 -m http.server 8765
// then, with Playwright installed:
//   node morning-quote/tests/test-app.js <folder for screenshots>

const { chromium, devices } = require("playwright");
const URL = "http://localhost:8765/morning-quote/";
const shots = process.argv[2];
let failures = 0;
const check = (ok, what) => { console.log((ok ? "PASS " : "FAIL ") + what); if (!ok) failures++; };

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--headless=new"] });
  const context = await browser.newContext({ ...devices["iPhone 13"], userAgent: devices["Pixel 5"].userAgent, permissions: ["notifications"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  // Fix the clock so "today" is known: 30 Sep 2026, 06:58
  await page.clock.install({ time: new Date(2026, 8, 30, 6, 58, 0) });
  await page.goto(URL);
  await page.waitForFunction(() => document.getElementById("quote-text").textContent !== "Loading today's quote…");

  const quotes = (await (await fetch(URL + "quotes.json")).json()).quotes;
  const day = Math.floor(Date.UTC(2026, 8, 30) / 86400000);
  const expectStoic = quotes.filter((q) => q.tradition === "stoic")[day % 10];
  check((await page.textContent("#quote-text")) === expectStoic.text, "shows today's Stoic quote: " + expectStoic.id);
  const src = await page.textContent("#quote-source");
  check(src.includes(expectStoic.author) && src.includes(expectStoic.book), "source line has author and book: " + src);
  check((await page.textContent("#quote-translator")).includes("George Long"), "translator line shows George Long");
  check((await page.textContent("#date")).includes("September"), "date shown: " + (await page.textContent("#date")));
  check((await page.textContent("#streak")) === "Start a streak", "no streak before first reaction");
  check((await page.locator("#emojis button").count()) === 5, "five emoji buttons");
  await page.screenshot({ path: shots + "/1-fresh.png" });

  // React
  await page.locator("#emojis button").nth(1).click();
  check((await page.locator("#emojis button").nth(1).getAttribute("aria-pressed")) === "true", "tapped emoji is marked");
  check((await page.textContent("#streak")) === "🔥 1 day", "streak becomes 1 day");
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem("morning-quote-v1")));
  check(stored.days["2026-09-30"].emoji === "🤔" && stored.days["2026-09-30"].quoteId === expectStoic.id, "reaction stored on the device");
  await page.locator("#emojis button").nth(1).click();
  check((await page.textContent("#streak")) === "Start a streak", "tapping again undoes it");
  await page.locator("#emojis button").nth(0).click();

  // Comment capped at 200
  await page.fill("#comment", "x".repeat(250));
  check((await page.inputValue("#comment")).length === 200, "comment box stops at 200 characters");
  check((await page.textContent("#count")) === "200 / 200", "counter reads 200 / 200");
  await page.fill("#comment", "Rising to the work of a human being. That lands today.");
  await page.click("#save");
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("morning-quote-v1")));
  check(stored.days["2026-09-30"].comment === "Rising to the work of a human being. That lands today.", "comment saved");
  await page.screenshot({ path: shots + "/2-reacted.png" });

  // Reload: everything comes back from the device
  await page.reload();
  await page.waitForFunction(() => document.getElementById("quote-text").textContent !== "Loading today's quote…");
  check((await page.inputValue("#comment")).startsWith("Rising"), "comment still there after reload");
  check((await page.locator("#emojis button").nth(0).getAttribute("aria-pressed")) === "true", "emoji still marked after reload");

  // Streak across days: yesterday and the day before, a gap, then older days
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("morning-quote-v1"));
    s.days["2026-09-29"] = { quoteId: "x", emoji: "❤️", comment: "" };
    s.days["2026-09-28"] = { quoteId: "x", emoji: null, comment: "a thought" };
    s.days["2026-09-26"] = { quoteId: "x", emoji: "❤️", comment: "" };
    localStorage.setItem("morning-quote-v1", JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => document.getElementById("quote-text").textContent !== "Loading today's quote…");
  check((await page.textContent("#streak")) === "🔥 3 days", "streak counts 3 consecutive days and stops at the gap");
  // Tomorrow, before reacting: still 3 (alive), the day after with no reaction: 0
  await page.clock.setSystemTime(new Date(2026, 9, 1, 7, 0, 0));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  check((await page.textContent("#streak")) === "🔥 3 days", "next morning before reacting, streak is still alive");
  const expectOct1 = quotes.filter((q) => q.tradition === "stoic")[(day + 1) % 10];
  check((await page.textContent("#quote-text")) === expectOct1.text, "new day shows the next quote");
  check((await page.inputValue("#comment")) === "", "new day starts with an empty comment box");
  await page.clock.setSystemTime(new Date(2026, 9, 2, 7, 0, 0));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  check((await page.textContent("#streak")) === "Start a streak", "a missed day resets the streak");
  await page.clock.setSystemTime(new Date(2026, 8, 30, 7, 0, 0));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

  // Traditions
  for (const [value, tr] of [["russian", "russian"], ["scifi", "scifi"], ["scripture", "scripture"], ["stoic", "stoic"]]) {
    await page.selectOption("#tradition", value);
    const exp = quotes.filter((q) => q.tradition === tr)[day % 10];
    check((await page.textContent("#quote-text")) === exp.text, `tradition ${value} shows ${exp.id}`);
    if (value === "scripture") {
      check((await page.textContent("#quote-source")) === "The Bible, " + exp.where, "scripture source: " + (await page.textContent("#quote-source")));
      await page.screenshot({ path: shots + "/3-scripture.png" });
    }
  }
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("morning-quote-v1")));
  check(stored.settings.tradition === "stoic", "tradition setting stored");

  // Reminder time and bell
  await page.fill("#reminder-time", "06:30");
  await page.dispatchEvent("#reminder-time", "change");
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("morning-quote-v1")));
  check(stored.settings.reminderTime === "06:30", "reminder time stored");
  await page.click("#bell");
  await page.waitForFunction(() => document.getElementById("bell").textContent === "On");
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("morning-quote-v1")));
  check(stored.settings.reminderOn === true, "reminder switched on after permission");

  // Service worker: registered, controls the page, note shared
  await page.evaluate(() => navigator.serviceWorker.ready);
  check(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), "service worker registered");
  const note = await page.evaluate(async () => (await (await caches.open("morning-quote-state")).match("state")).json());
  check(note.reminderOn === true && note.reminderTime === "06:30" && note.lastReacted === "2026-09-30", "note for the service worker: " + JSON.stringify(note));

  // Reminder fires when due and nothing reacted today: use a fresh day
  await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem("morning-quote-v1"));
    delete s.days["2026-09-30"]; localStorage.setItem("morning-quote-v1", JSON.stringify(s));
  });
  await page.reload();
  await page.waitForFunction(() => document.getElementById("quote-text").textContent !== "Loading today's quote…");
  await page.evaluate(() => remindIfNeeded());
  const shown = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => n.title + " | " + n.tag));
  check(shown.length === 1 && shown[0].includes("morning-2026-09-30"), "reminder notification shown: " + JSON.stringify(shown));
  await page.evaluate(() => remindIfNeeded());
  const shown2 = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).length);
  check(shown2 === 1, "second reminder on the same day does not stack");

  // Offline: reload with no network still shows the quote
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.getElementById("quote-text").textContent !== "Loading today's quote…");
  check((await page.textContent("#quote-text")) === expectStoic.text, "opens and shows the quote with no internet");
  await context.setOffline(false);

  // Manifest and icons
  const manifest = await page.evaluate(async () => (await fetch("manifest.webmanifest")).json());
  check(manifest.display === "standalone" && manifest.icons.length === 3, "manifest parses, standalone, 3 icons");
  for (const icon of manifest.icons) {
    const ok = await page.evaluate(async (src) => (await fetch(src)).ok, icon.src);
    check(ok, "icon loads: " + icon.src);
  }

  check(errors.length === 0, "no script errors" + (errors.length ? ": " + errors.join(" / ") : ""));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})();
