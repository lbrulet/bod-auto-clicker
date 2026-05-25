// ── Stat definitions ──────────────────────────────────────────────────────────

const STATS = [
  { name: 'STR',             unit: '+' },
  { name: 'DEX',             unit: '+' },
  { name: 'INT',             unit: '+' },
  { name: 'STA',             unit: '+' },
  { name: 'Critical Chance', unit: '%' },
  { name: 'Critical Damage', unit: '%' },
  { name: 'Speed',           unit: '%' },
  { name: 'Attack Speed',    unit: '%' },
  { name: 'Casting Speed',   unit: '%' },
  { name: 'Attack',          unit: '+' },
  { name: 'Max. HP',         unit: '+' },
  { name: 'Max. MP',         unit: '+' },
  { name: 'Max. FP',         unit: '+' },
  { name: 'Magic Defense',   unit: '+' },
  { name: 'Defense',         unit: '+' },
  { name: 'Parry',           unit: '+' },
  { name: 'Melee Block',     unit: '%' },
  { name: 'Ranged Block',    unit: '%' },
  { name: 'PvE Damage',      unit: '+' },
  { name: 'PvE Dmg Resist',  unit: '+' },
];

// ── Rule management ───────────────────────────────────────────────────────────

function fitWindow() {
  window.api.setWindowHeight(document.body.scrollHeight);
}

function buildStatGrid(item) {
  const grid = document.createElement('div');
  grid.className = 'stat-grid';
  STATS.forEach(({ name, unit }) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const lbl = document.createElement('label');
    lbl.className = 'stat-name';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.value = name; cb.dataset.unit = unit;
    cb.addEventListener('change', () => { syncRuleUnit(item); updateRuleSummary(item); updateProbability(); });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + name));
    row.appendChild(lbl);
    grid.appendChild(row);
  });
  return grid;
}

function syncRuleUnit(item) {
  const selected = [...item.querySelectorAll('input[type="checkbox"]:checked')];
  const units    = [...new Set(selected.map((cb) => cb.dataset.unit || '+'))];
  const unit     = units.length === 0 ? '+' : units.length === 1 ? units[0] : '?';
  item.querySelector('.rule-unit').textContent = unit;
  item.querySelector('.rule-thresh-input').step = unit === '%' ? '0.5' : '1';
}

function updateRuleSummary(item) {
  const stats   = [...item.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
  const thresh  = item.querySelector('.rule-thresh-input').value;
  const unit    = item.querySelector('.rule-unit').textContent;
  const summary = item.querySelector('.rule-summary');
  if (stats.length === 0) {
    summary.textContent = 'No stats selected — click Edit';
    summary.className   = 'rule-summary empty';
  } else {
    summary.textContent = `Σ( ${stats.join(' + ')} )  ≥  ${thresh} ${unit}`;
    summary.className   = 'rule-summary';
  }
}

function toggleRule(item, forceOpen) {
  const expanded = item.querySelector('.rule-expanded');
  const editBtn  = item.querySelector('.rule-btn-edit');
  const open     = forceOpen !== undefined ? forceOpen : !expanded.classList.contains('open');
  expanded.classList.toggle('open', open);
  editBtn.textContent = open ? '▲ Done' : '▼ Edit';
  fitWindow();
}

function createRuleEl() {
  const item = document.createElement('div');
  item.className = 'rule-item';

  // OR separator
  const sep = document.createElement('div');
  sep.className = 'rule-separator';
  sep.textContent = '— OR —';

  // Collapsed row
  const collapsed = document.createElement('div');
  collapsed.className = 'rule-collapsed';

  const summary = document.createElement('span');
  summary.className   = 'rule-summary empty';
  summary.textContent = 'No stats selected — click Edit';

  const editBtn = document.createElement('button');
  editBtn.className   = 'btn btn-ghost rule-btn-edit';
  editBtn.textContent = '▼ Edit';
  editBtn.addEventListener('click', () => toggleRule(item));

  const removeBtn = document.createElement('button');
  removeBtn.className   = 'btn rule-btn-remove';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    item.remove();
    refreshSeparators();
    updateProbability();
    fitWindow();
  });

  collapsed.appendChild(summary);
  collapsed.appendChild(editBtn);
  collapsed.appendChild(removeBtn);

  // Expanded panel
  const expanded = document.createElement('div');
  expanded.className = 'rule-expanded';

  const grid = buildStatGrid(item);

  const threshRow = document.createElement('div');
  threshRow.className = 'rule-thresh-row';

  const geLabel = document.createElement('span');
  geLabel.className = 'field-label'; geLabel.textContent = 'Total ≥';

  const threshInput = document.createElement('input');
  threshInput.type = 'number'; threshInput.value = '5';
  threshInput.min = '0'; threshInput.step = '1';
  threshInput.className = 'rule-thresh-input';
  threshInput.addEventListener('input', () => { updateRuleSummary(item); updateProbability(); });

  const unitSpan = document.createElement('span');
  unitSpan.className = 'rule-unit'; unitSpan.textContent = '+';

  const doneBtn = document.createElement('button');
  doneBtn.className = 'btn btn-ghost rule-btn-done';
  doneBtn.textContent = '▲ Done';
  doneBtn.addEventListener('click', () => toggleRule(item, false));

  threshRow.appendChild(geLabel);
  threshRow.appendChild(threshInput);
  threshRow.appendChild(unitSpan);
  threshRow.appendChild(doneBtn);

  expanded.appendChild(grid);
  expanded.appendChild(threshRow);

  item.appendChild(sep);
  item.appendChild(collapsed);
  item.appendChild(expanded);
  return item;
}

function addRule() {
  const container = document.getElementById('rulesContainer');
  const item = createRuleEl();
  container.appendChild(item);
  refreshSeparators();
  toggleRule(item, true);   // open new rules automatically
  updateProbability();
}

function refreshSeparators() {
  const items = [...document.querySelectorAll('#rulesContainer .rule-item')];
  items.forEach((item, i) => {
    item.querySelector('.rule-separator').style.display = i === 0 ? 'none' : 'flex';
    item.querySelector('.rule-btn-remove').style.display = items.length > 1 ? '' : 'none';
  });
}

function getCombineRules() {
  return [...document.querySelectorAll('#rulesContainer .rule-item')].reduce((acc, item) => {
    const stats  = [...item.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
    const thresh = parseFloat(item.querySelector('.rule-thresh-input').value) || 0;
    if (stats.length > 0 && thresh > 0) acc.push({ stats, threshold: thresh });
    return acc;
  }, []);
}

// ── Probability display ───────────────────────────────────────────────────────

function fmt(p) {
  if (p <= 0) return '—';
  if (p >= 1) return '100%';
  if (p >= 0.01)  return (p * 100).toFixed(2) + '%';
  if (p >= 0.001) return (p * 100).toFixed(3) + '%';
  return (p * 100).toFixed(4) + '%';
}

function fmtRolls(p) {
  if (p <= 0) return '∞';
  const n = Math.round(1 / p);
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
       : n >= 1_000     ? (n / 1_000).toFixed(1) + 'k'
       : n.toString();
}

function colorClass(p) {
  if (p >= 0.01)  return 'good';
  if (p >= 0.001) return 'ok';
  return 'rare';
}

function setProb(id, p, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = label !== undefined ? label : fmt(p);
  el.className = 'prob-value ' + (p > 0 ? colorClass(p) : '');
}

function updateProbability() {
  const rules = getCombineRules();

  // P(any rule met) = 1 - product(1 - P(rule_i))
  const pStop = rules.length > 0
    ? rules.reduce((acc, r) => 1 - (1 - acc) * (1 - pCombineMulti(r.stats, r.threshold)), 0)
    : 0;

  const totalEl = document.getElementById('pTotal');
  if (totalEl) {
    totalEl.textContent = pStop > 0 ? fmt(pStop) : '—';
    totalEl.className = 'prob-total-value ' + (pStop > 0 ? colorClass(pStop) : '');
  }

  document.getElementById('expectedRolls').textContent = pStop > 0 ? '~' + fmtRolls(pStop) : '—';

  const p100el = document.getElementById('p100');
  const p500el = document.getElementById('p500');
  if (pStop > 0) {
    const p100 = 1 - (1 - pStop) ** 100;
    const p500 = 1 - (1 - pStop) ** 500;
    p100el.textContent = (p100 * 100).toFixed(1) + '%';
    p100el.className = 'prob-value ' + colorClass(p100);
    p500el.textContent = (p500 * 100).toFixed(1) + '%';
    p500el.className = 'prob-value ' + colorClass(p500);
  } else {
    p100el.textContent = '—'; p100el.className = 'prob-value';
    p500el.textContent = '—'; p500el.className = 'prob-value';
  }
}

// ── Status helpers ────────────────────────────────────────────────────────────

function setStatus(type, text) {
  document.getElementById('statusDot').className = `dot dot-${type}`;
  document.getElementById('statusText').textContent = text;
}

function setRunning(running) {
  document.getElementById('startBtn').style.display = running ? 'none' : 'block';
  document.getElementById('stopBtn').style.display  = running ? 'block' : 'none';
}

// ── Zone readiness check ──────────────────────────────────────────────────────

let ocrReady   = false;
const zonesSet = [false, false, false];

function updateStartBtn() {
  const allZones = zonesSet.every(Boolean);
  const btn = document.getElementById('startBtn');
  btn.disabled = !(ocrReady && allZones);
  btn.title = !ocrReady    ? 'Waiting for OCR engine…'
            : !zonesSet[0] ? 'Zone 1 (Stat 1) not selected'
            : !zonesSet[1] ? 'Zone 2 (Stat 2) not selected'
            : !zonesSet[2] ? 'Zone 3 (Start button) not selected'
            : '';
}

// ── OCR engine events ─────────────────────────────────────────────────────────

window.api.onOCRReady(() => {
  ocrReady = true;
  setStatus('idle', 'OCR engine ready — select zones and start');
  updateStartBtn();
});

window.api.onOCRError((msg) => {
  setStatus('stopped', `OCR failed: ${msg}`);
});

// ── Zone selection ────────────────────────────────────────────────────────────

async function selectZone(i) {
  const labels = ['Zone 1 (Stat 1)', 'Zone 2 (Stat 2)', 'Zone 3 (Start button)'];
  setStatus('idle', `Selecting ${labels[i]} — drag a rectangle…`);
  const rect = await window.api.selectZone(i);

  if (!rect) { setStatus('idle', 'Selection cancelled.'); return; }

  zonesSet[i] = true;
  updateStartBtn();

  document.getElementById(`coords${i}`).textContent =
    `${rect.x},${rect.y}  ${rect.width}×${rect.height}`;
  document.getElementById(`card${i}`).classList.add('has-zone');
  document.getElementById(`previewBtn${i}`).disabled = false;

  if (i === 2) {
    const cx = Math.round(rect.x + rect.width  / 2);
    const cy = Math.round(rect.y + rect.height / 2);
    document.getElementById('clickInfo').textContent =
      `Target center: (${cx}, ${cy})`;
  }

  setStatus('idle', `Zone ${i + 1} set.`);
  await previewZone(i);
}

async function previewZone(i) {
  const dataUrl = await window.api.previewZone(i);
  if (!dataUrl) return;
  const img = document.getElementById(`preview${i}`);
  img.src = dataUrl;
  img.classList.add('visible');
}

// ── Automation ────────────────────────────────────────────────────────────────

async function startAutomation() {
  const rules = getCombineRules();

  if (rules.length === 0) {
    setStatus('stopped', 'Add at least one rule with stats and a threshold.');
    return;
  }

  const result = await window.api.startAutomation({
    waitMs:       Math.max(500, parseInt(document.getElementById('ocrMs').value) || 8000),
    combineRules: rules,
  });

  if (result.error) { setStatus('stopped', `Error: ${result.error}`); return; }

  setRunning(true);
  const summary = rules.map((r) => `Σ(${r.stats.join('+')}≥${r.threshold})`).join(' OR ');
  setStatus('running', `Running — ${summary}`);
}

async function stopAutomation() {
  await window.api.stopAutomation();
  setRunning(false);
  setStatus('idle', 'Stopped manually.');
  document.getElementById('cSessionMatch').textContent    = '✗ None';
  document.getElementById('cSessionMatchSub').textContent = 'stopped by user';
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('historyModal').classList.contains('open')) {
      closeHistory();
    } else {
      stopAutomation();
    }
  }
});

// ── Counter display ───────────────────────────────────────────────────────────

window.api.onCounterUpdate(({ sessionRolls, sessionRunning, totalRolls, totalMatches, totalSessions }) => {
  document.getElementById('cSessionRolls').textContent = sessionRolls.toLocaleString();
  const statusEl = document.getElementById('cSessionStatus');
  if (sessionRunning) {
    statusEl.innerHTML = '<span class="session-live">● live</span>';
  } else {
    statusEl.textContent = sessionRolls > 0 ? 'last session' : '—';
  }

  const matchEl    = document.getElementById('cSessionMatch');
  const matchSubEl = document.getElementById('cSessionMatchSub');
  if (sessionRunning) {
    matchEl.textContent    = '…';
    matchSubEl.textContent = 'waiting';
  }

  document.getElementById('cTotalRolls').textContent    = totalRolls.toLocaleString();
  document.getElementById('cTotalSessions').textContent = `${totalSessions} session${totalSessions !== 1 ? 's' : ''}`;
  document.getElementById('cTotalMatches').textContent  = totalMatches.toLocaleString();
  const rate = totalRolls > 0 ? ((totalMatches / totalRolls) * 100).toFixed(2) + '%' : '—';
  document.getElementById('cTotalRate').textContent = rate + ' success rate';
});

window.api.onAutomationStopped(({ reason }) => {
  document.getElementById('cSessionMatch').textContent    = '✓ Found';
  document.getElementById('cSessionMatchSub').textContent = reason.length > 40 ? reason.slice(0, 38) + '…' : reason;
  window.api.getStats().then(({ totalRolls, totalMatches, totalSessions }) => {
    document.getElementById('cTotalRolls').textContent    = totalRolls.toLocaleString();
    document.getElementById('cTotalSessions').textContent = `${totalSessions} sessions`;
    document.getElementById('cTotalMatches').textContent  = totalMatches.toLocaleString();
    const rate = totalRolls > 0 ? ((totalMatches / totalRolls) * 100).toFixed(2) + '%' : '—';
    document.getElementById('cTotalRate').textContent = rate + ' success rate';
  });
  loadHistory();
});

// ── Session History modal ─────────────────────────────────────────────────────

async function openHistory() {
  document.getElementById('historyModal').classList.add('open');
  await loadHistory();
}

function closeHistory() {
  document.getElementById('historyModal').classList.remove('open');
}

function closeHistoryOnBackdrop(e) {
  if (e.target === document.getElementById('historyModal')) closeHistory();
}

async function loadHistory() {
  const list   = document.getElementById('historyList');
  const groups = await window.api.getHistory();

  if (!groups.length) {
    list.innerHTML = '<div class="history-empty">No sessions recorded yet.</div>';
    return;
  }

  list.innerHTML = groups.map(({ condition, sessions, rolls, matches, last_used }) => {
    const rate      = rolls > 0 ? (matches / rolls) * 100 : 0;
    const rateStr   = rolls > 0 ? rate.toFixed(2) + '%' : '—';
    const rateClass = rate >= 5 ? 'rate-good' : rate >= 1 ? 'rate-ok' : 'rate-bad';
    const date      = last_used ? new Date(last_used).toLocaleDateString() : '';
    return `
      <div class="history-group">
        <div class="history-condition">${condition}</div>
        <div class="history-stats">
          <div class="history-stat">
            <span class="history-stat-label">Sessions</span>
            <span class="history-stat-val">${sessions}</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-label">Rolls</span>
            <span class="history-stat-val">${rolls.toLocaleString()}</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-label">Matches</span>
            <span class="history-stat-val">${matches}</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-label">Success rate</span>
            <span class="history-stat-val ${rateClass}">${rateStr}</span>
          </div>
        </div>
        <div class="history-date">Last used: ${date}</div>
      </div>`;
  }).join('');
}

// ── Live OCR feedback ─────────────────────────────────────────────────────────

window.api.onOCRUpdate(({ zoneIndex, text }) => {
  const el = document.getElementById(`ocr${zoneIndex}`);
  if (!el) return;
  el.textContent = text || '(no text)';
  el.classList.remove('matched');
});

window.api.onAutomationStopped(({ reason }) => {
  setRunning(false);
  setStatus('stopped', `Stopped — ${reason}`);
});

// ── Init ──────────────────────────────────────────────────────────────────────

window.api.onUpdateAvailable((version) => {
  const bar = document.createElement('div');
  bar.id = 'update-bar';
  bar.style.cssText = 'background:#1b2a3a;border:1px solid #1976d2;border-radius:6px;padding:6px 12px;font-size:11px;color:#90caf9;margin-bottom:8px;text-align:center';
  bar.textContent = `⬇ Update v${version} is downloading in the background…`;
  document.body.insertBefore(bar, document.body.firstChild);
});

window.api.onUpdateDownloaded(() => {
  const existing = document.getElementById('update-bar');
  if (existing) existing.remove();
  const bar = document.createElement('div');
  bar.style.cssText = 'background:#1a3a1a;border:1px solid #4caf50;border-radius:6px;padding:6px 12px;font-size:11px;color:#a5d6a7;margin-bottom:8px;text-align:center';
  bar.textContent = '✓ Update downloaded — will install automatically when you close the app.';
  document.body.insertBefore(bar, document.body.firstChild);
});

window.addEventListener('load', () => {
  addRule();
  loadHistory();
  setTimeout(fitWindow, 100);  // fit after first render
  window.api.rendererReady();  // tell main the renderer is ready to receive events
});
