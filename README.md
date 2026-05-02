# BOD Auto-Clicker

An auto-clicker for **Flyff Universe** that uses OCR to read stat values from Blessing of the Demon (BOD) rolls and automatically stops when your target condition is met.

---

## Features

- **OCR-powered detection** — reads stat values directly from your screen
- **Multiple stop conditions** — define several rules with OR logic (e.g. Speed ≥ 5 OR STR+INT ≥ 6)
- **Probability display** — shows the chance of hitting your condition per roll
- **Session history** — tracks rolls, matches and sessions across multiple runs
- **Auto-update** — silently downloads and installs new versions in the background
- **No setup required** — ships as a standalone Windows installer

---

## Download

Grab the latest installer from the [Releases](https://github.com/lbrulet/bod-auto-clicker/releases/latest) page.

> Windows may show a SmartScreen warning on first launch — click **More info → Run anyway**.

---

## How to use

### 1. Set up the three zones

Click each **Select Zone** button and drag a rectangle over the corresponding area on your screen:

| Zone | What to select |
|------|----------------|
| Zone 1 | First stat line of the BOD result |
| Zone 2 | Second stat line of the BOD result |
| Zone 3 | The **Blessing** / start button |

Use **Preview** to verify the zone is captured correctly.

### 2. Define your stop conditions

Click **+ Add Rule** and configure:
- **Stats** — tick one or more stats to sum together
- **Threshold** — the minimum total value to stop at

Add as many rules as you want. The automation stops when **any** rule is satisfied.

Example: stop if `Speed ≥ 5` OR `STR + INT ≥ 6`

### 3. Set the wait time

Set **Wait after click (ms)** to match the BOD animation duration — typically **8000 ms** (8 seconds).

### 4. Start

Click **Start Auto-Click**. The app will:
1. Click the Blessing button
2. Wait for the animation to finish
3. OCR both stat zones
4. Stop if a rule matches, otherwise repeat

Click **Stop** at any time to abort.

---

## Stat probability

The probability shown under each rule is calculated from the official BOD stat table — it represents the chance of hitting that condition on a single roll.

For multiple rules the combined probability uses OR logic:
```
P(any rule) = 1 - ∏(1 - P(rule_i))
```

---

## Building from source

```bash
npm install
npm start          # run in dev mode
npm run make-icon  # regenerate icon.ico from assets/icon.png
npm run build      # build installer without publishing
npm run release    # build + publish to GitHub Releases
```

Requires [Node.js](https://nodejs.org/) and a `GH_TOKEN` environment variable for publishing.

---

## Tech stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR engine
- [screenshot-desktop](https://github.com/bencevans/screenshot-desktop) + [Jimp](https://github.com/jimp-dev/jimp) — screen capture & image processing
- [sql.js](https://sql.js.org/) — SQLite for session history
- [electron-updater](https://www.electron.build/auto-update) — auto-update
