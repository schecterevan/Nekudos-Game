// Parent area (English). Opened by press-and-hold from the child screens.
import { h, heb } from './dom.js';
import { VOWELS } from '../content/vowels.js';
import { LETTERS } from '../content/letters.js';
import { PRESETS } from '../content/presets.js';
import { applyPreset, defaultSettings, normalizeSettings } from '../core/settings.js';
import {
  isolatedVowelText,
  vowelName,
  letterName,
  vowelGroup,
  allItems,
  itemBlockers,
  itemRequirements,
  segmentText,
  getLetter,
  getVowel,
  enabledVowels,
} from '../core/catalog.js';
import { makeResolver, keys } from '../core/audioKeys.js';
import { emptyProgress, summarize } from '../core/progress.js';
import { PRIZES } from '../content/rewards.js';
import { princessScene } from './princess.js';
import { buildRound } from '../core/questions.js';
import { makeRng } from '../core/rng.js';
import { buildBackup, parseBackup } from '../storage/backup.js';
import { renderStudio, checkbox, missingSummary, recordingRow } from './studio.js';

const TABS = [
  ['setup', 'Setup'],
  ['content', 'Vowels & letters'],
  ['items', 'Reading items'],
  ['game', 'Activity'],
  ['studio', 'Recordings'],
  ['progress', 'Progress'],
  ['backup', 'Backup'],
];

const MODE_INFO = {
  explore: ['Explore', 'Big vowel cards. Tapping one plays its name, then its sound. Good for introducing new vowels.'],
  'vowel-name': ['Find the vowel by name', '"Tap the kamatz." Needs vowel-name recordings.'],
  'vowel-sound': ['Find the vowel by sound', 'Plays only the vowel sound (never the name). Symbols that share a sound are never marked wrong. Needs confirmed pronunciation.'],
  combo: ['Letters with vowels', 'Hear a letter + vowel, tap the matching written syllable. Needs letter + vowel recordings.'],
  reading: ['Reading', 'Single syllables, practice sequences, and real words up to the length you choose.'],
};

const studioState = { missingOnly: false, includeOff: false };

const SETUP_REASONS = {
  'no-vowels': 'turn on at least one vowel.',
  'no-letters': 'turn on at least one letter.',
  'no-combos': 'the selected letters cannot carry the selected vowels on their own.',
  'no-items': 'no reading items match the selected letters, vowels and length.',
  'missing-audio': 'record the content for this activity.',
  'pronunciation-unconfirmed': 'choose and confirm the pronunciation.',
};

export function renderParent(app, tab = 'setup') {
  let current = tab;
  const content = h('div', { class: 'p-content' });
  const nav = h('nav', { class: 'p-nav', 'aria-label': 'Parent sections' });

  const refresh = () => {
    const y = content.scrollTop;
    app.cleanup.splice(0).forEach((fn) => fn());
    content.replaceChildren(TAB_RENDER[current](app, refresh, go));
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.tab === current));
    content.scrollTop = y;
  };
  const go = (t) => {
    current = t;
    app.audio.stop();
    refresh();
    content.scrollTop = 0;
  };
  for (const [id, label] of TABS) nav.append(h('button', { 'data-tab': id, onclick: () => go(id) }, label));

  app.mount(
    h(
      'div',
      { class: 'parent', lang: 'en' },
      h('header', { class: 'p-header' }, h('h1', {}, 'Parent area'), h('button', { class: 'btn btn-primary', onclick: () => app.closeParent() }, 'Back to game')),
      nav,
      content,
    ),
  );
  refresh();
}

const set = (app, refresh, patch) => {
  app.setSettings({ ...app.settings, ...patch });
  refresh();
};

function radioGroup(name, options, value, onChange) {
  return h(
    'div',
    { class: 'radio-group', role: 'radiogroup' },
    options.map(([v, label, desc]) => {
      const input = h('input', { type: 'radio', name, value: String(v) });
      input.checked = String(value) === String(v);
      input.addEventListener('change', () => input.checked && onChange(v));
      return h('label', { class: `radio-card ${input.checked ? 'checked' : ''}` }, input, h('span', {}, h('strong', {}, label), desc ? h('small', {}, desc) : null));
    }),
  );
}

function textInput(value, onChange, attrs = {}) {
  const el = h('input', { type: 'text', value: value ?? '', ...attrs });
  el.addEventListener('change', () => onChange(el.value.trim()));
  return el;
}

function section(title, ...children) {
  return h('section', { class: 'p-section' }, h('h3', {}, title), ...children);
}

// ---------- Setup / guide ----------

function renderSetup(app, refresh, go) {
  const s = app.settings;
  const m = missingSummary(app);
  const p = s.pronunciation;
  const mode = s.mode;
  // Ready = the child's Play button would produce a real, playable activity right now.
  const r = makeResolver(s, app.recs.has);
  const ready =
    mode === 'explore'
      ? enabledVowels(s).some((v) => r.vowelNameStep(v.id) || r.vowelSoundStep(v.id))
      : buildRound({ settings: s, resolver: r, progress: app.progress, rng: makeRng(1) });
  const audioOk = mode === 'explore' ? ready : ready.status === 'ok';
  const notReadyWhy = mode !== 'explore' && !audioOk ? ` Not playable yet: ${ready.reasons.map((x) => SETUP_REASONS[x] || x).join(' ')}` : '';

  const step = (done, title, detail, tab) =>
    h('li', { class: done ? 'done' : '' }, h('span', { class: 'tick' }, done ? '✓' : '•'), h('div', {}, h('strong', {}, title), h('p', {}, detail)), tab ? h('button', { class: 'btn', onclick: () => go(tab) }, 'Open') : null);

  return h(
    'div',
    {},
    s.demoMode ? h('p', { class: 'warn' }, 'Demo mode is ON: missing learning audio is replaced by the device voice and a "DEMO AUDIO" banner. Turn it off (Activity tab) once you have recordings.') : null,
    section(
      'Getting started',
      h(
        'ol',
        { class: 'checklist' },
        step(!!p.presetId && p.confirmed, 'Match the teacher\'s pronunciation', p.presetId ? (p.confirmed ? `Using "${PRESETS[p.presetId]?.label}", confirmed.` : `"${PRESETS[p.presetId]?.label}" chosen — check the sound groups and confirm.`) : 'Choose a starting point and check which vowels sound the same for your teacher. Nothing is assumed until you do.', 'content'),
        step(s.enabledVowels.length > 0, 'Choose vowels (and letters)', `${s.enabledVowels.length} vowel(s) and ${s.enabledLetters.length} letter(s) selected.`, 'content'),
        step(!!audioOk, 'Record the audio', `Missing for selected content: ${m.names} vowel name(s), ${m.sounds} vowel sound(s)${s.enabledLetters.length ? `, ${m.combos} letter + vowel` : ''}${mode === 'reading' ? `, ${m.items} reading item(s)` : ''}.${audioOk ? ' The current activity is ready to play.' : notReadyWhy}`, 'studio'),
        step(true, 'Pick the activity', `Current: ${MODE_INFO[mode][0]}, ${s.roundLength} questions, ${s.choices} choices.`, 'game'),
        step(false, 'Back up', 'Recordings live only in this browser. Export a backup after recording.', 'backup'),
      ),
    ),
    section(
      'How the game works',
      h('p', {}, 'Your child taps the big Play button (this also allows the browser to play sound). The activity you picked here starts. Every question is spoken; the speaker button repeats it. A correct answer adds a star to her sky. A wrong answer gets a gentle "let\'s listen again" and the prompt repeats; after repeated misses the right answer is shown and the question comes back later in the round. There are no timers, lives or buzzers.'),
      h('p', {}, 'Only content you turn on is ever shown, and only items that have a recording are asked. If something needed is missing, the child sees a "grown-up needed" picture instead of a broken question.'),
      h('p', {}, 'Vowel names, sounds, syllables and words are always your recordings — the device voice is never used for them (except in clearly labelled demo mode). It may read the general instructions ("Tap the…") if you allow it and haven\'t recorded them.'),
      h('p', {}, 'To open this area again: press and hold the lock button in the corner for 2 seconds.'),
    ),
  );
}

// ---------- Vowels & letters ----------

function renderContent(app, refresh) {
  const s = app.settings;
  const p = s.pronunciation;
  const r = makeResolver({ ...s, demoMode: false }, app.recs.has);

  const presetSection = section(
    'Pronunciation (match the teacher)',
    h('p', {}, 'Pick the closest starting point, then check every row below. "Sound group" decides which symbols count as the same sound: in "find by sound" questions, symbols in the same group are never shown as right-vs-wrong, and recordings can be shared within a group (if allowed on the Activity tab).'),
    radioGroup(
      'preset',
      Object.entries(PRESETS).map(([id, pr]) => [id, pr.label, pr.description]),
      p.presetId,
      (id) => {
        if (p.presetId && !confirm('Replace the current sound groups with this starting point?')) return refresh();
        set(app, refresh, applyPreset(app.settings, id));
      },
    ),
    p.presetId
      ? h(
          'label',
          { class: `check confirm ${p.confirmed ? 'ok' : ''}` },
          checkbox(p.confirmed, (v) => set(app, refresh, { pronunciation: { ...app.settings.pronunciation, confirmed: v } })),
          ' I have checked the sound groups and sound hints below against how the teacher reads.',
        )
      : h('p', { class: 'warn' }, 'No pronunciation chosen yet. "Find by sound", letters, and reading activities stay locked until you choose and confirm.'),
  );

  const setVowelField = (id, field, value) => {
    const next = structuredClone(app.settings);
    if (field === 'name') next.vowelNames[id] = value || undefined;
    if (field === 'group') next.pronunciation.vowelGroups[id] = value || undefined;
    if (field === 'hint') next.pronunciation.soundHints[id] = value || undefined;
    if (field === 'group') next.pronunciation.confirmed = false;
    set(app, refresh, next);
  };
  const toggleIn = (list, id, on) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));

  const vowelRows = VOWELS.map((v) => {
    const on = s.enabledVowels.includes(v.id);
    const nameStep = r.vowelNameStep(v.id);
    const soundStep = r.vowelSoundStep(v.id);
    return h(
      'tr',
      { class: on ? '' : 'off' },
      h('td', {}, checkbox(on, (val) => set(app, refresh, { enabledVowels: toggleIn(app.settings.enabledVowels, v.id, val) }))),
      h('td', { class: 'glyph-cell' }, heb(isolatedVowelText(v), 'table-glyph')),
      h('td', {}, textInput(vowelName(s, v.id), (val) => setVowelField(v.id, 'name', val), { 'aria-label': 'Display name' }), h('div', { class: 'muted small' }, heb(v.hebrewName))),
      h('td', {}, textInput(p.vowelGroups[v.id] || '', (val) => setVowelField(v.id, 'group', val), { 'aria-label': 'Sound group', placeholder: '(own sound)', list: 'vowel-groups', class: 'short' })),
      h('td', {}, textInput(p.soundHints[v.id] || '', (val) => setVowelField(v.id, 'hint', val), { 'aria-label': 'Sound hint', placeholder: 'e.g. ah', class: 'short' })),
      h(
        'td',
        { class: 'nowrap' },
        h('button', { class: 'btn small', disabled: !nameStep, onclick: () => app.audio.play([nameStep]) }, '▶ name'),
        ' ',
        h('button', { class: 'btn small', disabled: !soundStep, onclick: () => app.audio.play([soundStep]) }, '▶ sound'),
      ),
    );
  });
  const groupLabels = [...new Set(VOWELS.map((v) => p.vowelGroups[v.id]).filter(Boolean))];

  const enabledCount = s.enabledVowels.length;
  const soundGroups = new Set(enabledVowels(s).map((v) => vowelGroup(s, v.id))).size;
  const vowelSection = section(
    'Vowels',
    h(
      'div',
      { class: 'p-row' },
      h('button', { class: 'btn', onclick: () => set(app, refresh, { enabledVowels: VOWELS.map((v) => v.id) }) }, 'Select all'),
      h('button', { class: 'btn', onclick: () => set(app, refresh, { enabledVowels: [] }) }, 'Select none'),
    ),
    enabledCount === 1
      ? h('p', { class: 'note' }, 'One vowel selected: the game introduces it (Explore) and gives tapping practice with a single card. Telling vowels apart needs at least two vowels — and for "find by sound", two different sound groups. Unselected vowels are never added as distractors.')
      : enabledCount > 1 && soundGroups === 1
        ? h('p', { class: 'note' }, 'All selected vowels share one sound, so "find by sound" will accept any of them (practice, not discrimination). Add a vowel with a different sound for discrimination practice.')
        : null,
    h('datalist', { id: 'vowel-groups' }, groupLabels.map((g) => h('option', { value: g }))),
    h(
      'div',
      { class: 'table-wrap' },
      h('table', { class: 'p-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'On'), h('th', {}, 'Symbol'), h('th', {}, 'Name'), h('th', {}, 'Sound group'), h('th', {}, 'Sound hint'), h('th', {}, 'Preview'))), h('tbody', {}, vowelRows)),
    ),
  );

  const setLetterField = (id, field, value) => {
    const next = structuredClone(app.settings);
    if (field === 'name') next.letterNames[id] = value || undefined;
    if (field === 'group') {
      next.pronunciation.letterGroups[id] = value || undefined;
      next.pronunciation.confirmed = false;
    }
    set(app, refresh, next);
  };
  const letterRows = LETTERS.map((l) =>
    h(
      'tr',
      { class: s.enabledLetters.includes(l.id) ? '' : 'off' },
      h('td', {}, checkbox(s.enabledLetters.includes(l.id), (val) => set(app, refresh, { enabledLetters: toggleIn(app.settings.enabledLetters, l.id, val) }))),
      h('td', { class: 'glyph-cell' }, heb(l.glyph, 'table-glyph')),
      h('td', {}, textInput(letterName(s, l.id), (val) => setLetterField(l.id, 'name', val), { 'aria-label': 'Letter name' }), l.final ? h('div', { class: 'muted small' }, 'final form — used inside words') : null),
      h('td', {}, textInput(p.letterGroups[l.id] || '', (val) => setLetterField(l.id, 'group', val), { 'aria-label': 'Sound group', placeholder: '(own sound)', class: 'short' })),
    ),
  );
  const letterSection = section(
    'Letters',
    h('p', {}, 'Each written variant is separate: bet with dagesh (בּ) and vet (ב), shin (שׁ) and sin (שׂ), tav with and without dagesh, and final forms. Letters with the same sound group (e.g. tet and tav in Modern pronunciation) are never offered as right-vs-wrong in listening questions.'),
    h(
      'div',
      { class: 'p-row' },
      h('button', { class: 'btn', onclick: () => set(app, refresh, { enabledLetters: LETTERS.map((l) => l.id) }) }, 'Select all'),
      h('button', { class: 'btn', onclick: () => set(app, refresh, { enabledLetters: [] }) }, 'Select none'),
    ),
    h('div', { class: 'table-wrap' }, h('table', { class: 'p-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'On'), h('th', {}, 'Letter'), h('th', {}, 'Name'), h('th', {}, 'Sound group'))), h('tbody', {}, letterRows))),
  );

  return h('div', {}, presetSection, vowelSection, letterSection);
}

// ---------- Reading items ----------

function describeBlockers(s, blockers) {
  return blockers
    .map((b) => {
      if (b.type === 'letters') return `turn on ${b.ids.map((id) => letterName(s, id)).join(', ')}`;
      if (b.type === 'vowels') return `turn on ${b.ids.map((id) => vowelName(s, id)).join(', ')}`;
      if (b.type === 'length') return 'longer than the max length';
      if (b.type === 'kind') return 'this kind is turned off';
      if (b.type === 'hidden') return 'hidden by you';
      return b.type;
    })
    .join('; ');
}

function renderItems(app, refresh) {
  const s = app.settings;
  const items = allItems(s);
  const rows = items.map((it) => {
    const blockers = itemBlockers(s, it);
    const req = itemRequirements(it);
    const hidden = s.hiddenItems.includes(it.id);
    return h(
      'tr',
      { class: blockers.length ? 'off' : '' },
      h('td', { class: 'glyph-cell' }, heb(it.text, 'table-glyph')),
      h(
        'td',
        {},
        h('span', { class: `pill ${it.kind === 'word' ? 'info' : 'muted'}` }, it.kind === 'word' ? 'Real word' : 'Practice sequence'),
        it.custom ? h('span', { class: 'pill muted' }, 'yours') : null,
        it.gloss ? h('div', {}, `“${it.gloss}”`) : null,
        it.note ? h('div', { class: 'muted small' }, it.note) : null,
      ),
      h('td', {}, String(it.length), h('div', { class: 'muted small' }, `level ${it.difficulty}`)),
      h('td', { class: 'small' }, req.letters.map((id) => heb(getLetter(id).glyph, 'req-glyph')), ' ', req.vowels.map((id) => heb(isolatedVowelText(getVowel(id)), 'req-glyph'))),
      h('td', { class: 'small' }, blockers.length ? h('span', { class: 'muted' }, describeBlockers(s, blockers)) : h('span', { class: 'pill ok' }, 'in use')),
      h('td', {}, recordingRow(app, { key: keys.item(it.id), title: '', required: !blockers.length && s.mode === 'reading', onChange: refresh })),
      h(
        'td',
        {},
        h('label', { class: 'check small' }, checkbox(hidden, (v) => set(app, refresh, { hiddenItems: v ? [...app.settings.hiddenItems, it.id] : app.settings.hiddenItems.filter((x) => x !== it.id) })), ' hide'),
        it.custom ? h('button', { class: 'btn btn-ghost small', onclick: () => confirm('Delete this item?') && set(app, refresh, { customItems: app.settings.customItems.filter((c) => c.id !== it.id) }) }, 'Delete') : null,
      ),
    );
  });

  return h(
    'div',
    {},
    section(
      'Reading item bank',
      h('p', {}, '"Practice sequences" are syllables to sound out — they are not words and are never called words. "Real words" have a meaning. Each item lists exactly which letters and vowels it needs; it is used only when all of them are turned on, it fits the max length (Activity tab), and it has a recording of the whole item. Length = number of letters read (a vowel letter like the vav in וֹ belongs to the vowel). Single letter + vowel syllables come from the Letters with vowels list automatically.'),
      h('p', { class: 'note' }, 'Please review spellings with the teacher before recording. Hide anything you do not want.'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'p-table items-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Item'), h('th', {}, 'Kind'), h('th', {}, 'Len'), h('th', {}, 'Needs'), h('th', {}, 'Status'), h('th', {}, 'Recording'), h('th', {}, ''))), h('tbody', {}, rows))),
    ),
    customItemForm(app, refresh),
  );
}

function customItemForm(app, refresh) {
  const segs = [];
  const preview = h('div', { class: 'custom-preview' });
  const segList = h('div', { class: 'seg-list' });
  const letterSel = h('select', { 'aria-label': 'Letter' }, LETTERS.map((l) => h('option', { value: l.id }, `${l.glyph}  ${letterName(app.settings, l.id)}`)));
  const vowelSel = h('select', { 'aria-label': 'Vowel' }, h('option', { value: '' }, '(no vowel / silent)'), VOWELS.map((v) => h('option', { value: v.id }, vowelName(app.settings, v.id))));
  const dageshBox = h('input', { type: 'checkbox' });
  const kindSel = h('select', { 'aria-label': 'Kind' }, h('option', { value: 'sequence' }, 'Practice sequence (not a word)'), h('option', { value: 'word' }, 'Real word'));
  const gloss = h('input', { type: 'text', placeholder: 'Meaning (for real words)' });
  const textOverride = h('input', { type: 'text', dir: 'rtl', lang: 'he', class: 'heb-input', placeholder: 'Exact spelling (optional — leave empty to use the built spelling)' });
  const diffSel = h('select', { 'aria-label': 'Difficulty' }, [1, 2, 3, 4, 5].map((d) => h('option', { value: d }, `Level ${d}`)));
  const msg = h('p', { class: 'muted small' });

  const builtText = () => segs.map(segmentText).join('');
  const draw = () => {
    segList.replaceChildren(...segs.map((sg, i) => h('span', { class: 'seg' }, heb(segmentText(sg)), h('button', { class: 'btn btn-ghost small', 'aria-label': 'Remove', onclick: () => (segs.splice(i, 1), draw()) }, '×'))));
    preview.replaceChildren(segs.length ? heb(textOverride.value.trim() || builtText(), 'table-glyph') : h('span', { class: 'muted' }, 'Add letters to build the item.'));
  };
  textOverride.addEventListener('input', draw);

  const add = () => {
    segs.push({ l: letterSel.value, v: vowelSel.value || null, ...(dageshBox.checked ? { dagesh: true } : {}) });
    dageshBox.checked = false;
    draw();
  };
  const save = () => {
    if (!segs.length) return (msg.textContent = 'Add at least one letter.');
    if (kindSel.value === 'word' && !gloss.value.trim()) return (msg.textContent = 'Please add the meaning of the real word.');
    const item = {
      id: `custom-${Date.now().toString(36)}`,
      kind: kindSel.value,
      text: textOverride.value.trim() || builtText(),
      segments: segs.map((x) => ({ ...x })),
      length: segs.length,
      difficulty: Number(diffSel.value),
      ...(gloss.value.trim() ? { gloss: gloss.value.trim() } : {}),
    };
    set(app, refresh, { customItems: [...app.settings.customItems, item] });
  };

  draw();
  return section(
    'Add your own item',
    h('p', {}, 'Build it letter by letter so the game knows exactly which letters and vowels it needs. The spelling shown is just the letters and marks you chose; if the real spelling differs (for example a dot the builder cannot express), type the exact spelling. After saving, record the whole item.'),
    h('div', { class: 'p-row wrap' }, letterSel, vowelSel, h('label', { class: 'check' }, dageshBox, ' extra dagesh'), h('button', { class: 'btn', onclick: add }, 'Add letter')),
    segList,
    preview,
    h('div', { class: 'p-row wrap' }, kindSel, gloss, diffSel),
    textOverride,
    h('div', { class: 'p-row' }, h('button', { class: 'btn btn-primary', onclick: save }, 'Save item')),
    msg,
  );
}

// ---------- Activity / game settings ----------

function renderGame(app, refresh) {
  const s = app.settings;
  const toggle = (key, label, desc) => h('label', { class: 'check block' }, checkbox(s[key], (v) => set(app, refresh, { [key]: v })), h('span', {}, h('strong', {}, ` ${label}`), desc ? h('small', {}, desc) : null));
  return h(
    'div',
    {},
    section('Activity', radioGroup('mode', Object.entries(MODE_INFO).map(([id, [label, desc]]) => [id, label, desc]), s.mode, (v) => set(app, refresh, { mode: v }))),
    s.mode === 'reading'
      ? section(
          'Reading activity',
          radioGroup(
            'reading',
            [
              ['hear-tap', 'Hear it, then tap the matching item', 'The game says an item; she taps the written one.'],
              ['try-read', 'Try reading, then tap to hear', 'She tries reading aloud on her own, then taps the speaker to check. The app does not judge her reading — it just plays the recording.'],
            ],
            s.readingActivity,
            (v) => set(app, refresh, { readingActivity: v }),
          ),
          h('div', { class: 'p-row wrap' }, h('strong', {}, 'Include: '), h('label', { class: 'check' }, checkbox(s.itemKinds.sequence, (v) => set(app, refresh, { itemKinds: { ...s.itemKinds, sequence: v } })), ' practice sequences'), h('label', { class: 'check' }, checkbox(s.itemKinds.word, (v) => set(app, refresh, { itemKinds: { ...s.itemKinds, word: v } })), ' real words')),
          h('label', { class: 'field' }, 'Max length (letters read): ', select([1, 2, 3, 4, 5, 6], s.maxItemLength, (v) => set(app, refresh, { maxItemLength: Number(v) }), (v) => (v === 1 ? '1 — single letter + vowel' : String(v)))),
        )
      : null,
    s.mode === 'combo'
      ? section(
          'Letter + vowel focus',
          radioGroup(
            'focus',
            [
              ['mix', 'Mixed', 'Any selected letters and vowels.'],
              ['same-letter', 'One letter, different vowels', 'Choices share the letter (בָּ בִּ בֻּ) — practice reading the vowels.'],
              ['same-vowel', 'Different letters, one vowel', 'Choices share the vowel (בָּ מָ לָ) — practice reading the letters.'],
            ],
            s.comboFocus,
            (v) => set(app, refresh, { comboFocus: v }),
          ),
        )
      : null,
    section(
      'Round',
      h('label', { class: 'field' }, 'Answer choices: ', select([2, 3, 4], s.choices, (v) => set(app, refresh, { choices: Number(v) }))),
      h('label', { class: 'field' }, 'Questions per round: ', select([3, 4, 5, 6, 8, 10, 12, 15], s.roundLength, (v) => set(app, refresh, { roundLength: Number(v) }))),
      h('label', { class: 'field' }, 'Show the answer after: ', select([1, 2, 3], s.helpAfterMisses, (v) => set(app, refresh, { helpAfterMisses: Number(v) }), (v) => `${v} miss${v > 1 ? 'es' : ''}`)),
      h('p', { class: 'muted small' }, 'Fewer choices are shown automatically when not enough different content is turned on.'),
    ),
    section(
      'Princess dress-up',
      toggle('dressUp', 'Dress-up prizes', `Finishing a round opens a present with the next princess thing — ${PRIZES.length} in all: she gets a unicorn to ride, then a rainbow, butterflies, a kitten, a giraffe and fireworks. Progress tab shows how far she is.`),
      s.dressUp
        ? h('label', { class: 'field' }, 'One present every: ', select([1, 2, 3, 4, 5], s.roundsPerPrize, (v) => set(app, refresh, { roundsPerPrize: Number(v) }), (v) => (v === 1 ? 'round' : `${v} rounds`)))
        : null,
    ),
    section(
      'Sound',
      toggle('rewardSounds', 'Reward sounds', 'A soft chime for a correct answer and at the end of a round.'),
      toggle('music', 'Background music', 'Quiet, and turned down whenever the game is speaking.'),
      toggle('instructionVoice', 'Device voice for unrecorded instructions', 'Only for general instructions such as "Tap the…" — never for vowel names, sounds, syllables or words.'),
      toggle('shareEquivalentRecordings', 'Share recordings between same-sound symbols', 'E.g. one recording of the sound can serve two vowels in the same sound group.'),
      toggle('demoMode', 'Demo mode (parent preview only)', 'Fills missing learning audio with the device voice and shows a DEMO banner. The device voice is often wrong for Hebrew vowels — do not use for real practice.'),
    ),
    section(
      'Hebrew lettering',
      radioGroup(
        'font',
        [
          ['serif', 'Classic print', 'Like most siddurim and school primers.'],
          ['sans', 'Simple', 'Plainer strokes.'],
        ],
        s.font,
        (v) => set(app, refresh, { font: v }),
      ),
      h('div', { class: 'font-preview' }, heb('בָּ מִ שֹׁ לֻ ◌ָ ◌ַ ◌ֶ ◌ֵ ◌ִ ◌ֹ ◌ֻ ◌ְ ◌ֲ וּ', 'table-glyph')),
    ),
  );
}

function select(values, current, onChange, label = (v) => String(v)) {
  const el = h('select', {}, values.map((v) => h('option', { value: v }, label(v))));
  el.value = String(current);
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

// ---------- Progress ----------

const MODE_LABEL = { ...Object.fromEntries(Object.entries(MODE_INFO).map(([k, v]) => [k, v[0]])), reading: 'Reading (hear & tap)', 'reading-try': 'Reading (try reading)' };

function pct(a, b) {
  return b ? `${Math.round((a / b) * 100)}%` : '—';
}

function renderProgress(app, refresh) {
  const sum = summarize(app.progress);
  const statRow = (label, st) =>
    h('tr', {}, h('td', {}, label), h('td', {}, String(st.seen)), h('td', {}, `${st.first} (${pct(st.first, st.seen - st.practice)})`), h('td', {}, String(st.retry)), h('td', {}, String(st.helped)), h('td', {}, String(st.practice)));
  const head = h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Practiced'), h('th', {}, 'Right first try'), h('th', {}, 'Right on a later try'), h('th', {}, 'After being shown'), h('th', {}, 'Try-reading')));
  const modes = Object.entries(sum.byMode);
  const vowels = VOWELS.filter((v) => sum.byVowel[v.id]);
  return h(
    'div',
    {},
    h('p', { class: 'note' }, 'This shows practice progress in this game — what she tapped and how often she needed help. It is not a reading assessment and does not prove mastery. "Try reading" cards are counted but not judged.'),
    section('Overview', h('p', {}, `${app.progress.stars} stars earned · ${app.progress.rounds} rounds finished.`)),
    section(
      'Princess dress-up',
      h(
        'div',
        { class: 'p-princess' },
        princessScene(app.progress.prizes, { cls: 'p-princess-pic' }),
        h(
          'div',
          {},
          h('p', {}, `${app.progress.prizes} of ${PRIZES.length} presents opened.${app.progress.prizes < PRIZES.length ? ` Next: ${PRIZES[app.progress.prizes].label.toLowerCase()}.` : ' All done!'}`),
          h('ol', { class: 'prize-list' }, PRIZES.map((p, i) => h('li', { class: i < app.progress.prizes ? 'got' : '' }, p.label))),
          app.settings.dressUp ? null : h('p', { class: 'muted small' }, 'Dress-up prizes are turned off (Activity tab).'),
          h('button', {
            class: 'btn',
            onclick: () => {
              if (!confirm('Start the dress-up over from a plain smiley face? Practice progress is kept.')) return;
              app.progress = { ...app.progress, prizes: 0, prizeRounds: 0 };
              app.saveProgress();
              refresh();
            },
          }, 'Start dress-up over'),
        ),
      ),
    ),
    section('By activity', modes.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'p-table' }, head.cloneNode(true), h('tbody', {}, modes.map(([m, st]) => statRow(MODE_LABEL[m] || m, st))))) : h('p', { class: 'muted' }, 'No practice yet.')),
    section(
      'By vowel (all activities)',
      vowels.length
        ? h('div', { class: 'table-wrap' }, h('table', { class: 'p-table' }, head.cloneNode(true), h('tbody', {}, vowels.map((v) => statRow(h('span', {}, heb(isolatedVowelText(v), 'row-glyph'), ' ', vowelName(app.settings, v.id)), sum.byVowel[v.id])))))
        : h('p', { class: 'muted' }, 'No practice yet.'),
    ),
    section(
      'Practicing more (missed last time — the game brings these back more often)',
      sum.needsPractice.length
        ? h('ul', {}, sum.needsPractice.slice(0, 30).map((r) => h('li', {}, `${MODE_LABEL[r.mode] || r.mode}: `, describeTarget(app, r), ` — last time: ${r.lastResult === 'helped' ? 'shown the answer' : 'right on a later try'}`)))
        : h('p', { class: 'muted' }, 'Nothing flagged.'),
    ),
    section(
      'Reset',
      h('button', {
        class: 'btn btn-danger',
        onclick: () => {
          if (!confirm('Erase all practice progress, stars and dress-up prizes? Settings and recordings are kept.')) return;
          app.progress = emptyProgress();
          app.saveProgress();
          refresh();
        },
      }, 'Reset progress'),
    ),
  );
}

function describeTarget(app, rec) {
  const id = rec.targetId;
  if (getVowel(id)) return h('span', {}, heb(isolatedVowelText(getVowel(id)), 'row-glyph'), ' ', vowelName(app.settings, id));
  if (id.includes('+')) {
    const [l, v] = id.split('+');
    if (getLetter(l) && getVowel(v)) return heb(getLetter(l).glyph + getVowel(v).mark + getVowel(v).trailing, 'row-glyph');
  }
  const item = allItems(app.settings).find((i) => i.id === id);
  return item ? heb(item.text, 'row-glyph') : id;
}

// ---------- Backup ----------

function renderBackup(app, refresh) {
  const status = h('p', { class: 'muted' });
  const storageInfo = h('p', { class: 'muted small' });
  navigator.storage?.estimate?.().then((e) => {
    storageInfo.textContent = `Using about ${(e.usage / 1024 / 1024).toFixed(1)} MB of browser storage.`;
  });
  const persistBtn = h('button', { class: 'btn' }, 'Ask the browser to keep this data');
  navigator.storage?.persisted?.().then((p) => {
    if (p) {
      persistBtn.disabled = true;
      persistBtn.textContent = 'Browser has agreed to keep this data ✓';
    }
  });
  persistBtn.addEventListener('click', async () => {
    const ok = await navigator.storage?.persist?.();
    persistBtn.textContent = ok ? 'Browser has agreed to keep this data ✓' : 'Browser declined (export a backup instead)';
    persistBtn.disabled = !!ok;
  });

  const exportBtn = h('button', { class: 'btn btn-primary' }, 'Export backup file');
  exportBtn.addEventListener('click', async () => {
    status.textContent = 'Preparing…';
    const backup = await buildBackup({ settings: app.settings, progress: app.progress, recordings: await app.recs.getAll() });
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `nekudos-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    status.textContent = `Exported ${backup.recordings.length} recording(s), settings and progress.`;
  });

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json' });
  const what = { settings: true, progress: true, recordings: true };
  const importBtn = h('button', { class: 'btn' }, 'Import selected parts');
  importBtn.addEventListener('click', async () => {
    const f = fileInput.files?.[0];
    if (!f) return (status.textContent = 'Choose a backup file first.');
    try {
      const data = parseBackup(await f.text());
      if (!confirm('Importing replaces the selected parts (recordings with the same name are replaced; others are kept). Continue?')) return;
      if (what.settings && data.settings) app.setSettings(data.settings);
      if (what.progress && data.progress) {
        app.progress = data.progress;
        app.saveProgress();
      }
      let n = 0;
      if (what.recordings) for (const r of data.recordings) (await app.recs.put(r.key, r.blob, 'import'), n++);
      status.textContent = `Imported${what.settings ? ' settings,' : ''}${what.progress ? ' progress,' : ''} ${n} recording(s).`;
      refresh();
    } catch (err) {
      status.textContent = err.message;
    }
  });

  return h(
    'div',
    {},
    section(
      'Where your data lives',
      h('p', {}, 'Everything — settings, progress and recordings — is stored only in this browser on this device. Nothing is uploaded. Clearing browsing data, "offload unused apps", private browsing, or long periods of not opening the page (Safari may remove data from sites not visited for weeks) can erase it. Export a backup after recording, and keep the file somewhere safe.'),
      h('p', {}, 'To move to another device (e.g. record on a computer, play on the iPad): export here, then import there.'),
      storageInfo,
      persistBtn,
    ),
    section('Export', h('p', {}, 'Saves settings, progress, custom items and all recordings in one .json file.'), exportBtn),
    section(
      'Import',
      fileInput,
      h('div', { class: 'p-row wrap' }, ...Object.keys(what).map((k) => h('label', { class: 'check' }, checkbox(what[k], (v) => (what[k] = v)), ` ${k}`))),
      importBtn,
    ),
    status,
    section(
      'Reset settings',
      h('button', {
        class: 'btn btn-danger',
        onclick: () => {
          if (!confirm('Reset all settings (vowels, letters, pronunciation, activity) to defaults? Recordings and progress are kept.')) return;
          app.setSettings(normalizeSettings(defaultSettings()));
          refresh();
        },
      }, 'Reset settings to defaults'),
    ),
  );
}

const TAB_RENDER = {
  setup: renderSetup,
  content: renderContent,
  items: renderItems,
  game: renderGame,
  studio: (app, refresh) => renderStudio(app, studioState, refresh),
  progress: renderProgress,
  backup: renderBackup,
};

