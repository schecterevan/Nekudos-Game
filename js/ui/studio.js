// Parent recording studio: record / upload / play / replace / delete every clip, and see what is missing.
import { h, heb } from './dom.js';
import { micSupported, startRecording, cleanUpRecording, MAX_RECORD_MS } from './recorder.js';
import { PROMPTS } from '../content/prompts.js';
import { VOWELS } from '../content/vowels.js';
import { keys, makeResolver } from '../core/audioKeys.js';
import {
  enabledVowels,
  enabledCombos,
  readingCandidates,
  isolatedVowelText,
  vowelName,
  letterName,
  vowelGroup,
  allItems,
} from '../core/catalog.js';

let active = null; // the one recording in progress: { key, handle }

function stopActive() {
  if (active) {
    active.handle.cancel();
    active = null;
  }
}

function timeAgo(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// One clip: status + Play / Record / Upload / Delete.
// opts: { key, title, hint, required, borrowed: { key, label } | null, onChange }
export function recordingRow(app, opts) {
  const row = h('div', { class: 'rec-row' });
  const draw = (message = '') => {
    const info = app.recs.info(opts.key);
    const recording = active?.key === opts.key;
    let status;
    if (recording) status = h('span', { class: 'pill rec' }, 'Recording… tap Stop');
    else if (info) status = h('span', { class: 'pill ok' }, `Recorded${info.source === 'upload' ? ' (uploaded)' : info.source === 'import' ? ' (imported)' : ''} · ${timeAgo(info.updatedAt)}`);
    else if (opts.borrowed) status = h('span', { class: 'pill info' }, `Using same-sound recording: ${opts.borrowed.label}`);
    else if (opts.required) status = h('span', { class: 'pill missing' }, 'Missing — needed');
    else status = h('span', { class: 'pill muted' }, 'Not recorded');

    const playKey = info ? opts.key : opts.borrowed?.key;
    const fileInput = h('input', { type: 'file', accept: 'audio/*', class: 'visually-hidden', 'aria-label': 'Upload audio file' });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      draw('Processing…');
      const blob = await cleanUpRecording(f);
      await app.recs.put(opts.key, blob, 'upload');
      draw();
      opts.onChange?.();
      app.audio.play([{ type: 'rec', key: opts.key }]);
    });

    row.replaceChildren(
      h('div', { class: 'rec-title' }, opts.title, opts.hint ? h('div', { class: 'rec-hint' }, opts.hint) : null),
      h('div', { class: 'rec-status' }, status, message ? h('span', { class: 'rec-msg' }, message) : null),
      h(
        'div',
        { class: 'rec-actions' },
        h('button', { class: 'btn', disabled: !playKey || recording, onclick: () => app.audio.play([{ type: 'rec', key: playKey }]) }, '▶ Play'),
        recording
          ? h('button', { class: 'btn btn-stop', onclick: () => finish() }, '■ Stop')
          : h('button', { class: 'btn btn-rec', disabled: !micSupported(), title: micSupported() ? '' : 'Microphone recording needs HTTPS or localhost', onclick: () => begin() }, info ? '● Re-record' : '● Record'),
        h('label', { class: 'btn' }, '⬆ Upload', fileInput),
        info ? h('button', { class: 'btn btn-ghost', onclick: () => remove() }, 'Delete') : null,
      ),
    );
  };

  async function begin() {
    stopActive();
    app.audio.stop();
    try {
      const handle = await startRecording({ onAutoStop: () => finish() });
      active = { key: opts.key, handle };
      draw(`Speak now (up to ${MAX_RECORD_MS / 1000}s)`);
    } catch (err) {
      draw(err?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : `Could not start the microphone: ${err?.message || err}`);
    }
  }

  async function finish() {
    if (active?.key !== opts.key) return;
    const { handle } = active;
    active = null;
    draw('Saving…');
    const raw = await handle.stop();
    const blob = await cleanUpRecording(raw);
    await app.recs.put(opts.key, blob, 'mic');
    draw();
    opts.onChange?.();
    app.audio.play([{ type: 'rec', key: opts.key }]);
  }

  async function remove() {
    if (!confirm('Delete this recording?')) return;
    await app.recs.remove(opts.key);
    draw();
    opts.onChange?.();
  }

  draw();
  return row;
}

// ---------- studio tab ----------

export function renderStudio(app, state, refresh) {
  const s = app.settings;
  const r = makeResolver({ ...s, demoMode: false }, app.recs.has);
  const mode = s.mode;
  const vowels = state.includeOff ? VOWELS : enabledVowels(s);
  const out = h('div', { class: 'studio' });

  out.append(
    h(
      'div',
      { class: 'p-note' },
      h('p', {}, 'Record in a quiet room, say each item once, clearly, the way the teacher says it. Silence before and after is trimmed automatically, and the volume is evened out. Recordings stay on this device — use Backup to save a copy.'),
      micSupported()
        ? null
        : h('p', { class: 'warn' }, 'Microphone recording is not available here. It needs a secure page (https:// or localhost). You can still upload audio files, or record on a computer and import the backup.'),
      app.recs.volatile ? h('p', { class: 'warn' }, 'This browser is not allowing permanent storage (private mode?). Recordings will be lost when the page closes.') : null,
    ),
    h(
      'div',
      { class: 'p-row' },
      h('label', { class: 'check' }, checkbox(state.missingOnly, (v) => ((state.missingOnly = v), refresh())), ' Show only missing'),
      h('label', { class: 'check' }, checkbox(state.includeOff, (v) => ((state.includeOff = v), refresh())), ' Include content that is turned off'),
    ),
  );

  const sections = [];

  sections.push({
    title: 'Vowel names',
    needed: mode === 'explore' || mode === 'vowel-name',
    rows: vowels.map((v) => ({
      key: keys.vowelName(v.id),
      title: [heb(isolatedVowelText(v), 'row-glyph'), ' ', vowelName(s, v.id)],
      hint: `Say the name: "${vowelName(s, v.id)}"`,
    })),
  });

  sections.push({
    title: 'Vowel sounds',
    needed: mode === 'explore' || mode === 'vowel-sound',
    rows: vowels.map((v) => {
      const step = r.vowelSoundStep(v.id);
      const mates = VOWELS.filter((o) => o.id !== v.id && vowelGroup(s, o.id) === vowelGroup(s, v.id)).map((o) => vowelName(s, o.id));
      const hint = s.pronunciation.soundHints[v.id];
      return {
        key: keys.vowelSound(v.id),
        title: [heb(isolatedVowelText(v), 'row-glyph'), ' ', vowelName(s, v.id), ' (sound)'],
        hint: [hint ? `Expected: "${hint}". ` : '', mates.length ? `Same sound as: ${mates.join(', ')}. ` : '', 'Say just the vowel sound, not the name.'].join(''),
        borrowed: step?.borrowedFrom ? { key: step.key, label: vowelName(s, step.borrowedFrom) } : null,
      };
    }),
  });

  if (s.enabledLetters.length) {
    sections.push({
      title: 'Letter + vowel',
      needed: mode === 'combo' || mode === 'reading',
      rows: enabledCombos(s).map((c) => {
        const step = r.comboStep(c.letterId, c.vowelId);
        const [bl, bv] = step?.borrowedFrom?.split('+') || [];
        return {
          key: keys.combo(c.letterId, c.vowelId),
          title: [heb(c.text, 'row-glyph'), ' ', `${letterName(s, c.letterId)} + ${vowelName(s, c.vowelId)}`],
          hint: 'Read it as one syllable.',
          borrowed: step?.borrowedFrom ? { key: step.key, label: `${letterName(s, bl)} + ${vowelName(s, bv)}` } : null,
        };
      }),
    });
  }

  const items = state.includeOff ? allItems(s) : readingCandidates(s).filter((i) => i.kind !== 'combo');
  if (items.length) {
    sections.push({
      title: 'Reading items (whole item, one clip each)',
      needed: mode === 'reading',
      rows: items.map((it) => ({
        key: keys.item(it.id),
        title: [heb(it.text, 'row-glyph'), ' ', it.kind === 'word' ? `Real word — ${it.gloss}` : 'Practice sequence (not a word)'],
        hint: it.note || (it.kind === 'word' ? 'Read the whole word naturally.' : 'Read the syllables together as one sequence.'),
      })),
    });
  }

  sections.push({
    title: 'Instructions & encouragement (optional)',
    needed: false,
    optional: true,
    rows: PROMPTS.map((p) => ({ key: p.key, title: p.label, hint: `Suggested: ${p.script}${s.instructionVoice ? ' — if not recorded, the device voice says it.' : ''}` })),
  });

  for (const sec of sections) {
    const recorded = sec.rows.filter((row) => app.recs.has(row.key)).length;
    const covered = sec.rows.filter((row) => app.recs.has(row.key) || row.borrowed).length;
    const rows = state.missingOnly ? sec.rows.filter((row) => !app.recs.has(row.key) && !row.borrowed) : sec.rows;
    out.append(
      h(
        'section',
        { class: 'p-section' },
        h(
          'h3',
          {},
          sec.title,
          ' ',
          h('span', { class: `pill ${covered === sec.rows.length ? 'ok' : sec.needed ? 'missing' : 'muted'}` }, `${recorded} recorded${covered > recorded ? ` + ${covered - recorded} shared` : ''} / ${sec.rows.length}`),
          sec.needed ? h('span', { class: 'pill info' }, 'used by the current activity') : null,
        ),
        rows.length
          ? rows.map((row) => recordingRow(app, { ...row, required: sec.needed && !sec.optional, onChange: refresh }))
          : h('p', { class: 'muted' }, state.missingOnly ? 'Nothing missing here.' : 'Nothing selected.'),
      ),
    );
  }
  return out;
}

export function checkbox(checked, onChange) {
  const el = h('input', { type: 'checkbox' });
  el.checked = !!checked;
  el.addEventListener('change', () => onChange(el.checked));
  return el;
}

export function missingSummary(app) {
  const s = app.settings;
  const r = makeResolver({ ...s, demoMode: false }, app.recs.has);
  const v = enabledVowels(s);
  return {
    names: v.filter((x) => !r.vowelNameStep(x.id)).length,
    sounds: v.filter((x) => !r.vowelSoundStep(x.id)).length,
    combos: s.enabledLetters.length ? enabledCombos(s).filter((c) => !r.comboStep(c.letterId, c.vowelId)).length : 0,
    items: readingCandidates(s).filter((i) => i.kind !== 'combo' && !r.itemStep(i)).length,
    vowelCount: v.length,
  };
}
