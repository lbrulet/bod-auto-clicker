const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const { autoUpdater } = require('electron-updater');
const { createWorker } = require('tesseract.js');
const { spawn } = require('child_process');
const os = require('os');
const Jimp = require('jimp');
const initSqlJs = require('sql.js');

let mainWindow = null;
let overlayWindow = null;
let tesseractWorker = null;
let clickerProcess = null;
let loopTimeoutId  = null;
let zones = [null, null, null];
let isRunning = false;

// ── SQLite ────────────────────────────────────────────────────────────────────

let db = null;
const DB_PATH = path.join(app.getPath('userData'), 'clicker-stats.db');

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at    TEXT NOT NULL,
      ended_at      TEXT,
      condition     TEXT NOT NULL,
      total_rolls   INTEGER DEFAULT 0,
      success       INTEGER DEFAULT 0
    )
  `);

  // ── Seed test data (runs once) ───────────────────────────────────────
  const seedCheck = db.exec("SELECT COUNT(*) FROM sessions WHERE condition = 'Σ(STR+INT≥5)'");
  if (seedCheck[0].values[0][0] === 0) {
    db.run(`INSERT INTO sessions (started_at, ended_at, condition, total_rolls, success) VALUES
      ('2026-05-01T09:00:00.000Z', '2026-05-01T09:45:00.000Z', 'Σ(STR+INT≥5)', 23, 0),
      ('2026-05-01T10:00:00.000Z', '2026-05-01T11:20:00.000Z', 'Σ(STR+INT≥5)', 41, 0),
      ('2026-05-01T14:00:00.000Z', '2026-05-01T15:10:00.000Z', 'Σ(STR+INT≥5)', 38, 1)
    `);
  }
  // ─────────────────────────────────────────────────────────────────────

  saveDB();
}

function saveDB() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── Session tracking ──────────────────────────────────────────────────────────

let session = null;   // { id, rolls }

function sessionStart(conditionDesc) {
  if (!db) return;
  db.run('INSERT INTO sessions (started_at, condition) VALUES (?, ?)',
    [new Date().toISOString(), conditionDesc]);
  const [[id]] = db.exec('SELECT last_insert_rowid()')[0].values;
  session = { id, rolls: 0 };
  saveDB();
  pushCounters();
}

function sessionRoll() {
  if (!session) return;
  session.rolls++;
  // push live update every roll
  pushCounters();
}

function sessionEnd(success) {
  if (!session || !db) return;
  db.run(
    'UPDATE sessions SET ended_at=?, total_rolls=?, success=? WHERE id=?',
    [new Date().toISOString(), session.rolls, success ? 1 : 0, session.id]
  );
  saveDB();
  session = null;
  pushCounters();
}

function getAllTimeStats() {
  if (!db) return { totalRolls: 0, totalMatches: 0, totalSessions: 0 };
  const res = db.exec(
    'SELECT COALESCE(SUM(total_rolls),0), COALESCE(SUM(success),0), COUNT(*) FROM sessions WHERE ended_at IS NOT NULL'
  );
  if (!res.length) return { totalRolls: 0, totalMatches: 0, totalSessions: 0 };
  const [totalRolls, totalMatches, totalSessions] = res[0].values[0];
  return { totalRolls, totalMatches, totalSessions };
}

function pushCounters() {
  if (!mainWindow) return;
  mainWindow.webContents.send('counter-update', {
    sessionRolls:   session ? session.rolls : 0,
    sessionRunning: !!session,
    ...getAllTimeStats(),
  });
}

// ── Tesseract ────────────────────────────────────────────────────────────────

async function initTesseract() {
  tesseractWorker = await createWorker('eng', 1, { logger: () => {} });
}

// ── App bootstrap ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createMainWindow();
  await Promise.all([initTesseract(), initDB()]).catch(console.error);
  tesseractReady = true;
  trySignalReady();
  setupAutoUpdater();
});

// Send ocr-ready only after BOTH the renderer is loaded AND Tesseract is done
// (avoids race condition in either direction)
let tesseractReady = false;
let rendererReady  = false;

function trySignalReady() {
  if (tesseractReady && rendererReady && mainWindow) {
    mainWindow.webContents.send('ocr-ready');
    pushCounters();
  }
}

ipcMain.on('renderer-ready', () => {
  rendererReady = true;
  trySignalReady();
});

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-downloaded', () => {
    // Notify the UI, install automatically when the app is closed
    if (mainWindow) mainWindow.webContents.send('update-downloaded');
  });

  autoUpdater.on('error', (err) => console.error('[updater]', err.message));

  // Check on startup (only works in packaged app)
  if (app.isPackaged) autoUpdater.checkForUpdates();
}

function createMainWindow() {
  Menu.setApplicationMenu(null);   // hide default menu bar
  mainWindow = new BrowserWindow({
    width: 720,
    minHeight: 400,
    resizable: true,
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'OCR Auto-Clicker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript('document.body.scrollHeight').then((h) => {
      const { height: screenH } = screen.getPrimaryDisplay().workAreaSize;
      const newH = Math.min(h + 40, screenH - 40); // +40 for title bar, cap at screen height
      mainWindow.setSize(720, newH);
    });
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Zone selection ───────────────────────────────────────────────────────────

ipcMain.handle('select-zone', (event, zoneIndex) => {
  return new Promise((resolve) => {
    const { bounds } = screen.getPrimaryDisplay();

    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
      overlayWindow = null;
    }

    overlayWindow = new BrowserWindow({
      x: bounds.x, y: bounds.y,
      width: bounds.width, height: bounds.height,
      transparent: true, frame: false, alwaysOnTop: true, skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, 'overlay', 'overlay-preload.js'),
        contextIsolation: true, nodeIntegration: false,
      },
    });

    overlayWindow.loadFile(
      path.join(__dirname, 'overlay', 'overlay.html'),
      { query: { offsetX: String(bounds.x), offsetY: String(bounds.y) } }
    );

    let resolved = false;
    const done = (result) => {
      if (resolved) return;
      resolved = true;
      ipcMain.removeListener('zone-confirmed', onConfirmed);
      ipcMain.removeListener('zone-cancelled', onCancelled);
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.close();
        overlayWindow = null;
      }
      if (result) zones[zoneIndex] = result;
      resolve(result);
    };

    const onConfirmed = (e, rect) => done(rect);
    const onCancelled = () => done(null);

    ipcMain.once('zone-confirmed', onConfirmed);
    ipcMain.once('zone-cancelled', onCancelled);
    overlayWindow.on('closed', () => { overlayWindow = null; done(null); });
  });
});

// ── Screen capture + OCR ─────────────────────────────────────────────────────

function takeScreenshot() {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `bod-screen-${Date.now()}.png`);

    // Reuse clicker process if running, otherwise spawn a one-shot PowerShell
    if (clickerProcess && clickerProcess.stdin.writable) {
      const onData = (data) => {
        if (data.toString().includes('screenshot-done')) {
          clickerProcess.stdout.removeListener('data', onData);
          resolve(tmpFile);
        }
      };
      const timeout = setTimeout(() => {
        if (clickerProcess) clickerProcess.stdout.removeListener('data', onData);
        reject(new Error('Screenshot timeout'));
      }, 8000);
      clickerProcess.stdout.on('data', onData);
      clickerProcess.stdin.write(`screenshot ${tmpFile}\n`);
    } else {
      // One-shot PowerShell for preview (automation not running)
      const scriptPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'clicker.ps1')
        : path.join(__dirname, 'clicker.ps1');
      const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      ps.stdin.write(`screenshot ${tmpFile}\n`);
      ps.stdout.on('data', (data) => {
        if (data.toString().includes('screenshot-done')) {
          ps.stdin.write('quit\n');
          resolve(tmpFile);
        }
      });
      ps.stderr.on('data', (d) => console.error('[screenshot]', d.toString()));
      ps.on('close', (code) => { if (code !== 0) reject(new Error(`Screenshot ps exited ${code}`)); });
      setTimeout(() => { try { ps.kill(); } catch (_) {} reject(new Error('Screenshot timeout')); }, 10000);
    }
  });
}

async function captureZone(zone) {
  const { scaleFactor } = screen.getPrimaryDisplay();
  const tmpFile = await takeScreenshot();

  const image = await Jimp.read(tmpFile);
  try { fs.unlinkSync(tmpFile); } catch (_) {}

  const px = Math.round(zone.x * scaleFactor);
  const py = Math.round(zone.y * scaleFactor);
  const pw = Math.max(1, Math.round(zone.width  * scaleFactor));
  const ph = Math.max(1, Math.round(zone.height * scaleFactor));

  image.crop(px, py, pw, ph).greyscale().contrast(0.4);
  if (pw < 300 || ph < 60) image.scale(2);

  return image.getBufferAsync(Jimp.MIME_PNG);
}

async function ocrZone(zone) {
  const buffer = await captureZone(zone);
  const { data: { text } } = await tesseractWorker.recognize(buffer);
  return text.trim();
}

function extractStatValue(text, statName) {
  const esc = statName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Block matching when stat name is preceded by "letter + space" (e.g. "Casting Speed" / "Attack Speed")
  // The old (?<![\w.]) only blocked word chars — space before "Speed" slipped through
  const re  = new RegExp('(?<![a-zA-Z] )(?<![\\w.])' + esc + '[\\s:+%]*([\\d]+\\.?[\\d]*)', 'i');
  const m   = text.match(re);
  return m ? parseFloat(m[1]) : null;
}

// ── Clicker ──────────────────────────────────────────────────────────────────

function zoneCenter(zone) {
  return {
    x: Math.round(zone.x + zone.width  / 2),
    y: Math.round(zone.y + zone.height / 2),
  };
}

function startClicker() {
  const scriptPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'clicker.ps1')
    : path.join(__dirname, 'clicker.ps1');
  clickerProcess = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  clickerProcess.stderr.on('data', (d) => console.error('[clicker]', d.toString()));
}

function sendClick(clickZone) {
  const { x, y } = zoneCenter(clickZone);
  if (clickerProcess && clickerProcess.stdin.writable) {
    clickerProcess.stdin.write(`clickat ${x} ${y}\n`);
  }
}

function stopClicker() {
  if (clickerProcess) {
    try { if (clickerProcess.stdin.writable) clickerProcess.stdin.write('quit\n'); } catch (_) {}
    clickerProcess.kill();
    clickerProcess = null;
  }
}

// ── Automation ───────────────────────────────────────────────────────────────

ipcMain.handle('start-automation', async (event, config) => {
  if (isRunning)        return { error: 'Already running' };
  if (!tesseractWorker) return { error: 'OCR engine not ready yet' };
  if (!zones[2])        return { error: 'Zone 3 (Start button) is not set' };

  const { waitMs, combineRules } = config;

  const validRules = (combineRules || []).filter((r) => r.stats && r.stats.length > 0 && r.threshold > 0);
  if (!validRules.length) return { error: 'Add at least one rule with stats and a threshold' };

  const conditionDesc = validRules.map((r) => `Σ(${r.stats.join('+')}≥${r.threshold})`).join(' OR ');

  isRunning = true;
  startClicker();
  sessionStart(conditionDesc);

  // ── Main loop: click → wait → OCR → repeat if no match ────────────────
  async function loop() {
    if (!isRunning) return;

    // Click the Start button
    sendClick(zones[2]);

    // Wait for the animation to finish
    await new Promise((res) => { loopTimeoutId = setTimeout(res, waitMs); });
    if (!isRunning) return;

    // OCR both zones
    const ocrCache = {};
    for (let i = 0; i < 2; i++) {
      if (!zones[i]) continue;
      try {
        ocrCache[i] = await ocrZone(zones[i]);
        if (mainWindow) mainWindow.webContents.send('ocr-update', { zoneIndex: i, text: ocrCache[i] });
      } catch (err) {
        console.error(`[ocr] zone ${i}:`, err.message);
      }
    }

    // Count as one roll
    sessionRoll();

    // Check each rule — stop if any matches
    let matchedRule  = null;
    let matchedTotal = 0;
    for (const rule of validRules) {
      let total = 0;
      for (const stat of rule.stats) {
        for (let i = 0; i < 2; i++) {
          const val = extractStatValue(ocrCache[i] || '', stat);
          if (val !== null) total += val;
        }
      }
      if (total >= rule.threshold) { matchedRule = rule; matchedTotal = total; break; }
    }

    if (!matchedRule) { loop(); return; }

    // ── Condition met → stop ───────────────────────────────────────────
    stopClicker();
    loopTimeoutId = null;
    isRunning = false;
    sessionEnd(true);

    const reason = `Σ(${matchedRule.stats.join('+')}): ${matchedTotal} ≥ ${matchedRule.threshold}`;
    if (mainWindow) mainWindow.webContents.send('automation-stopped', { reason });
  }

  loop();
  return { started: true };
});

ipcMain.handle('stop-automation', () => {
  if (loopTimeoutId) { clearTimeout(loopTimeoutId); loopTimeoutId = null; }
  stopClicker();
  if (isRunning) sessionEnd(false);
  isRunning = false;
  return { stopped: true };
});

ipcMain.handle('preview-zone', async (event, zoneIndex) => {
  const zone = zones[zoneIndex];
  if (!zone) return null;
  try {
    const buffer = await captureZone(zone);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (_) { return null; }
});

ipcMain.handle('get-stats', () => getAllTimeStats());

ipcMain.handle('set-window-height', (event, contentHeight) => {
  if (!mainWindow) return;
  const { height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const newH = Math.min(contentHeight + 40, screenH - 40);
  const [w]  = mainWindow.getSize();
  mainWindow.setSize(w, newH);
});

ipcMain.handle('get-history', () => {
  if (!db) return [];
  const res = db.exec(`
    SELECT
      condition,
      COUNT(*)            AS sessions,
      COALESCE(SUM(total_rolls), 0) AS rolls,
      COALESCE(SUM(success), 0)     AS matches,
      MAX(started_at)     AS last_used
    FROM sessions
    WHERE ended_at IS NOT NULL
    GROUP BY condition
    ORDER BY last_used DESC
  `);
  if (!res.length) return [];
  return res[0].values.map(([condition, sessions, rolls, matches, last_used]) => ({
    condition, sessions, rolls, matches, last_used,
  }));
});

// ── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  if (loopTimeoutId) { clearTimeout(loopTimeoutId); loopTimeoutId = null; }
  stopClicker();
  if (isRunning) { sessionEnd(false); isRunning = false; }
  if (tesseractWorker) { await tesseractWorker.terminate(); tesseractWorker = null; }
}

let cleaningUp = false;

app.on('before-quit', async (event) => {
  if (cleaningUp) return;
  event.preventDefault();
  cleaningUp = true;
  await cleanup();
  app.exit(0);
});

app.on('window-all-closed', () => app.quit());
process.on('SIGINT',  () => app.quit());
process.on('SIGTERM', () => app.quit());
