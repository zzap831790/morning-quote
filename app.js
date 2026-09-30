// Morning Quote: everything the one screen does.
// Nothing leaves the phone. What the app remembers lives in localStorage,
// a small notebook each website gets inside the browser.

const STORE_KEY = "morning-quote-v1";

const EMOJIS = [
  { emoji: "❤️", label: "Love it" },
  { emoji: "🤔", label: "Makes me think" },
  { emoji: "💪", label: "Fires me up" },
  { emoji: "🙏", label: "Grateful" },
  { emoji: "😐", label: "Not for me" },
];

const $ = (id) => document.getElementById(id);

let quotes = [];       // filled from quotes.json
let current = null;    // the quote on screen right now
let state = loadState();
let reminderTimer = null;
let installPrompt = null;


// ---------- Memory on the device ----------

// The whole memory is one object:
// { settings: { tradition, reminderTime, reminderOn },
//   days: { "2026-09-29": { quoteId, emoji, comment } } }
function loadState() {
  const fresh = { settings: { tradition: "stoic", reminderTime: "07:00", reminderOn: false }, days: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && saved.days) {
      return { settings: { ...fresh.settings, ...saved.settings }, days: saved.days };
    }
  } catch (e) {
    // Private browsing or blocked storage: start fresh, the app still works for today.
  }
  return fresh;
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {}
  shareWithServiceWorker();
}

// The service worker (sw.js) cannot read localStorage, so the app leaves it
// a short note in the browser's cache: the reminder settings and the last day you reacted.
async function shareWithServiceWorker() {
  if (!("caches" in window)) return;
  try {
    const note = {
      reminderOn: state.settings.reminderOn,
      reminderTime: state.settings.reminderTime,
      lastReacted: Object.keys(state.days).filter((k) => reacted(state.days[k])).sort().pop() || null,
    };
    const cache = await caches.open("morning-quote-state");
    await cache.put("state", new Response(JSON.stringify(note)));
  } catch (e) {}
}


// ---------- Dates ----------

// "2026-09-29" in the phone's own time zone, so the day turns at your midnight.
function dateKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Days since 1 January 1970. Today is one number, tomorrow is that number plus one.
function dayNumber(d) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}


// ---------- Today's quote ----------

// Same day and same tradition always give the same quote. With ten quotes
// per tradition, the list comes round again every ten days.
function quoteFor(date, tradition) {
  const list = quotes.filter((q) => q.tradition === tradition);
  return list[dayNumber(date) % list.length];
}


// ---------- Streak ----------

function reacted(day) {
  return Boolean(day && (day.emoji || day.comment));
}

// Count back one day at a time while each day has a reaction.
// If today has none yet, the streak is still alive: count from yesterday.
function streak() {
  const d = new Date();
  if (!reacted(state.days[dateKey(d)])) d.setDate(d.getDate() - 1);
  let n = 0;
  while (reacted(state.days[dateKey(d)])) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}


// ---------- Drawing the screen ----------

function todayRecord() {
  const day = state.days[dateKey(new Date())];
  return day && day.quoteId === current.id ? day : null;
}

function render() {
  const today = new Date();
  current = quoteFor(today, state.settings.tradition);

  $("date").textContent = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const n = streak();
  $("streak").textContent = n === 0 ? "Start a streak" : `🔥 ${n} day${n === 1 ? "" : "s"}`;

  $("quote-text").textContent = current.text;
  $("quote").classList.toggle("long", current.text.length > 120 && current.text.length <= 200);
  $("quote").classList.toggle("longer", current.text.length > 200);

  // "Marcus Aurelius, Meditations, Book II" with the book title in italics
  const source = $("quote-source");
  source.textContent = "";
  if (current.author) source.append(current.author + ", ");
  const cite = document.createElement("cite");
  cite.textContent = current.book;
  source.append(cite);
  if (current.where) source.append(", " + current.where);

  $("quote-translator").textContent = current.translator ? `Translation: ${current.translator}` : "";

  const record = todayRecord();
  for (const button of $("emojis").children) {
    button.setAttribute("aria-pressed", String(record?.emoji === button.dataset.emoji));
  }
  if (document.activeElement !== $("comment")) {
    $("comment").value = record?.comment || "";
    updateCount();
  }

  $("tradition").value = state.settings.tradition;
  $("reminder-time").value = state.settings.reminderTime;
  const bell = $("bell");
  bell.textContent = state.settings.reminderOn ? "On" : "Turn on";
  bell.setAttribute("aria-pressed", String(state.settings.reminderOn));
  bell.classList.toggle("on", state.settings.reminderOn);
}

function buildEmojiButtons() {
  for (const { emoji, label } of EMOJIS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = emoji;
    b.dataset.emoji = emoji;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.addEventListener("click", () => react(emoji));
    $("emojis").append(b);
  }
}


// ---------- Reacting ----------

// Today's record, started fresh if it belonged to a different quote
// (that happens when you switch tradition after reacting).
function recordForEdit() {
  const key = dateKey(new Date());
  if (!todayRecord()) state.days[key] = { quoteId: current.id, emoji: null, comment: "" };
  return state.days[key];
}

function react(emoji) {
  const record = recordForEdit();
  record.emoji = record.emoji === emoji ? null : emoji;   // tap the same one again to undo
  saveState();
  render();
}

function updateCount() {
  $("count").textContent = `${$("comment").value.length} / 200`;
}

function saveComment(event) {
  event.preventDefault();
  const text = $("comment").value.trim().slice(0, 200);
  // An empty box with nothing recorded for this quote: nothing to save. This also keeps
  // an empty Save from wiping a reaction you gave today's quote in another tradition.
  if (!text && !todayRecord()) {
    $("comment").blur();
    return;
  }
  const record = recordForEdit();
  record.comment = text;
  saveState();
  $("comment").blur();
  render();
  const save = $("save");
  save.textContent = "Saved";
  save.disabled = true;
  setTimeout(() => { save.textContent = "Save"; save.disabled = false; }, 1500);
}


// ---------- Reminder ----------

const isIPhone = /iphone|ipad|ipod/i.test(navigator.userAgent);
const installed = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function hint(text) {
  $("hint").textContent = text;
  $("hint").hidden = !text;
}

async function toggleReminder() {
  if (state.settings.reminderOn) {
    state.settings.reminderOn = false;
    saveState();
    scheduleReminder();
    hint("");
    render();
    return;
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    hint(isIPhone && !installed
      ? "On iPhone, reminders need the app on your Home Screen. Tap Share, then Add to Home Screen, then open it from there."
      : "This browser does not allow reminders.");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    hint("Reminders are blocked. Allow notifications for this app in your phone's settings, then try again.");
    return;
  }
  state.settings.reminderOn = true;
  saveState();
  await askForDailyWakeUp();
  scheduleReminder();
  hint(isIPhone
    ? "Reminder on. iPhone only lets it ring while the app is open, so a phone alarm is the surer nudge."
    : "Reminder on.");
  render();
}

// While the app is open, a timer waits for the reminder time.
function scheduleReminder() {
  clearTimeout(reminderTimer);
  if (!state.settings.reminderOn) return;
  const [h, m] = state.settings.reminderTime.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  reminderTimer = setTimeout(async () => {
    await remindIfNeeded();
    scheduleReminder();
  }, next - now);
}

async function remindIfNeeded() {
  if (reacted(state.days[dateKey(new Date())])) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Morning Quote", {
      body: "Today's quote is waiting for you.",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: "morning-" + dateKey(new Date()),   // same tag means never two alerts for one day
    });
  } catch (e) {}
}

// Android Chrome can wake an installed app's service worker now and then, at most
// about twice a day ("periodic background sync"), even when the app is closed. The phone
// picks the exact moment, so this reminder comes at or after your time, not on the minute.
async function askForDailyWakeUp() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) return;
    const status = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (status.state === "granted") {
      await reg.periodicSync.register("morning-reminder", { minInterval: 60 * 60 * 1000 });
    }
  } catch (e) {}
}


// ---------- Install button ----------

// Android Chrome offers its own install prompt; we hold it and show our button.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("install").hidden = false;
});

async function install() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("install").hidden = true;
}


// ---------- Start ----------

async function start() {
  buildEmojiButtons();

  $("comment").addEventListener("input", updateCount);
  $("comment-form").addEventListener("submit", saveComment);
  $("tradition").addEventListener("change", (e) => {
    state.settings.tradition = e.target.value;
    saveState();
    render();
  });
  $("reminder-time").addEventListener("change", (e) => {
    if (!e.target.value) return;
    state.settings.reminderTime = e.target.value;
    saveState();
    scheduleReminder();
  });
  $("bell").addEventListener("click", toggleReminder);
  $("install").addEventListener("click", install);

  // Coming back to the app after midnight shows the new day's quote.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && quotes.length) {
      render();
      scheduleReminder();
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  if (isIPhone && !installed) {
    hint("To install: tap Share, then Add to Home Screen.");
  }

  try {
    const response = await fetch("quotes.json");
    quotes = (await response.json()).quotes;
  } catch (e) {
    $("quote-text").textContent = "Could not load today's quote. Check your connection and open the app again.";
    return;
  }

  render();
  scheduleReminder();
  shareWithServiceWorker();
}

start();
