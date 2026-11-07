import { TOPICS, TOPIC, STRANDS, QUICKFIRE_IDS, makeQuestion, checkAnswer, parseAnswer, shuffle, orderByDifficulty } from './questions.js';
import { PACKS, CURRENT } from './packs.js';
import { encodeResult } from './codec.js';
import { CONFIG } from './config.js';

// ---------- storage (wrapped: private browsing can throw) ----------
const LS = { driver: 'gcsegp.driver', history: 'gcsegp.history', outbox: 'gcsegp.outbox' };
const AUTO = !!CONFIG.resultsEndpoint; // results post automatically, no button needed
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

const $app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const P = CONFIG.parentName || 'Dad';

let driver = store.get(LS.driver, null);
let history = store.get(LS.history, []);
let run = null;
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function currentPack() {
  const id = new URLSearchParams(location.search).get('round') || CURRENT;
  return PACKS.find((p) => p.id === id) || PACKS.find((p) => p.id === CURRENT) || PACKS[PACKS.length - 1];
}
function render(html) { clearTimers(); $app.innerHTML = html; window.scrollTo(0, 0); }
const saveHistory = () => store.set(LS.history, history);

// ---------- automatic results ----------
function buildResult(r, status) {
  return { v: 1, app: 'gcse-gp', id: r.id, d: driver.name, p: r.pack, rn: r.packTitle, s: r.session, sn: r.sname, m: r.mode,
    status, n: r.qs.length, t0: r.t0, t1: new Date().toISOString(), q: r.items };
}
// Adds readable topic/strand names so the Google Sheet is easy to read
const payload = (res) => JSON.stringify({ ...res, q: res.q.map((it) => ({ ...it, tn: TOPIC[it.k]?.name, st: STRANDS[TOPIC[it.k]?.s]?.name, tg: TOPIC[it.k]?.target })) });
function queue(res) { const ob = store.get(LS.outbox, {}); ob[res.id] = res; store.set(LS.outbox, ob); }
let flushing = null;
function flush() {
  if (!AUTO) return Promise.resolve();
  flushing ??= (async () => {
    for (const res of Object.values(store.get(LS.outbox, {}))) {
      try {
        const r = await fetch(CONFIG.resultsEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: payload(res) });
        if ((await r.json()).ok) {
          const ob = store.get(LS.outbox, {});
          if (ob[res.id]?.t1 === res.t1) { delete ob[res.id]; store.set(LS.outbox, ob); } // keep it if a newer version was queued
          const h = history.find((x) => x.id === res.id);
          if (h && res.status === 'finished') { h.sent = true; saveHistory(); }
        }
      } catch { /* offline: stays queued, retried next time */ }
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
const isQueued = (id) => !!store.get(LS.outbox, {})[id];
// If he closes or leaves the app mid-session, send what he's done so far (marked unfinished)
function saveUnfinished() {
  if (!AUTO || !run || !run.items.length || run.finished) return;
  const res = buildResult(run, 'unfinished');
  queue(res);
  try { navigator.sendBeacon(CONFIG.resultsEndpoint, new Blob([payload(res)], { type: 'text/plain;charset=utf-8' })); } catch { /* retried from outbox */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveUnfinished(); });
window.addEventListener('pagehide', saveUnfinished);
window.addEventListener('online', () => flush());

// ---------- screens ----------
function setup() {
  render(`
    <section class="hero">
      <div class="brand" style="justify-content:center"><span class="flag"></span>GCSE <em>GP</em></div>
      <h1>Every lap<br><em>counts</em></h1>
      <p class="muted">Maths practice for racing drivers. Speed and accuracy, timed to the tenth.</p>
    </section>
    <form class="card stack" data-form="setup">
      <h2>Driver name</h2>
      <input class="field" name="name" maxlength="20" autocomplete="given-name" placeholder="Your first name" required>
      <button class="btn go block" type="submit">Start engine 🏁</button>
    </form>`);
}

function home() {
  run = null;
  const pack = currentPack();
  const pts = history.reduce((a, h) => a + (h.points || 0), 0);
  const unsent = AUTO ? [] : history.filter((h) => !h.sent);
  const waiting = AUTO ? Object.keys(store.get(LS.outbox, {})).length : 0;
  const ran = (s) => history.some((h) => h.pack === pack.id && h.session === s.id);
  const nextUp = pack.sessions.find((s) => !ran(s));
  const sessionTile = (s) => {
    const done = history.filter((h) => h.pack === pack.id && h.session === s.id);
    const best = done.reduce((b, h) => (!b || h.correct / h.total > b.correct / b.total ? h : b), null);
    const n = s.kind === 'quickfire' ? s.count : s.topics.length;
    const mins = s.kind === 'quickfire' ? 2 : Math.max(1, Math.round(s.topics.reduce((a, id) => a + TOPIC[id].target, 0) / 60));
    const status = best ? `<b>✓ ${best.correct}/${best.total}</b>best` : s === nextUp ? '<b style="color:var(--amber)">Next up</b>' : 'Not run';
    return `<button class="session" data-act="start" data-session="${s.id}"${s === nextUp ? ' style="border-color:var(--amber)"' : ''}>
      <span class="ico">${s.kind === 'quickfire' ? '⏱️' : '🏎️'}</span>
      <span><span class="t">${esc(s.name)}</span><br><span class="m">${n} laps · ~${mins} min · ${esc(s.blurb || '')}</span></span>
      <span class="st">${status}</span>
    </button>`;
  };
  const practice = Object.entries(STRANDS).map(([k, v]) => {
    const n = TOPICS.filter((t) => t.s === k).length;
    return `<button class="strand-btn" data-act="practice" data-strand="${k}">${esc(v.name)}<small>${k === 'Q' ? '20 quick questions' : `10 laps · ${n} topics`}</small></button>`;
  }).join('');

  render(`
    <div class="topbar">
      <div class="brand"><span class="flag"></span>GCSE <em>GP</em></div>
      <div class="pts"><b class="num">${pts.toLocaleString('en-GB')}</b><span>Championship pts</span></div>
    </div>
    ${unsent.length ? `<div class="card alert"><b>📤 ${unsent.length} result${unsent.length > 1 ? 's' : ''} not sent to ${esc(P)} yet.</b>
      <div class="stack" style="margin-top:10px">${unsent.slice(-3).map((h) => `<button class="btn wa block" data-act="resend" data-id="${h.id}">Send ${esc(h.sname)} (${h.correct}/${h.total})</button>`).join('')}</div></div>` : ''}
    ${waiting ? `<p class="muted small" style="text-align:center">⏳ ${waiting} result${waiting > 1 ? 's' : ''} waiting for signal to send to ${esc(P)}.</p>` : ''}
    <section class="card">
      <h2>Round ${pack.round} · ${esc(pack.track)}</h2>
      <div class="round-title">${esc(driver.name)}'s race weekend</div>
      <p class="muted small" style="margin:0">${esc(pack.intro || '')}</p>
      ${pack.sessions.map(sessionTile).join('')}
    </section>
    <section class="card">
      <h2>Training</h2>
      <p class="muted small" style="margin:0">Pick a strand and get some extra laps in, easiest first. You can send these to ${esc(P)} too.</p>
      <div class="strand-grid">${practice}</div>
    </section>
    <p style="text-align:center"><button class="link" data-act="how">How it works</button> · <button class="link" data-act="rename">Change driver</button></p>`);
}

function how() {
  render(`
    <div class="brand"><span class="flag"></span>GCSE <em>GP</em></div>
    <section class="card stack">
      <h2>How it works</h2>
      <p>Each <b>round</b> is a race weekend: <b>Free Practice</b> (quickfire mental maths), then <b>Quali 1</b>, <b>Quali 2</b> and the <b>Race</b>. Each session is harder than the last, and inside each one the questions start easy and build up.</p>
      <p>Every question is timed. Points: <b>10</b> for a correct answer, <b>+5</b> if you beat the target time.</p>
      <p>🧮 means a calculator is allowed (like Paper 2 and 3). 🧠 means do it in your head or on paper (like Paper 1).</p>
      <p>Stuck? Hit <b>Skip</b>. A skip tells us more than a guess does.</p>
      <p>At the flag you get your sectors: <span style="color:var(--purple)">purple</span> = personal best, <span style="color:var(--green)">green</span> = solid, <span style="color:var(--yellow)">yellow</span> = time to find there.</p>
      <p>${AUTO ? `Your results go to ${esc(P)}'s pit wall automatically, including sessions you don't finish.` : `Send your results to ${esc(P)} at the end.`} That's how the next round gets built around where you're losing time.</p>
    </section>
    <button class="btn go block" data-act="home">Back to pit lane</button>`);
}

// ---------- running a session ----------
function startSession(sessionId) {
  const pack = currentPack();
  const s = pack.sessions.find((x) => x.id === sessionId);
  const quick = s.kind === 'quickfire';
  const qs = quick
    ? Array.from({ length: s.count }, () => makeQuestion(QUICKFIRE_IDS[Math.floor(Math.random() * QUICKFIRE_IDS.length)]))
    : orderByDifficulty(s.topics).map(makeQuestion);
  begin({ mode: 'race', pack: pack.id, packTitle: pack.title, session: s.id, sname: s.name, quick, qs });
}

function startPractice(strand) {
  const ids = TOPICS.filter((t) => t.s === strand).map((t) => t.id);
  const quick = strand === 'Q';
  const n = quick ? 20 : 10;
  let pool = [];
  while (pool.length < n) pool = pool.concat(shuffle(ids));
  begin({ mode: 'practice', pack: 'practice', packTitle: 'Training', session: `practice-${strand}`, sname: `Training: ${STRANDS[strand].name}`, quick, qs: orderByDifficulty(pool.slice(0, n)).map(makeQuestion) });
}

function begin(r) {
  run = { ...r, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), i: 0, items: [], t0: new Date().toISOString(), input: '', locked: true };
  lights(() => showQ());
}

function lights(then) {
  render(`<section class="lights">
    <div class="gantry">${'<span class="light"></span>'.repeat(5)}</div>
    <p class="lights-msg" id="lmsg"></p>
    <p class="muted">${esc(run.sname)} · ${run.qs.length} laps</p>
    <button class="link" data-act="skip-lights">Tap to skip</button>
  </section>`);
  let done = false;
  const go = () => { if (!done) { done = true; then(); } };
  run.skipLights = go;
  const ls = [...$app.querySelectorAll('.light')];
  ls.forEach((l, i) => later(() => l.classList.add('on'), 500 + i * 600));
  later(() => { ls.forEach((l) => l.classList.remove('on')); document.getElementById('lmsg').textContent = 'Lights out!'; later(go, 600); }, 500 + 5 * 600 + 300 + Math.random() * 900);
}

function showQ() {
  const q = run.qs[run.i];
  run.input = '';
  run.locked = false;
  const progress = (run.i / run.qs.length) * 100;
  const unit = q.type === 'num' && q.unit ? `<span class="unit ${q.unit === '£' ? 'pre' : ''}">${esc(q.unit)}</span>` : '';
  const answerArea = q.type === 'mc'
    ? `<div class="options">${q.options.map((o, i) => `<button class="opt" data-act="opt" data-i="${i}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join('')}</div>`
    : `<div class="answer" id="answer"><span id="ans"></span><span class="caret"></span>${unit}</div>
       <div class="keypad">
         ${['7', '8', '9', '⌫', '4', '5', '6', '−', '1', '2', '3', '/'].map((k) => `<button class="key ${'⌫−/'.includes(k) ? 'fn' : ''}" data-act="key" data-k="${k}">${k}</button>`).join('')}
         <button class="key wide" data-act="key" data-k="0">0</button>
         <button class="key" data-act="key" data-k=".">.</button>
         <button class="key fn" data-act="key" data-k="C">C</button>
       </div>`;
  render(`<section>
    <header class="hud">
      <span class="lap">LAP <b>${run.i + 1}</b>/${run.qs.length}</span>
      <span class="chip">${esc(STRANDS[q.strand].name)}</span>
      <span class="clock" id="clock">0.0</span>
    </header>
    <div class="track"><div class="track-fill" style="width:${progress}%"></div><span class="car" style="left:${Math.max(progress, 3)}%">🏎️</span></div>
    ${run.quick ? '' : `<div class="badges">${q.calc ? '<span class="badge calc">🧮 Calculator OK</span>' : '<span class="badge">🧠 No calculator</span>'}${q.tier === 'H' ? '<span class="badge higher">Higher</span>' : ''}</div>`}
    <p class="qtext ${run.quick ? 'quick' : ''}">${esc(q.text)}</p>
    ${!run.quick && q.why ? `<p class="why">📻 ${esc(q.why)}</p>` : ''}
    ${answerArea}
    <div class="actions">
      <button class="btn ghost" data-act="skip">Skip</button>
      ${q.type === 'mc' ? '' : '<button class="btn go" data-act="submit">Submit</button>'}
    </div>
  </section>`);
  run.qStart = performance.now();
  const el = document.getElementById('clock');
  const tick = () => {
    if (!run || run.locked || !el.isConnected) return;
    const s = (performance.now() - run.qStart) / 1000;
    el.textContent = s.toFixed(1);
    el.classList.toggle('slow', s > q.target);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function typeKey(k) {
  if (!run || run.locked) return;
  if (k === '⌫') run.input = run.input.slice(0, -1);
  else if (k === 'C') run.input = '';
  else if (k === '−' || k === '-') run.input = run.input.startsWith('-') ? run.input.slice(1) : '-' + run.input;
  else if (run.input.length < 12) run.input += k;
  const a = document.getElementById('ans');
  if (a) a.textContent = run.input.replace('-', '−');
}

function submit(raw, skipped = false) {
  if (!run || run.locked) return;
  const q = run.qs[run.i];
  if (!skipped && q.type === 'num' && parseAnswer(raw) === null) {
    const a = document.getElementById('answer');
    if (a) { a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
    return;
  }
  run.locked = true;
  const ms = Math.round(performance.now() - run.qStart);
  const ok = !skipped && checkAnswer(q, raw);
  run.items.push({ k: q.id, q: q.text, a: skipped ? '' : String(raw), x: String(q.show), ok: ok ? 1 : 0, sk: skipped ? 1 : 0, ms });
  if (q.type === 'mc') {
    $app.querySelectorAll('.opt').forEach((b) => {
      const o = q.options[+b.dataset.i];
      if (o === q.answer) b.classList.add('right'); else if (o === raw) b.classList.add('wrong');
    });
  }
  feedback(q, ok, skipped, ms);
}

function feedback(q, ok, skipped, ms) {
  const secs = (ms / 1000).toFixed(1);
  const onPace = ms / 1000 <= q.target;
  const box = document.createElement('div');
  box.className = `feedback ${ok ? 'ok' : skipped ? 'skip' : 'bad'}`;
  if (ok) {
    box.innerHTML = `<div><div class="fb-title">✓ Green flag</div><div class="fb-line num">${secs}s${onPace ? ' · ⚡ on pace +5' : ''}</div></div>`;
    $app.appendChild(box);
    later(next, run.quick ? 450 : 900);
    return;
  }
  const yours = skipped ? '' : `<div class="fb-line">You put: <b>${esc(run.input ? run.input.replace('-', '−') : run.items.at(-1).a)}</b></div>`;
  box.innerHTML = `<div>
    <div class="fb-title">${skipped ? '⏸ Pit stop' : '✗ Off track'}</div>
    ${yours}
    <div class="fb-line">Answer: <b>${esc(q.show)}</b></div>
    ${run.quick ? '' : `<div class="fb-explain">${esc(q.explain)}</div><button class="btn go block" data-act="next">Next lap ⏎</button>`}
  </div>`;
  $app.appendChild(box);
  if (run.quick) later(next, 1500);
}

function next() {
  if (!run) return;
  run.i++;
  if (run.i >= run.qs.length) finish(); else showQ();
}

async function finish() {
  const r = run;
  r.finished = true;
  const items = r.items;
  const correct = items.filter((i) => i.ok).length;
  const totalMs = items.reduce((a, i) => a + i.ms, 0);
  const points = items.reduce((a, it, idx) => a + (it.ok ? 10 + (it.ms / 1000 <= r.qs[idx].target ? 5 : 0) : 0), 0);
  const strands = {};
  items.forEach((it, idx) => { const s = r.qs[idx].strand; strands[s] ??= { c: 0, t: 0 }; strands[s].t++; strands[s].c += it.ok; });

  // personal bests per strand, from earlier sessions
  const prevBest = {};
  history.forEach((h) => Object.entries(h.strands || {}).forEach(([s, v]) => { prevBest[s] = Math.max(prevBest[s] ?? 0, v.c / v.t); }));

  const id = r.id;
  const result = buildResult(r, 'finished');
  if (AUTO) queue(result);
  const code = await encodeResult(result);
  const entry = { id, pack: r.pack, title: r.packTitle, session: r.session, sname: r.sname, mode: r.mode, date: result.t1, correct, total: items.length, ms: totalMs, points, strands, code, sent: false };
  history.push(entry);
  saveHistory();

  const sectors = Object.entries(strands).map(([s, v]) => {
    const acc = v.c / v.t;
    const cls = acc > 0 && (prevBest[s] === undefined ? acc >= 0.8 : acc > prevBest[s]) ? 'purple' : acc >= 0.7 ? 'green' : 'yellow';
    const tag = { purple: 'Personal best', green: 'Solid', yellow: 'Find time here' }[cls];
    return `<div class="sector ${cls}"><b>${esc(STRANDS[s].name)}</b><span class="tag">${v.c}/${v.t} · ${tag}</span><div class="bar"><i style="width:${Math.max(acc * 100, 3)}%"></i></div></div>`;
  }).join('');

  const misses = items.map((it, idx) => ({ it, q: r.qs[idx] })).filter((x) => !x.it.ok);
  const debrief = misses.length
    ? misses.map(({ it, q }) => `<div class="debrief">
        <p>${esc(q.text)}</p>
        <p class="ans">${it.sk ? '<span class="x">Skipped</span>' : `You: <span class="x">${esc(it.a.replace('-', '−'))}</span>`} · Answer: <span class="c">${esc(q.show)}</span></p>
        ${r.quick ? '' : `<p class="muted small">${esc(q.explain)}</p>`}
      </div>`).join('')
    : '<p>Clean race. No mistakes! 🏆</p>';

  run = null;
  render(`
    <div class="chequer"></div>
    <section class="score">
      <div class="muted">${esc(r.packTitle)} · ${esc(r.sname)}</div>
      <div class="big">${correct}<small>/${items.length}</small></div>
      <div class="stats3">
        <div><b>${clock(totalMs)}</b><span>Race time</span></div>
        <div><b>${(totalMs / items.length / 1000).toFixed(1)}s</b><span>Avg lap</span></div>
        <div><b style="color:var(--amber)">+${points}</b><span>Points</span></div>
      </div>
    </section>
    ${AUTO ? `<section class="card"><p id="sync" style="margin:0;text-align:center">📡 Sending to ${esc(P)}'s pit wall…</p></section>` : `<section class="card stack">
      <button class="btn wa block" data-act="send" data-id="${id}">📤 Send results to ${esc(P)}</button>
      <div class="row">
        <button class="btn ghost" data-act="email" data-id="${id}">Email</button>
        <button class="btn ghost" data-act="copy" data-id="${id}">Copy link</button>
      </div>
    </section>`}
    <section class="card"><h2>Sectors</h2>${sectors}</section>
    <section class="card"><h2>Debrief${misses.length ? ` · ${misses.length} to review` : ''}</h2>${debrief}</section>
    <button class="btn ghost block" data-act="home">Back to pit lane</button>`);

  if (AUTO) {
    await flush();
    const el = document.getElementById('sync');
    if (el) el.innerHTML = isQueued(id)
      ? `⏳ No signal right now. Results are saved and will send automatically next time you open the app.`
      : `<span style="color:var(--green)">✓ Results sent to ${esc(P)}'s pit wall</span>`;
  }
}

// ---------- sending results (manual fallback, only when no resultsEndpoint is set) ----------
const resultUrl = (h) => new URL(CONFIG.dashboardPath, location.href.split('#')[0]).href.split('?')[0] + '#r=' + h.code;
const shareText = (h) => `🏁 ${driver.name}: ${h.title} ${h.sname}. ${h.correct}/${h.total} in ${clock(h.ms)}. Telemetry:`;
function markSent(h) { h.sent = true; saveHistory(); }

async function send(h) {
  const text = shareText(h), url = resultUrl(h);
  if (navigator.share && !CONFIG.parentWhatsApp) {
    try { await navigator.share({ title: 'GCSE GP results', text, url }); markSent(h); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  markSent(h);
  location.href = `https://wa.me/${CONFIG.parentWhatsApp || ''}?text=${encodeURIComponent(text + ' ' + url)}`;
}
function email(h) {
  markSent(h);
  location.href = `mailto:${CONFIG.parentEmail || ''}?subject=${encodeURIComponent(`GCSE GP: ${h.sname} ${h.correct}/${h.total}`)}&body=${encodeURIComponent(shareText(h) + '\n' + resultUrl(h))}`;
}
async function copy(h, btn) {
  try { await navigator.clipboard.writeText(shareText(h) + ' ' + resultUrl(h)); markSent(h); btn.textContent = 'Copied ✓'; }
  catch { prompt('Copy this and send it:', resultUrl(h)); markSent(h); }
}

// ---------- events ----------
$app.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form="setup"]');
  if (!f) return;
  e.preventDefault();
  const name = new FormData(f).get('name').trim();
  if (!name) return;
  driver = { name };
  store.set(LS.driver, driver);
  home();
});

$app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const h = b.dataset.id && history.find((x) => x.id === b.dataset.id);
  switch (act) {
    case 'start': return startSession(b.dataset.session);
    case 'practice': return startPractice(b.dataset.strand);
    case 'skip-lights': return run?.skipLights?.();
    case 'key': return typeKey(b.dataset.k);
    case 'submit': return submit(run?.input);
    case 'skip': return submit('', true);
    case 'opt': return run && submit(run.qs[run.i].options[+b.dataset.i]);
    case 'next': return next();
    case 'home': return home();
    case 'how': return how();
    case 'rename': return setup();
    case 'send': case 'resend': return h && send(h).then(() => act === 'resend' && home());
    case 'email': return h && email(h);
    case 'copy': return h && copy(h, b);
  }
});

document.addEventListener('keydown', (e) => {
  if (!run || e.target.matches('input, textarea')) return;
  const q = run.qs[run.i];
  if (run.locked) {
    if (e.key === 'Enter' && $app.querySelector('[data-act="next"]')) { e.preventDefault(); next(); }
    return;
  }
  if (!q) return;
  if (q.type === 'mc') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= q.options.length) submit(q.options[n - 1]);
    return;
  }
  if (/^[0-9./]$/.test(e.key)) typeKey(e.key);
  else if (e.key === '-') typeKey('-');
  else if (e.key === 'Backspace') typeKey('⌫');
  else if (e.key === 'Enter') { e.preventDefault(); submit(run.input); }
});

if (driver) home(); else setup();
flush().then(() => { if (driver && !run && $app.querySelector('.round-title')) home(); });
