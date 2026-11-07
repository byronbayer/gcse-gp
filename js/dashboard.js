import { TOPICS, TOPIC, STRANDS } from './questions.js';
import { decodeResult } from './codec.js';
import { CONFIG } from './config.js';

const KEY = 'gcsegp.pitwall.results';
const PKEY = 'gcsegp.pitwall.key';
const getKey = () => { try { return localStorage.getItem(PKEY) || ''; } catch { return ''; } };
const setKey = (k) => { try { k ? localStorage.setItem(PKEY, k) : localStorage.removeItem(PKEY); } catch { /* ignore */ } };
let remote = [];
let remoteState = ''; // '', 'ok', 'nokey', 'badkey', 'error'

async function loadRemote() {
  if (!CONFIG.resultsEndpoint) return;
  const key = getKey();
  if (!key) { remoteState = 'nokey'; return; }
  try {
    const j = await (await fetch(`${CONFIG.resultsEndpoint}?key=${encodeURIComponent(key)}`)).json();
    if (j.ok) { remote = j.results || []; remoteState = 'ok'; } else { remoteState = 'badkey'; }
  } catch { remoteState = 'error'; }
}
const $ = document.getElementById('dash');
const tip = document.getElementById('tip');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const saveLocal = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtDateTime = (iso) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (x) => `${Math.round(x * 100)}%`;
const ratio = (it) => Math.min(it.ms / 1000 / (TOPIC[it.k]?.target || 30), 3);

let local = loadLocal();
let repo = [];
let banner = '';

function all() {
  const m = new Map();
  [...repo, ...local, ...remote].forEach((r) => r && r.id && Array.isArray(r.q) && m.set(r.id, r));
  return [...m.values()].sort((a, b) => a.t0.localeCompare(b.t0));
}

async function addFromText(text) {
  text = text.trim();
  if (!text) return 0;
  let found = [];
  if (text.startsWith('[') || text.startsWith('{')) {
    const j = JSON.parse(text);
    found = Array.isArray(j) ? j : [j];
  } else {
    const codes = [...text.matchAll(/#r=([A-Za-z0-9_\-%]+)/g)].map((m) => m[1]);
    if (!codes.length) codes.push(text);
    for (const c of codes) found.push(await decodeResult(c));
  }
  const have = new Set(all().map((r) => r.id));
  const fresh = found.filter((r) => r && r.id && Array.isArray(r.q) && !have.has(r.id));
  local = local.concat(fresh);
  saveLocal(local);
  return fresh.length;
}

// ---------- analysis ----------
function sessionStats(r) {
  const n = r.q.length, ok = r.q.filter((i) => i.ok).length;
  return { n, ok, acc: n ? ok / n : 0, pace: n ? r.q.reduce((a, i) => a + ratio(i), 0) / n : 0, ms: r.q.reduce((a, i) => a + i.ms, 0) };
}

function topicStats(results) {
  const by = {};
  results.forEach((r) => r.q.forEach((it) => { (by[it.k] ??= []).push({ ...it, t0: r.t0 }); }));
  return TOPICS.map((t) => {
    const items = by[t.id] || [];
    const recent = items.slice(-3);
    const acc = recent.length ? recent.filter((i) => i.ok).length / recent.length : null;
    const correct = recent.filter((i) => i.ok);
    const pace = median((correct.length ? correct : recent).map(ratio));
    let status = 'untested';
    if (recent.length) {
      if (acc < 0.6) status = 'focus';
      else if (pace > 1.5) status = 'slow';
      else if (acc < 0.8) status = 'building';
      else status = 'strong';
    }
    return { t, attempts: items.length, acc, pace, status, last: items.at(-1) };
  });
}

const STATUS = {
  focus: { label: 'Focus', icon: '!' },
  slow: { label: 'Slow', icon: '◷' },
  building: { label: 'Building', icon: '~' },
  strong: { label: 'Strong', icon: '✓' },
  untested: { label: 'Not tested', icon: '–' },
};
const ORDER = ['focus', 'slow', 'building', 'strong', 'untested'];
const statusPill = (s) => `<span class="status ${s}" title="${STATUS[s].label}"><span aria-hidden="true">${STATUS[s].icon}</span>${STATUS[s].label}</span>`;

// ---------- charts ----------
function lineChart(el, pts, o) {
  const W = Math.max(el.clientWidth, 280), H = 220, m = { l: 40, r: 16, t: 14, b: 28 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, n = pts.length;
  const x = (i) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v) => m.t + ih - ((Math.min(Math.max(v, o.min), o.max) - o.min) / (o.max - o.min)) * ih;
  const ticks = o.ticks.map((t) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end">${o.fmt(t)}</text>`).join('');
  const every = Math.ceil(n / Math.max(1, Math.floor(iw / 70)));
  const xl = pts.map((p, i) => (i % every === 0 || i === n - 1 ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(fmtDate(p.date))}</text>` : '')).join('');
  const ref = o.ref != null ? `<line class="ref" x1="${m.l}" x2="${W - m.r}" y1="${y(o.ref)}" y2="${y(o.ref)}"/><text class="reflabel" x="${W - m.r}" y="${y(o.ref) - 5}" text-anchor="end">${esc(o.refLabel)}</text>` : '';
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label)}">
    <g class="axis">${ticks}${xl}</g>${ref}
    <path class="line" d="${d}"/>
    <line class="cross" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>
    ${pts.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.y)}" r="4.5"/>`).join('')}
    <rect x="${m.l - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/>
  </svg>`;
  const svg = el.querySelector('svg'), cross = svg.querySelector('.cross');
  const move = (e) => {
    const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
    const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1))));
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
    tip.innerHTML = o.tip(pts[i]); tip.hidden = false;
    const tx = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = `${Math.max(8, tx)}px`; tip.style.top = `${e.clientY + 14}px`;
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
}

// ---------- render ----------
let chartData = null;
function drawCharts() {
  if (!chartData) return;
  const { pts } = chartData;
  const accEl = document.getElementById('c-acc'), paceEl = document.getElementById('c-pace');
  if (!accEl) return;
  const tipHtml = (p, main) => `<b>${main}</b><br>${esc(p.name)}<br><span class="m">${esc(fmtDateTime(p.date))} · ${p.ok}/${p.n} correct</span>`;
  lineChart(accEl, pts.map((p) => ({ ...p, y: p.acc })), { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], fmt: pct, ref: 0.8, refLabel: 'Strong (80%)', label: 'Accuracy by session', tip: (p) => tipHtml(p, `${pct(p.acc)} correct`) });
  const maxPace = Math.max(2, Math.ceil(Math.max(...pts.map((p) => p.pace)) * 2) / 2);
  const pt = []; for (let v = 0; v <= maxPace + 1e-9; v += 0.5) pt.push(v);
  lineChart(paceEl, pts.map((p) => ({ ...p, y: p.pace })), { min: 0, max: maxPace, ticks: pt, fmt: (v) => `${v}×`, ref: 1, refLabel: 'Target pace', label: 'Pace vs target by session', tip: (p) => tipHtml(p, `${p.pace.toFixed(2)}× target time`) });
}

function keyCard() {
  if (!CONFIG.resultsEndpoint || remoteState === 'ok') return '';
  if (remoteState === 'error') return `<div class="banner err">Couldn't reach the results sheet. Check your connection, then <button class="btn" data-act="refresh">Try again</button></div>`;
  return `<section class="card">
    <h2>Connect to the results sheet</h2>
    <p class="sub">${remoteState === 'badkey' ? 'That parent key was not accepted. ' : ''}Enter the parent key that setup() printed in Apps Script. It's saved in this browser only.</p>
    <div class="btns"><input id="pkey" class="btn" style="flex:1;min-width:180px;text-align:left" placeholder="Parent key" autocomplete="off"><button class="btn primary" data-act="savekey">Connect</button></div>
  </section>`;
}

function render() {
  const results = all();
  const driver = results.at(-1)?.d || 'Driver';
  if (!results.length) {
    $.innerHTML = `<header class="top"><div><h1>Pit <span>Wall</span></h1><p class="sub">GCSE GP maths telemetry</p></div></header>
      ${banner}${keyCard()}
      <section class="card empty">
        <h2>No results yet</h2>
        <ol>
          <li>Send him the app link (<b>index.html</b> on your site).</li>
          ${CONFIG.resultsEndpoint
            ? '<li>He runs a session. Results arrive here automatically, including sessions he stops part-way through.</li>'
            : '<li>He runs a session and taps <b>Send results</b> at the chequered flag.</li><li>Open the link he sends you. It loads straight into this page.</li>'}
        </ol>
      </section>${dataCard()}`;
    return;
  }

  const stats = results.map((r) => ({ r, ...sessionStats(r) }));
  const finished = stats.filter((s) => s.r.status !== 'unfinished');
  const dnf = stats.length - finished.length;
  const chartStats = finished.length ? finished : stats;
  const latest = chartStats.at(-1), prev = chartStats.at(-2);
  const races = finished.filter((s) => s.r.m === 'race');
  const topics = topicStats(results);
  const focus = topics.filter((t) => t.status === 'focus' || t.status === 'slow');
  const tested = topics.filter((t) => t.status !== 'untested');

  const delta = (a, b, fmt, better) => {
    if (b == null) return 'First session';
    const d = a - b;
    if (Math.abs(d) < 1e-9) return 'No change vs previous';
    const good = better === 'up' ? d > 0 : d < 0;
    return `${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))} vs previous ${good ? '(better)' : '(worse)'}`;
  };

  // strand bars from each topic's recent attempts
  const strandRows = Object.entries(STRANDS).map(([k, v]) => {
    let ok = 0, n = 0;
    results.forEach((r) => r.q.forEach((it) => { if (TOPIC[it.k]?.s === k) { n++; ok += it.ok; } }));
    return { k, name: v.name, ok, n, acc: n ? ok / n : null };
  }).filter((s) => s.n);

  const topicRows = [...topics].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.acc ?? 2) - (b.acc ?? 2));

  chartData = { pts: chartStats.map((s) => ({ date: s.r.t1 || s.r.t0, name: `${s.r.rn} · ${s.r.sn}`, acc: s.acc, pace: s.pace, ok: s.ok, n: s.n })) };

  $.innerHTML = `
    <header class="top">
      <div><h1>Pit <span>Wall</span></h1><p class="sub">${esc(driver)}'s GCSE maths telemetry · ${results.length} session${results.length > 1 ? 's' : ''} logged</p></div>
      <div class="btns">${CONFIG.resultsEndpoint ? '<button class="btn" data-act="refresh">Refresh</button>' : ''}<a class="btn" href="index.html">Open his app</a></div>
    </header>
    ${banner}${keyCard()}
    <section class="kpis">
      <div class="kpi"><div class="label">Latest accuracy</div><div class="value">${pct(latest.acc)}</div><div class="delta">${delta(latest.acc, prev?.acc, pct, 'up')}</div></div>
      <div class="kpi"><div class="label">Latest pace vs target</div><div class="value">${latest.pace.toFixed(2)}×</div><div class="delta">${delta(latest.pace, prev?.pace, (v) => v.toFixed(2) + '×', 'down')}</div></div>
      <div class="kpi"><div class="label">Topics to focus on</div><div class="value">${focus.length}</div><div class="delta">of ${tested.length} tested · ${TOPICS.length - tested.length} not yet tested</div></div>
      <div class="kpi"><div class="label">Race sessions done</div><div class="value">${races.length}</div><div class="delta">${finished.length - races.length} training${dnf ? ` · <b>${dnf} DNF</b>` : ''} · ${clock(stats.reduce((a, s) => a + s.ms, 0))} on task</div></div>
    </section>

    <section class="grid2">
      <div class="card"><h2>Accuracy by session</h2><p class="sub">Share of questions correct. Skips count as wrong.</p><div class="chart" id="c-acc"></div></div>
      <div class="card"><h2>Pace vs target</h2><p class="sub">1.0× = answering in the target time. Lower is faster.</p><div class="chart" id="c-pace"></div></div>
    </section>

    <section class="card">
      <h2>Accuracy by strand</h2><p class="sub">All attempts so far</p>
      <div class="bars">${strandRows.map((s) => `<div class="barrow"><span>${esc(s.name)}</span><span class="track"><span class="fill" style="display:block;width:${Math.max(s.acc * 100, 1)}%"></span></span><span class="v">${pct(s.acc)} · ${s.ok}/${s.n}</span></div>`).join('')}</div>
    </section>

    <section class="card">
      <h2>Topics, weakest first</h2>
      <p class="sub">Based on his last 3 attempts at each topic. <b>Focus</b> = under 60% right · <b>Slow</b> = right but over 1.5× target time · <b>Building</b> = 60–79% · <b>Strong</b> = 80%+</p>
      <div class="tablewrap"><table>
        <thead><tr><th>Topic</th><th>Strand</th><th>Status</th><th class="n">Attempts</th><th class="n">Recent accuracy</th><th class="n">Pace</th></tr></thead>
        <tbody>${topicRows.map((r) => `<tr>
          <td>${esc(r.t.name)} ${r.t.tier === 'H' ? '<span class="tier">Higher</span>' : ''}</td>
          <td>${esc(STRANDS[r.t.s].name)}</td>
          <td>${statusPill(r.status)}</td>
          <td class="n">${r.attempts || '–'}</td>
          <td class="n">${r.acc == null ? '–' : pct(r.acc)}</td>
          <td class="n">${r.pace == null ? '–' : r.pace.toFixed(1) + '×'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>

    <section class="card">
      <h2>Sessions</h2><p class="sub">Tap one to see every question, his answer and his time</p>
      ${[...stats].reverse().map((s) => `<details class="session">
        <summary><b>${esc(s.r.rn)} · ${esc(s.r.sn)}</b><span class="sub">${esc(fmtDateTime(s.r.t1 || s.r.t0))} · ${clock(s.ms)}</span>${s.r.status === 'unfinished' ? `<span class="status focus" title="Did not finish">DNF · stopped after ${s.n} of ${s.r.n || '?'}</span>` : ''}<span class="score">${s.ok}/${s.n} · ${pct(s.acc)}</span></summary>
        <div class="tablewrap qlist"><table>
          <thead><tr><th></th><th>Question</th><th>His answer</th><th>Correct</th><th class="n">Time</th></tr></thead>
          <tbody>${s.r.q.map((it) => `<tr>
            <td>${it.ok ? '<span class="ok" title="Correct">✓</span>' : '<span class="no" title="Wrong">✗</span>'}</td>
            <td>${esc(it.q)}<br><span class="tier">${esc(TOPIC[it.k]?.name || it.k)}</span></td>
            <td>${it.sk ? '<i>skipped</i>' : esc(it.a)}</td>
            <td>${esc(it.x)}</td>
            <td class="n">${(it.ms / 1000).toFixed(1)}s<br><span class="tier">target ${TOPIC[it.k]?.target ?? '?'}s</span></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </details>`).join('')}
    </section>
    ${dataCard()}`;
  drawCharts();
}

function dataCard() {
  return `<section class="card">
    <h2>Data</h2>
    <p class="sub">${remoteState === 'ok' ? `${remote.length} result${remote.length === 1 ? '' : 's'} from your Google Sheet. ` : ''}${local.length ? `${local.length} saved in this browser. ` : ''}${repo.length ? `${repo.length} from the site's data file. ` : ''}To get Claude to analyse them, tap <b>Copy for Claude</b> and paste it into a chat.</p>
    <textarea id="paste" placeholder="Paste a results link he sent you (or exported JSON) here"></textarea>
    <div class="btns">
      <button class="btn primary" data-act="import">Add results</button>
      <button class="btn" data-act="claude">Copy for Claude</button>
      <button class="btn" data-act="export">Download JSON</button>
      ${local.length ? '<button class="btn danger" data-act="clear">Clear this browser</button>' : ''}
      ${getKey() ? '<button class="btn danger" data-act="forgetkey">Forget parent key</button>' : ''}
    </div>
  </section>`;
}

$.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'import') {
    try { const n = await addFromText(document.getElementById('paste').value); banner = `<div class="banner">${n ? `Added ${n} result${n > 1 ? 's' : ''}.` : 'Nothing new. Those results are already here.'}</div>`; }
    catch { banner = '<div class="banner err">Couldn\'t read that. Paste the whole link he sent you.</div>'; }
    render();
  } else if (act === 'claude') {
    const text = `Here are my son's latest GCSE GP maths results (JSON). Please analyse where he's losing marks and time, and write the next round pack for js/packs.js weighted towards his weak topics.\n\n${JSON.stringify(all())}`;
    try { await navigator.clipboard.writeText(text); b.textContent = 'Copied ✓'; } catch { document.getElementById('paste').value = text; b.textContent = 'Copy it from the box'; }
  } else if (act === 'export') {
    const blob = new Blob([JSON.stringify(all(), null, 1)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `gcse-gp-results-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
  } else if (act === 'savekey') {
    setKey(document.getElementById('pkey').value.trim());
    await loadRemote(); banner = remoteState === 'ok' ? '<div class="banner">Connected to the results sheet.</div>' : ''; render();
  } else if (act === 'refresh') {
    b.textContent = 'Loading…'; await loadRemote(); render();
  } else if (act === 'forgetkey') {
    setKey(''); remote = []; remoteState = CONFIG.resultsEndpoint ? 'nokey' : ''; render();
  } else if (act === 'clear') {
    if (confirm('Remove the results saved in this browser? (Results in the site data file stay.) Download JSON first if unsure.')) { local = []; saveLocal(local); banner = ''; render(); }
  }
});

let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawCharts, 150); });

(async function init() {
  try { const r = await fetch('data/results.json', { cache: 'no-store' }); if (r.ok) repo = await r.json(); } catch { /* none yet */ }
  await loadRemote();
  const m = location.hash.match(/r=([A-Za-z0-9_\-%]+)/);
  if (m) {
    try {
      const n = await addFromText(location.hash);
      const r = all().at(-1);
      banner = n ? `<div class="banner">🏁 New result added: <b>${esc(r.rn)} · ${esc(r.sn)}</b>, ${r.q.filter((i) => i.ok).length}/${r.q.length} correct.</div>` : '<div class="banner">That result was already logged.</div>';
    } catch { banner = '<div class="banner err">That results link looks damaged. Ask him to tap Copy link and send it again.</div>'; }
    history.replaceState(null, '', location.pathname + location.search);
  }
  render();
})();
