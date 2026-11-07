/**
 * GCSE GP results collector (Google Apps Script).
 *
 * Setup (once):
 *  1. Create a Google Sheet. Extensions > Apps Script. Replace everything with this file. Save.
 *  2. Choose "setup" in the function dropdown and press Run. Allow the permissions.
 *     Open the Execution log and copy the PARENT KEY it prints.
 *  3. Deploy > New deployment > type: Web app. Execute as: Me. Who has access: Anyone. Deploy.
 *     Copy the Web app URL (ends in /exec).
 *
 * The app posts each session here. Your dashboard reads results back using the parent key,
 * which lives only in this script's properties (never in the public GitHub repo).
 */
const SESSIONS = 'Sessions';
const ANSWERS = 'Answers';
const S_HEAD = ['id', 'received', 'driver', 'round', 'session', 'mode', 'status', 'correct', 'answered', 'planned', 'minutes', 'json'];
const A_HEAD = ['id', 'date', 'driver', 'session', 'lap', 'topic', 'strand', 'correct', 'skipped', 'seconds', 'target seconds', 'question', 'his answer', 'correct answer'];

function setup() {
  const ss = SpreadsheetApp.getActive();
  [[SESSIONS, S_HEAD], [ANSWERS, A_HEAD]].forEach(([name, head]) => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0) ss.deleteSheet(s1);
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('PARENT_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    props.setProperty('PARENT_KEY', key);
  }
  Logger.log('PARENT KEY: ' + key);
}

function doPost(e) {
  let r;
  try { r = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  if (r.app !== 'gcse-gp' || !r.id || !Array.isArray(r.q) || r.q.length > 200) return out({ ok: false, error: 'rejected' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    const s = ss.getSheetByName(SESSIONS), a = ss.getSheetByName(ANSWERS);
    if (!s || !a) return out({ ok: false, error: 'run setup() first' });

    // Sessions: one row per session, replaced if the same session is sent again (e.g. DNF then finished)
    const correct = r.q.filter((i) => i.ok).length;
    const minutes = Math.round(r.q.reduce((t, i) => t + (i.ms || 0), 0) / 600) / 100;
    const row = [r.id, new Date(), r.d, r.rn, r.sn, r.m, r.status || 'finished', correct, r.q.length, r.n || r.q.length, minutes, JSON.stringify(r)];
    const found = s.getRange('A:A').createTextFinder(r.id).matchEntireCell(true).findNext();
    if (found) s.getRange(found.getRow(), 1, 1, row.length).setValues([row]);
    else s.appendRow(row);

    // Answers: one row per question, easy to filter and chart in Sheets
    deleteRowsWithId(a, r.id);
    const when = new Date(r.t1 || Date.now());
    const rows = r.q.map((i, n) => [r.id, when, r.d, r.rn + ' · ' + r.sn, n + 1, i.tn || i.k, i.st || '', i.ok ? 1 : 0, i.sk ? 1 : 0,
      Math.round((i.ms || 0) / 100) / 10, i.tg || '', String(i.q || ''), i.sk ? '' : String(i.a || ''), String(i.x || '')]);
    if (rows.length) {
      const start = a.getLastRow() + 1;
      a.getRange(start, 12, rows.length, 3).setNumberFormat('@'); // keep "3/8" as text, not a date
      a.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
    }
    return out({ ok: true, id: r.id });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const key = PropertiesService.getScriptProperties().getProperty('PARENT_KEY');
  if (!e || !e.parameter || !key || e.parameter.key !== key) return out({ ok: false, error: 'key' });
  const s = SpreadsheetApp.getActive().getSheetByName(SESSIONS);
  const last = s ? s.getLastRow() : 0;
  const results = last < 2 ? [] : s.getRange(2, 12, last - 1, 1).getValues()
    .map((v) => { try { return JSON.parse(v[0]); } catch (err) { return null; } })
    .filter(Boolean);
  return out({ ok: true, results });
}

function deleteRowsWithId(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  // delete contiguous runs from the bottom up
  let i = ids.length - 1;
  while (i >= 0) {
    if (ids[i][0] !== id) { i--; continue; }
    let j = i;
    while (j - 1 >= 0 && ids[j - 1][0] === id) j--;
    sh.deleteRows(j + 2, i - j + 1);
    i = j - 1;
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
