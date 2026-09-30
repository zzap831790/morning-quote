// The service worker: a helper the phone keeps next to the app.
// Job 1: keep a copy of the app's files so it opens with no internet.
// Job 2: show the morning reminder, and open the app when you tap it.

const FILES_CACHE = "morning-quote-files-v1";
const STATE_CACHE = "morning-quote-state";   // the note app.js leaves for us
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "quotes.json",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// First visit: save a copy of every file.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(FILES_CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// A newer version of this file took over: throw away copies saved by older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("morning-quote-files-") && key !== FILES_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Every time the app asks for a file: try the internet first, so you always get
// the newest version, and keep the answer as the new saved copy.
// No internet: hand back the saved copy instead.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(FILES_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});

// Android Chrome wakes us about once a day (the phone picks when).
// If your reminder time has passed and you have not reacted today, ring once.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "morning-reminder") event.waitUntil(checkReminder());
});

async function checkReminder() {
  const cache = await caches.open(STATE_CACHE);
  const saved = await cache.match("state");
  if (!saved) return;
  const note = await saved.json();
  if (!note.reminderOn) return;

  const now = new Date();
  const today = dateKey(now);
  const [h, m] = note.reminderTime.split(":").map(Number);
  const due = new Date(now);
  due.setHours(h, m, 0, 0);
  if (now < due || note.lastReacted === today) return;

  const reminded = await cache.match("reminded");
  if (reminded && (await reminded.text()) === today) return;
  await cache.put("reminded", new Response(today));

  await self.registration.showNotification("Morning Quote", {
    body: "Today's quote is waiting for you.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "morning-" + today,
  });
}

function dateKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Tapping the reminder: bring the app forward, or open it if it is closed.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) if ("focus" in w) return w.focus();
      return self.clients.openWindow("./");
    })
  );
});
