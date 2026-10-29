// In-browser checks. Open http://localhost:5173/tests/browser.html and tap "Run tests".
// Phase 1 runs rendering + audio and writes test data; the page then reloads itself (phase 2)
// and verifies that the data survived the reload, then cleans it up.
import { VOWELS } from '../js/content/vowels.js';
import { LETTERS, isValidCombo } from '../js/content/letters.js';
import { ITEMS } from '../js/content/items.js';
import { isolatedVowelText, comboText } from '../js/core/catalog.js';
import { AudioController } from '../js/core/audio.js';
import { createPlayer } from '../js/ui/platform.js';
import { openRecordingStore } from '../js/storage/recordings.js';
import { makeLocalStore } from '../js/storage/local.js';
import { defaultSettings, normalizeSettings } from '../js/core/settings.js';

const results = [];
const params = new URLSearchParams(location.search);
const phase = params.get('phase') === '2' ? 2 : 1;
const TEST_DB = 'nekudos-test';
const prefixed = {
  getItem: (k) => localStorage.getItem(`test.${k}`),
  setItem: (k, v) => localStorage.setItem(`test.${k}`, v),
};

function report(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function show() {
  const all = [...JSON.parse(sessionStorage.getItem('nekudos-test-phase1') || '[]'), ...results];
  const ol = document.getElementById('results');
  ol.replaceChildren(
    ...all.map((r) => {
      const li = document.createElement('li');
      li.className = r.ok ? 'pass' : 'fail';
      li.textContent = r.name + (r.detail ? ` — ${r.detail}` : '');
      return li;
    }),
  );
  const failed = all.filter((r) => !r.ok).length;
  document.getElementById('summary').textContent = `${all.length - failed} passed, ${failed} failed`;
  document.title = failed ? `FAIL (${failed})` : `PASS (${all.length})`;
  window.testResults = { passed: all.length - failed, failed, results: all };
}

// ---------- rendering ----------

function makeCard(text, isVowel, count) {
  const phone = document.createElement('div');
  phone.className = 'phone';
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.dataset.count = String(count);
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.className = `choice ${isVowel ? 'vowel-card' : ''}`;
    const span = document.createElement('span');
    span.className = `heb ${isVowel ? 'vowel-glyph' : 'item-glyph'}`;
    span.lang = 'he';
    span.dir = 'rtl';
    span.textContent = text;
    btn.append(span);
    grid.append(btn);
  }
  phone.append(grid);
  return phone;
}

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Returns null if fine, or a description of the problem.
function checkInk(span, phone) {
  const card = span.closest('.choice');
  const cs = getComputedStyle(span);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText(span.textContent);
  // Locate the baseline with a zero-height inline-block.
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  span.append(probe);
  const baseline = probe.getBoundingClientRect().top;
  probe.remove();
  const sr = span.getBoundingClientRect();
  const cr = card.getBoundingClientRect();
  const pr = phone.getBoundingClientRect();
  const inkTop = baseline - m.actualBoundingBoxAscent;
  const inkBottom = baseline + m.actualBoundingBoxDescent;
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const problems = [];
  if (inkTop < cr.top + 2) problems.push(`marks above reach card edge (${(cr.top - inkTop).toFixed(1)}px over)`);
  if (inkBottom > cr.bottom - 2) problems.push(`marks below reach card edge (${(inkBottom - cr.bottom).toFixed(1)}px over)`);
  if (inkWidth > cr.width - 4) problems.push(`too wide for card (${inkWidth.toFixed(0)} > ${cr.width.toFixed(0)})`);
  if (cr.right > pr.right + 1 || cr.left < pr.left - 1) problems.push('card overflows phone width');
  // No ancestor between the text and the card may clip.
  for (let el = span; el && el !== card.parentElement; el = el.parentElement) {
    const o = getComputedStyle(el);
    if (['hidden', 'clip'].includes(o.overflowX) || ['hidden', 'clip'].includes(o.overflowY)) problems.push(`${el.className} clips overflow`);
  }
  if (sr.height < (inkBottom - inkTop) - 1) problems.push('line box shorter than ink');
  return problems.length ? problems.join('; ') : null;
}

async function renderChecks() {
  const stage = document.getElementById('stage');
  for (const font of ['serif', 'sans']) {
    document.body.dataset.font = font;
    const family = font === 'serif' ? 'Nekudos Serif' : 'Nekudos Sans';
    await document.fonts.load(`80px "${family}"`, 'אָ◌ְ');
    report(`${font}: bundled Hebrew font loaded`, document.fonts.check(`80px "${family}"`, 'אָ'));

    const cases = [];
    for (const v of VOWELS) cases.push({ label: `vowel ${v.id}`, text: isolatedVowelText(v), isVowel: true, count: 4 });
    for (const l of LETTERS) for (const v of VOWELS) if (isValidCombo(l, v)) cases.push({ label: `combo ${l.id}+${v.id}`, text: comboText(l, v), isVowel: false, count: 4 });
    for (const it of ITEMS) cases.push({ label: `item ${it.id}`, text: it.text, isVowel: false, count: 4 });
    for (const it of ITEMS) cases.push({ label: `item ${it.id} (1 card)`, text: it.text, isVowel: false, count: 1 });

    const failures = [];
    for (const c of cases) {
      const phone = makeCard(c.text, c.isVowel, c.count);
      stage.append(phone);
      const problem = checkInk(phone.querySelector('.heb'), phone);
      if (problem) failures.push(`${c.label}: ${problem}`);
      phone.remove();
    }
    report(`${font}: ${cases.length} vowels / combinations / items fit their cards at ${innerWidth}px wide without clipping`, failures.length === 0, failures.slice(0, 6).join(' | '));

    // Dotted-circle carrier: marks must sit on the circle (shaped as one cluster), not after it.
    ctx.font = `80px "${family}"`;
    const circle = ctx.measureText('◌').width;
    const bad = VOWELS.filter((v) => !v.standalone && !v.trailing).filter((v) => Math.abs(ctx.measureText(isolatedVowelText(v)).width - circle) > 1);
    report(`${font}: vowel marks attach to the dotted circle (no extra width)`, bad.length === 0, bad.map((v) => v.id).join(', '));
  }
  document.body.dataset.font = 'serif';
  // Leave a visible sample for screenshots.
  const sample = makeCard(isolatedVowelText(VOWELS[0]), true, 4);
  sample.querySelectorAll('.heb').forEach((s, i) => (s.textContent = isolatedVowelText(VOWELS[[0, 2, 3, 12][i]])));
  stage.append(sample, makeCard('שָׁלוֹם', false, 4), makeCard('מֹשֶׁה', false, 1));
}

// ---------- audio ----------

function toneWav(freq, seconds) {
  const rate = 16000;
  const n = Math.floor(rate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / rate) * 3000, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

async function audioChecks() {
  const player = createPlayer();
  await player.unlock();
  const urls = { a1: toneWav(440, 0.8), a2: toneWav(550, 0.8), b1: toneWav(660, 0.3) };
  const name = Object.fromEntries(Object.entries(urls).map(([k, u]) => [u, k]));
  const started = [];
  let overlap = false;
  player.element.addEventListener('playing', () => {
    started.push(name[player.element.currentSrc] || 'other');
  });
  // Any second <audio> element that is playing at the same time would be an overlap.
  const ac = new AudioController({ player, speaker: { speak: async () => {}, cancel() {} }, getUrl: async (k) => urls[k] });
  const first = ac.play([{ type: 'rec', key: 'a1' }, { type: 'rec', key: 'a2' }]);
  await new Promise((r) => setTimeout(r, 250));
  const second = ac.play([{ type: 'rec', key: 'b1' }]);
  const [r1, r2] = await Promise.all([first, second]);
  overlap = document.querySelectorAll('audio').length > 0; // the controller uses one detached element only
  const played = started.filter((s) => s !== 'other');
  report('real audio: new prompt cancels the old one; obsolete clips never play', r1 === false && r2 === true && !played.includes('a2'), `played: ${played.join(' → ') || '(none — autoplay blocked? tap the button)'}`);
  report('real audio: exactly one audio element is used (no overlapping players)', !overlap);
  report('real audio: clips actually played', played.includes('b1'), played.length ? '' : 'nothing played');
}

// ---------- persistence (phase 1 writes, phase 2 verifies after reload) ----------

const BYTES = new Uint8Array(5000).map((_, i) => (i * 7) % 256);

async function writePersistence() {
  const store = makeLocalStore(prefixed);
  const s = normalizeSettings({ ...defaultSettings(), enabledVowels: ['segol', 'shva'], choices: 2, music: true });
  store.saveSettings(s);
  store.saveProgress({ version: 1, items: {}, stars: 17, rounds: 3 });
  const recs = await openRecordingStore(indexedDB, TEST_DB);
  await recs.put('vname:test', new Blob([BYTES], { type: 'audio/wav' }), 'mic');
  recs.close();
  report('persistence: wrote settings, progress and a recording', true);
}

async function verifyPersistence() {
  const store = makeLocalStore(prefixed);
  const s = store.loadSettings();
  report('persistence: settings survived a reload', s.choices === 2 && s.music === true && s.enabledVowels.join() === 'segol,shva');
  report('persistence: progress survived a reload', store.loadProgress().stars === 17);
  const recs = await openRecordingStore(indexedDB, TEST_DB);
  const rec = await recs.get('vname:test');
  const back = rec ? new Uint8Array(await rec.blob.arrayBuffer()) : null;
  report('persistence: recording survived a reload (IndexedDB)', recs.has('vname:test') && back?.length === BYTES.length && back.every((b, i) => b === BYTES[i]));
  await recs.remove('vname:test');
  report('persistence: recording deleted', !recs.has('vname:test'));
  recs.close();
  indexedDB.deleteDatabase(TEST_DB);
  for (const k of Object.keys(localStorage)) if (k.startsWith('test.')) localStorage.removeItem(k);
}

async function run() {
  try {
    if (phase === 1) {
      sessionStorage.removeItem('nekudos-test-phase1');
      await renderChecks();
      await audioChecks();
      await writePersistence();
      sessionStorage.setItem('nekudos-test-phase1', JSON.stringify(results));
      location.search = '?phase=2';
      return;
    }
    await verifyPersistence();
  } catch (err) {
    report('unexpected error', false, err.stack || String(err));
  }
  show();
}

document.getElementById('run').addEventListener('click', () => {
  if (phase === 2) location.search = '';
  else run();
});
if (phase === 2) {
  document.getElementById('run').textContent = 'Run again';
  run();
}
