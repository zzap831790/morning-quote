# Morning Quote

One quote from a great book each morning. React with an emoji or one short thought, keep a streak going.

Live at **https://zzap831790.github.io/morning-quote/**

## Put it on your phone

- **iPhone (Safari):** open the link, tap Share, then **Add to Home Screen**. Open it from the new icon. Only then can you turn on the reminder (iOS 16.4 or later).
- **Android (Chrome):** open the link and tap **Install app** at the bottom, or use Chrome's menu, then **Install app**.

## What is in this folder, file by file

The app is six files and a folder of icons, plus two housekeeping files. No framework, no server, no build step: GitHub Pages hands these files to your phone exactly as they are.

- **`index.html`** is the skeleton of the one screen. It lists what is on the screen, top to bottom: the date and streak, the quote card, the five emoji, the comment box, the settings. It holds no logic and no colors; it points to the files that do.
- **`style.css`** is the look: colors, fonts, spacing. It is written for a phone first. All colors sit at the top as named values, with a second set for dark mode, which the phone switches on by itself.
- **`app.js`** is the brain. Everything that *happens* lives here: picking today's quote, drawing it, saving your emoji and comment, counting the streak, running the reminder. Its comments walk through each part.
- **`quotes.json`** is the data: the 40 quotes, each with its tradition, text, book, author, translator, and where in the book it sits. The app reads it and never changes it. Change the quotes here, not in the code.
- **`sw.js`** is the **service worker**, a small helper script the phone keeps next to the app. It runs on its own, apart from the page. It keeps a saved copy of every file so the app opens with no internet, it rings the reminder, and it opens the app when you tap the reminder.
- **`manifest.webmanifest`** is the app's ID card. When you add the app to your home screen, the phone reads it for the name, the icon, the colors, and the instruction to open full screen with no browser bar.
- **`icons/`** holds the home screen picture in the sizes phones ask for. The "maskable" one has extra margin, because Android may crop icons into a circle.
- **`.nojekyll`** is an empty file. It tells GitHub Pages to serve the files as they are, without running its usual site builder first.
- **`.gitignore`** tells git which files never to save: here, the downloaded book texts the quote checker uses.

Two folders are workshop tools. The phone never loads them.

- **`tools/check-quotes/`** checks every quote against the actual book text and rebuilds `quotes.json`. See *Adding quotes* below.
- **`tests/`** drives the app in a real browser at phone size and checks each feature. See *Testing* below.

## How the pieces talk to each other

1. The phone asks GitHub Pages for `index.html`. The page asks for `style.css` and `app.js`.
2. `app.js` asks for `quotes.json`, picks today's quote, and draws the screen.
3. `app.js` also registers `sw.js`. From then on, every file request passes through the service worker, which fetches the newest copy from the internet and keeps it. If the internet does not answer within a second and a half, or not at all, it hands back the saved copy instead, so a weak signal never holds up the quote; the internet answer, when it comes, still refreshes the saved copy for next time.
4. When you tap an emoji or save a comment, `app.js` writes it into **localStorage**, a small notebook the browser keeps for each website, on your phone only.

## Where your data lives

On your phone, nowhere else. There is no account and no server. The public repo holds only code and old books; your streak, emoji, comments and settings never leave the device.

Two things follow from that. Deleting the app or clearing the browser's website data erases your history. And on iPhone, the home screen app and Safari keep separate notebooks, so open it from the home screen icon every day, not from a Safari tab.

## Today's quote, how it is picked

Every day has a number (days since 1 January 1970). The app takes the quotes of your tradition and picks number `day % 10`, the remainder after dividing by ten. The same day and tradition always give the same quote, the day turns at your own midnight, and with ten quotes per tradition the list comes round every ten days.

## The streak

The app counts back one day at a time for as long as each day has an emoji or a comment. If you have not reacted yet today, the streak is still alive and counts from yesterday. Miss a whole day and it starts again.

## The reminder, what works where

A web app can only ring when the phone lets it. Without a server, this is what each phone allows:

- **Android, installed from Chrome:** Chrome wakes the service worker now and then ("periodic background sync"), at most about twice a day, less if you rarely open the app. If your time has passed and you have not reacted, it rings. Chrome picks the moment, so the reminder comes at or after your time, not on the minute.
- **iPhone, from the home screen:** notifications are allowed, but iOS gives a closed web app no way to ring at a set time on its own. It rings only while the app is open on screen. Until phase 2, the dependable morning nudge on iPhone is a plain phone alarm named Morning Quote.
- **Any phone, app open:** a timer inside `app.js` rings at your time.

A reminder on the minute, with the app closed, on every phone, needs "push": a small server that sends the ping at your time. That is phase 2, together with accounts.

## Adding quotes

Never type a quote from memory. The checker makes sure every line is really in the book.

1. Add the line to `tools/check-quotes/candidates.json`, with the file of the book it comes from. For a new book, add its download to `fetch_texts.sh` first.
2. Run `tools/check-quotes/fetch_texts.sh` once, to download the books.
3. Run `tools/check-quotes/check.sh`. Every line found word for word is marked VERIFIED and goes into `quotes.json`, copied in the book's own wording. A line not found is reported and left out.

Rules the checker follows when it copies a line: it may start mid sentence (then it capitalises the first letter), and it may stop at a comma, colon or semicolon (then it ends with a full stop). It never changes a word. Book and section locations come from the book files themselves.

What was checked for version 1:

- 40 of 40 lines verified, ten per tradition. Stoic in George Long, the Russians in Constance Garnett and the Maudes, scripture in the King James Version, science fiction in Mary Shelley, H. G. Wells and Edwin Abbott.
- **Dropped:** the three Dune lines. Dune is still under copyright, and no copy of the text was reachable to check against, only quote websites, which do not count.
- **Caught:** the popular "The strongest of all warriors are these two, Time and Patience" is not in the Maude War and Peace; Maude has "there is nothing stronger than those two: patience and time". It comes from a different translation, so it is not in the file.

## Changing the app

Edit a file, commit, push to `main`. GitHub Pages republishes in about a minute. The phone picks up the new version the next time the app opens with a decent connection, because the service worker tries the internet first. On a weak connection it shows the saved copy and refreshes it in the background, so the new version arrives one open later. When a change touches several files at once, also bump `FILES_CACHE` in `sw.js` (v2 to v3, and so on), so every phone replaces its saved copies as one matching set.

## Testing

The tests in `tests/` use Playwright, a tool that drives a real Chrome browser from a script.

- `test-app.js` checks every feature on a phone-sized screen: today's quote, emoji, the 200 character cap, the streak across days, the four traditions, the reminder, offline, the manifest and icons.
- `test-fit.js` shows all 40 quotes on four phone sizes and reports any that spill past one screen.
- `test-sync.js` fires Android's now-and-then wake up by hand and checks that the closed-app reminder rings only when it should.
- `test-slow.js` starts its own server that answers every file eight seconds late, and checks that the app still shows the quote from its saved copy within a few seconds.

To run them: from the folder that holds `morning-quote`, start `python3 -m http.server 8765`, then run `node morning-quote/tests/test-app.js /tmp` (and the other three; `test-slow.js` needs no server of yours). If Playwright is installed globally rather than in this folder, set `NODE_PATH=$(npm root -g)` first. The tests launch Chrome with `--headless=new` on purpose: the older headless mode refuses notifications whatever permission it is given.

## Credits

Quote texts come from Project Gutenberg and Standard Ebooks, both public domain. Each quote in `quotes.json` records the edition it was checked against.
