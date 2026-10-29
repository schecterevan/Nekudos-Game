// Run with: npm test   (Node 20+; no dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';

import { VOWELS } from '../js/content/vowels.js';
import { LETTERS } from '../js/content/letters.js';
import { ITEMS } from '../js/content/items.js';
import { PROMPTS } from '../js/content/prompts.js';
import { defaultSettings, normalizeSettings, applyPreset } from '../js/core/settings.js';
import { segmentText, enabledCombos, readingCandidates, itemBlockers, allItems } from '../js/core/catalog.js';
import { makeResolver, keys } from '../js/core/audioKeys.js';
import { buildRound, selectTargets, buildVowelSoundQuestion, progressKey } from '../js/core/questions.js';
import { Round } from '../js/core/round.js';
import { emptyProgress, recordResult, summarize, finishRound, normalizeProgress } from '../js/core/progress.js';
import { PRIZES } from '../js/content/rewards.js';
import { AudioController } from '../js/core/audio.js';
import { makeRng } from '../js/core/rng.js';
import { buildBackup, parseBackup } from '../js/storage/backup.js';
import { makeLocalStore } from '../js/storage/local.js';

// ---------- helpers ----------

function settingsWith(overrides = {}, preset = 'modern') {
  let s = defaultSettings();
  if (preset) s = applyPreset(s, preset);
  s.pronunciation.confirmed = true;
  return normalizeSettings({ ...s, ...overrides });
}

// Pretend every learning recording exists (instructions do not, and the device voice is off).
const everything = (key) => !key.startsWith('instr:') && !key.startsWith('praise:');

function round(settings, has = everything, seed = 1, progress = emptyProgress()) {
  const s = { ...settings, instructionVoice: false };
  return buildRound({ settings: s, resolver: makeResolver(s, has), progress, rng: makeRng(seed) });
}

const recSteps = (steps) => steps.filter((s) => s.type === 'rec');

// ---------- content integrity ----------

test('content IDs are unique', () => {
  for (const list of [VOWELS, LETTERS, ITEMS]) {
    const ids = list.map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length);
  }
  assert.equal(new Set(PROMPTS.map((p) => p.key)).size, PROMPTS.length);
});

test('every reading item spelling matches its explicit segment metadata', () => {
  const vowelIds = new Set(VOWELS.map((v) => v.id));
  const letterIds = new Set(LETTERS.map((l) => l.id));
  for (const item of ITEMS) {
    assert.ok(['sequence', 'word'].includes(item.kind), item.id);
    assert.equal(item.length, item.segments.length, `${item.id} length`);
    for (const seg of item.segments) {
      assert.ok(letterIds.has(seg.l), `${item.id}: unknown letter ${seg.l}`);
      assert.ok(seg.v === null || vowelIds.has(seg.v), `${item.id}: unknown vowel ${seg.v}`);
    }
    const built = item.segments.map(segmentText).join('');
    assert.equal(item.text.normalize('NFC'), built.normalize('NFC'), `${item.id} spelling`);
    if (item.kind === 'word') assert.ok(item.gloss, `${item.id} needs a gloss`);
  }
});

test('length is explicit metadata, not a code point count', () => {
  const shalom = ITEMS.find((i) => i.id === 'w-shalom');
  assert.equal(shalom.length, 3);
  assert.ok([...shalom.text].length > 3);
});

test('invalid combinations are excluded (finals, vav + cholam)', () => {
  const s = settingsWith({ enabledLetters: ['vav', 'final-mem', 'final-khaf', 'mem'], enabledVowels: ['cholam', 'kamatz', 'shva'] });
  const ids = enabledCombos(s).map((c) => c.id).sort();
  assert.deepEqual(ids, ['final-khaf+kamatz', 'final-khaf+shva', 'mem+cholam', 'mem+kamatz', 'mem+shva', 'vav+kamatz', 'vav+shva'].sort());
});

// ---------- only enabled content ----------

test('only enabled vowels appear in vowel modes', () => {
  const enabled = ['kamatz', 'chirik', 'cholam'];
  for (const mode of ['vowel-name', 'vowel-sound']) {
    for (let seed = 1; seed < 30; seed++) {
      const r = round(settingsWith({ mode, enabledVowels: enabled, choices: 4 }), everything, seed);
      assert.equal(r.status, 'ok');
      for (const q of r.questions) {
        assert.ok(enabled.includes(q.targetId));
        for (const c of q.choices) assert.ok(enabled.includes(c.id), `${mode}: ${c.id}`);
      }
    }
  }
});

test('only enabled letters and vowels appear in letter + vowel mode', () => {
  const s = settingsWith({ mode: 'combo', enabledLetters: ['bet', 'lamed'], enabledVowels: ['kamatz', 'chirik'], choices: 4 });
  for (let seed = 1; seed < 30; seed++) {
    for (const q of round(s, everything, seed).questions) {
      for (const c of q.choices) {
        const [l, v] = c.id.split('+');
        assert.ok(['bet', 'lamed'].includes(l) && ['kamatz', 'chirik'].includes(v), c.id);
      }
    }
  }
});

test('reading items need every letter and vowel enabled, and respect length, kind and hidden', () => {
  const base = { mode: 'reading', enabledLetters: ['mem', 'lamed', 'nun'], enabledVowels: ['kamatz'], maxItemLength: 3 };
  const ids = readingCandidates(settingsWith(base)).map((i) => i.id);
  assert.ok(ids.includes('seq-ma-la'));
  assert.ok(ids.includes('seq-ma-la-na'));
  assert.ok(!ids.includes('seq-sa-la'), 'samech not enabled');
  assert.ok(!ids.includes('seq-ma-na'), 'patach not enabled');
  assert.ok(!ids.includes('seq-ma-la-na-sa'), 'too long');

  const short = readingCandidates(settingsWith({ ...base, maxItemLength: 2 })).map((i) => i.id);
  assert.ok(!short.includes('seq-ma-la-na'));

  const noSeq = readingCandidates(settingsWith({ ...base, itemKinds: { sequence: false, word: true } }));
  assert.ok(noSeq.every((i) => i.kind !== 'sequence'));

  const hidden = readingCandidates(settingsWith({ ...base, hiddenItems: ['seq-ma-la'] })).map((i) => i.id);
  assert.ok(!hidden.includes('seq-ma-la'));

  for (let seed = 1; seed < 20; seed++) {
    const r = round(settingsWith(base), everything, seed);
    for (const q of r.questions) for (const c of q.choices) assert.ok(ids.includes(c.id), c.id);
  }
});

test('a word with a silent final letter needs that letter enabled', () => {
  const s = settingsWith({ enabledLetters: ['mem'], enabledVowels: ['kamatz'], maxItemLength: 5 });
  const mah = ITEMS.find((i) => i.id === 'w-mah');
  assert.deepEqual(itemBlockers(s, mah), [{ type: 'letters', ids: ['he'] }]);
});

// ---------- sound equivalence ----------

test('sound mode never marks a sound-equivalent symbol wrong (Modern preset)', () => {
  const s = settingsWith({ mode: 'vowel-sound', enabledVowels: ['kamatz', 'patach', 'chirik', 'tzere', 'segol'], choices: 4 });
  const group = s.pronunciation.vowelGroups;
  for (let seed = 1; seed < 200; seed++) {
    for (const q of round(s, everything, seed).questions) {
      for (const c of q.choices) {
        if (group[c.id] === group[q.targetId]) assert.ok(c.correct, `${c.id} vs ${q.targetId}`);
        else assert.ok(!c.correct);
      }
      // Preferred: only one symbol per sound group on screen.
      const groups = q.choices.map((c) => group[c.id]);
      assert.equal(new Set(groups).size, groups.length);
    }
  }
});

test('when all enabled vowels share one sound, all are accepted', () => {
  const s = settingsWith({ mode: 'vowel-sound', enabledVowels: ['kamatz', 'patach'], choices: 3 });
  const r = round(s);
  for (const q of r.questions) {
    assert.equal(q.choices.length, 2);
    assert.ok(q.choices.every((c) => c.correct));
  }
});

test('Ashkenazi preset treats kamatz and patach as different sounds', () => {
  const s = settingsWith({ mode: 'vowel-sound', enabledVowels: ['kamatz', 'patach'], choices: 3 }, 'ashkenazi');
  const q = buildVowelSoundQuestion(s, makeResolver(s, everything), VOWELS[0], makeRng(3));
  assert.equal(q.choices.length, 2);
  assert.equal(q.choices.filter((c) => c.correct).length, 1);
});

test('sound prompt does not include the vowel name', () => {
  const s = settingsWith({ mode: 'vowel-sound', enabledVowels: ['kamatz', 'chirik'], instructionVoice: true });
  const r = buildRound({ settings: s, resolver: makeResolver(s, (k) => true), progress: emptyProgress(), rng: makeRng(1) });
  for (const q of r.questions) {
    assert.ok(q.prompt.every((st) => !(st.key || '').startsWith('vname:')));
    assert.ok(q.prompt.some((st) => st.key === keys.vowelSound(q.targetId)));
  }
});

test('sound mode waits until the parent confirms the pronunciation groups', () => {
  const s = normalizeSettings({ ...defaultSettings(), mode: 'vowel-sound' });
  assert.deepEqual(round(s), { status: 'needs-setup', reasons: ['pronunciation-unconfirmed'] });
});

test('letter + vowel distractors never sound the same as the answer', () => {
  const s = settingsWith({ mode: 'combo', enabledLetters: ['bet', 'tet', 'tav', 'tav-dagesh'], enabledVowels: ['kamatz', 'patach', 'chirik'], choices: 4 });
  for (let seed = 1; seed < 100; seed++) {
    for (const q of round(s, everything, seed).questions) {
      const target = enabledCombos(s).find((c) => c.id === q.targetId);
      for (const c of q.choices.filter((x) => !x.correct)) {
        const other = enabledCombos(s).find((x) => x.id === c.id);
        assert.notEqual(other.soundKey, target.soundKey, `${c.id} sounds like ${q.targetId}`);
      }
    }
  }
});

// ---------- one-item selection ----------

test('a single enabled vowel gives tapping practice with no extra vowels', () => {
  for (const mode of ['vowel-name', 'vowel-sound']) {
    const r = round(settingsWith({ mode, enabledVowels: ['chirik'], choices: 4 }));
    assert.equal(r.status, 'ok');
    assert.equal(r.questions.length, 5);
    for (const q of r.questions) {
      assert.deepEqual(q.choices.map((c) => c.id), ['chirik']);
      assert.ok(q.choices[0].correct);
    }
  }
});

test('one letter with one vowel works', () => {
  const r = round(settingsWith({ mode: 'combo', enabledLetters: ['shin'], enabledVowels: ['kamatz'] }));
  assert.equal(r.status, 'ok');
  for (const q of r.questions) assert.deepEqual(q.choices.map((c) => c.id), ['shin+kamatz']);
});

test('combo focus: one letter with several vowels / several letters with one vowel', () => {
  const s = settingsWith({ mode: 'combo', enabledLetters: ['bet', 'mem', 'lamed'], enabledVowels: ['kamatz', 'chirik', 'cholam'], choices: 3 });
  for (const focus of ['same-letter', 'same-vowel']) {
    for (const q of round({ ...s, comboFocus: focus }, everything, 7).questions) {
      const [tl, tv] = q.targetId.split('+');
      for (const c of q.choices) {
        const [l, v] = c.id.split('+');
        assert.ok(focus === 'same-letter' ? l === tl : v === tv, `${focus}: ${c.id} with ${q.targetId}`);
      }
    }
  }
});

// ---------- missing recordings ----------

test('missing recordings never produce silent questions', () => {
  const has = (k) => k === keys.vowelName('kamatz');
  const r = round(settingsWith({ mode: 'vowel-name', enabledVowels: ['kamatz', 'patach', 'chirik'] }), has);
  assert.equal(r.status, 'ok');
  for (const q of r.questions) {
    assert.equal(q.targetId, 'kamatz');
    assert.deepEqual(recSteps(q.prompt).map((s) => s.key), ['vname:kamatz']);
    assert.equal(q.choices.length, 3, 'unrecorded vowels can still be distractors');
  }
  for (const mode of ['vowel-name', 'vowel-sound', 'combo', 'reading']) {
    const none = round(settingsWith({ mode, enabledVowels: ['kamatz'], enabledLetters: ['mem'] }), () => false);
    assert.equal(none.status, 'needs-setup', mode);
    assert.deepEqual(none.reasons, ['missing-audio']);
  }
});

test('every built question has learning audio for its target', () => {
  const has = (k) => Math.abs([...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 2 === 0; // ~half recorded
  for (const mode of ['vowel-name', 'vowel-sound', 'combo', 'reading']) {
    const s = settingsWith({ mode, enabledVowels: ['kamatz', 'patach', 'chirik', 'segol'], enabledLetters: ['bet', 'mem', 'lamed', 'nun', 'shin'], maxItemLength: 3, shareEquivalentRecordings: false });
    const r = round(s, has);
    if (r.status !== 'ok') continue;
    for (const q of r.questions) {
      const audio = recSteps(q.prompt).filter((st) => !st.key.startsWith('instr:'));
      assert.equal(audio.length, 1, `${mode} ${q.targetId}`);
      assert.ok(has(audio[0].key));
    }
  }
});

test('a recording can stand in for a sound-equivalent vowel only when allowed', () => {
  const has = (k) => k === keys.vowelSound('kamatz');
  const on = makeResolver(settingsWith({ shareEquivalentRecordings: true }), has);
  assert.deepEqual(on.vowelSoundStep('patach'), { type: 'rec', key: 'vsound:kamatz', borrowedFrom: 'kamatz' });
  const off = makeResolver(settingsWith({ shareEquivalentRecordings: false }), has);
  assert.equal(off.vowelSoundStep('patach'), null);
  const ashk = makeResolver(settingsWith({ shareEquivalentRecordings: true }, 'ashkenazi'), has);
  assert.equal(ashk.vowelSoundStep('patach'), null);
});

test('learning content never uses the device voice except in labelled demo mode', () => {
  const s = settingsWith({ instructionVoice: true });
  const r = makeResolver(s, () => false);
  assert.equal(r.vowelNameStep('kamatz'), null);
  assert.equal(r.vowelSoundStep('kamatz'), null);
  assert.equal(r.comboStep('bet', 'kamatz'), null);
  assert.equal(r.promptStep('instr:find-name').type, 'tts');
  const demo = makeResolver(settingsWith({ demoMode: true }), () => false);
  assert.equal(demo.vowelNameStep('kamatz').demo, true);
});

// ---------- round flow ----------

function oneQuestionRound(helpAfterMisses = 2) {
  const r = round(settingsWith({ mode: 'vowel-name', enabledVowels: ['kamatz', 'chirik', 'segol'], roundLength: 1 }));
  return new Round(r.questions, { helpAfterMisses });
}

test('round: first try, retry, and helped outcomes; helped question returns later', () => {
  let rd = oneQuestionRound();
  let q = rd.current;
  const right = q.choices.find((c) => c.correct).id;
  const wrong = q.choices.find((c) => !c.correct).id;
  assert.deepEqual(rd.answer(right), { correct: true, outcome: 'first' });

  rd = oneQuestionRound();
  rd.answer(wrong);
  assert.equal(rd.answer(right).outcome, 'retry');
  rd.next();
  assert.ok(rd.done);

  rd = oneQuestionRound(2);
  assert.equal(rd.answer(wrong).demonstrate, false);
  const demo = rd.answer(wrong);
  assert.equal(demo.demonstrate, true);
  assert.deepEqual(demo.correctIds, [right]);
  assert.equal(rd.total, 2, 're-queued for later');
  assert.equal(rd.answer(right).outcome, 'helped');
  rd.next();
  assert.equal(rd.current.requeued, true);
  rd.answer(wrong);
  rd.answer(wrong);
  assert.equal(rd.total, 2, 'only re-queued once');
});

// ---------- progress ----------

test('progress keeps first-try accuracy separate from help', () => {
  let p = emptyProgress();
  const base = { key: 'vowel-name|kamatz', mode: 'vowel-name', targetId: 'kamatz', tags: { vowels: ['kamatz'], letters: [] } };
  p = recordResult(p, { ...base, outcome: 'first' });
  p = recordResult(p, { ...base, outcome: 'helped' });
  p = recordResult(p, { ...base, outcome: 'retry' });
  const sum = summarize(p);
  assert.deepEqual(sum.byVowel.kamatz, { seen: 3, first: 1, retry: 1, helped: 1, practice: 0 });
  assert.equal(p.stars, 3);
});

test('missed items are chosen more often, familiar successes still mixed in', () => {
  const pool = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  let p = emptyProgress();
  p.items[progressKey('m', 'a')] = { lastResult: 'helped' };
  for (const id of ['b', 'c', 'd']) p.items[progressKey('m', id)] = { lastResult: 'first' };
  const counts = { a: 0, b: 0, c: 0, d: 0 };
  const rng = makeRng(42);
  for (let i = 0; i < 2000; i++) counts[selectTargets(pool, 1, 'm', p, rng)[0].id]++;
  assert.ok(counts.a > counts.b * 2, JSON.stringify(counts));

  p = emptyProgress();
  for (const id of ['a', 'b', 'c']) p.items[progressKey('m', id)] = { lastResult: 'helped' };
  p.items[progressKey('m', 'd')] = { lastResult: 'first' };
  for (let seed = 1; seed < 50; seed++) {
    const picked = selectTargets(pool, 3, 'm', p, makeRng(seed));
    assert.ok(picked.some((t) => t.id === 'd'));
  }
});

// ---------- audio ----------

function fakePlayer(log) {
  let active = 0;
  let current = null;
  return {
    get active() {
      return active;
    },
    play(url) {
      active += 1;
      log.push(`start ${url}`);
      assert.ok(active <= 1, 'two clips playing at once');
      return new Promise((resolve) => {
        const timer = setTimeout(() => end('end'), 20);
        const end = (why) => {
          clearTimeout(timer);
          if (current?.end !== end) return;
          active -= 1;
          current = null;
          log.push(`${why} ${url}`);
          resolve();
        };
        current = { end };
      });
    },
    stop() {
      current?.end('stop');
    },
  };
}

test('audio never overlaps and a new prompt cancels the old one', async () => {
  const log = [];
  const ac = new AudioController({ player: fakePlayer(log), speaker: { speak: async () => {}, cancel() {} }, getUrl: async (k) => k });
  const first = ac.play([{ type: 'rec', key: 'a1' }, { type: 'rec', key: 'a2' }, { type: 'rec', key: 'a3' }]);
  await new Promise((r) => setTimeout(r, 5));
  const second = ac.play([{ type: 'rec', key: 'b1' }]);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.ok(!log.includes('start a2'), log.join(', '));
  assert.deepEqual(log, ['start a1', 'stop a1', 'start b1', 'end b1']);
  assert.equal(ac.playing, false);
});

test('stop() silences a sequence between steps (e.g. leaving a question)', async () => {
  const log = [];
  const ac = new AudioController({ player: fakePlayer(log), speaker: { speak: async () => {}, cancel() {} }, getUrl: async (k) => k });
  const p = ac.play([{ type: 'rec', key: 'x' }, { type: 'pause', ms: 30 }, { type: 'rec', key: 'y' }]);
  await new Promise((r) => setTimeout(r, 35));
  ac.stop();
  assert.equal(await p, false);
  assert.ok(!log.includes('start y'));
});

// ---------- persistence ----------

test('settings and progress persist through local storage', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  const a = makeLocalStore(storage);
  const s = settingsWith({ enabledVowels: ['segol'], choices: 2, music: true });
  a.saveSettings(s);
  a.saveProgress(recordResult(emptyProgress(), { key: 'k', mode: 'vowel-name', targetId: 'segol', tags: { vowels: ['segol'] }, outcome: 'first' }));
  const b = makeLocalStore(storage);
  assert.deepEqual(b.loadSettings(), s);
  assert.equal(b.loadProgress().stars, 1);
});

test('corrupt or foreign settings fall back to safe values', () => {
  const s = normalizeSettings({ enabledVowels: ['kamatz', 'not-a-vowel'], choices: 99, mode: 'nope', roundLength: 'x' });
  assert.deepEqual(s.enabledVowels, ['kamatz']);
  assert.equal(s.choices, 4);
  assert.equal(s.mode, 'explore');
  assert.equal(s.roundLength, 5);
  const mem = new Map([['nekudos.settings', '{not json']]);
  const store = makeLocalStore({ getItem: (k) => mem.get(k) ?? null, setItem() {} });
  assert.deepEqual(store.loadSettings(), defaultSettings());
});

test('backup export/import round-trips settings, progress and recordings', async () => {
  const settings = settingsWith({ enabledVowels: ['tzere'], customItems: [{ id: 'c1', kind: 'word', text: 'x', segments: [{ l: 'mem', v: null }], length: 1, difficulty: 1 }] });
  const progress = recordResult(emptyProgress(), { key: 'k', mode: 'vowel-name', targetId: 'tzere', tags: { vowels: ['tzere'] }, outcome: 'helped' });
  const bytes = new Uint8Array(70000).map((_, i) => i % 251);
  const recordings = [{ key: 'vname:tzere', type: 'audio/webm', source: 'mic', updatedAt: 1, blob: new Blob([bytes], { type: 'audio/webm' }) }];
  const json = JSON.stringify(await buildBackup({ settings, progress, recordings }));
  const back = parseBackup(json);
  assert.deepEqual(back.settings, settings);
  assert.deepEqual(back.progress, progress);
  assert.equal(back.recordings[0].key, 'vname:tzere');
  assert.deepEqual(new Uint8Array(await back.recordings[0].blob.arrayBuffer()), bytes);
  assert.equal(allItems(back.settings).at(-1).custom, true);
  assert.throws(() => parseBackup('{"hello":1}'), /not a Nekudos backup/);
});

test('a round re-asks at most a couple of missed questions, so it stays short', () => {
  const r = round(settingsWith({ mode: 'vowel-name', enabledVowels: ['kamatz', 'chirik', 'segol'], roundLength: 5 }));
  const rd = new Round(r.questions, { helpAfterMisses: 1 });
  while (!rd.done) {
    const q = rd.current;
    rd.answer(q.choices.find((c) => !c.correct).id);
    rd.answer(q.choices.find((c) => c.correct).id);
    rd.next();
  }
  assert.equal(rd.total, 7);
  assert.equal(rd.results.filter((x) => x.review).length, 2);
});

test('dress-up: one prize per finished round, in order, unicorn then the finale', () => {
  assert.equal(PRIZES.length, 17);
  assert.equal(PRIZES.findIndex((p) => p.id === 'giraffe'), PRIZES.findIndex((p) => p.id === 'kitten') + 1);
  assert.deepEqual(PRIZES.slice(0, 3).map((p) => p.id), ['tiara', 'scepter', 'dress']);
  assert.equal(PRIZES[10].id, 'unicorn');
  assert.equal(PRIZES.at(-1).id, 'fireworks');
  let p = emptyProgress();
  const got = [];
  for (let i = 0; i < PRIZES.length + 2; i++) {
    const r = finishRound(p);
    p = r.progress;
    got.push(r.newPrize);
  }
  assert.deepEqual(got, [...PRIZES.keys(), null, null]);
  assert.equal(p.prizes, PRIZES.length);
  assert.equal(p.rounds, PRIZES.length + 2);
});

test('dress-up: rounds per prize setting, and stored prizes survive normalizing', () => {
  let p = emptyProgress();
  const got = [];
  for (let i = 0; i < 6; i++) {
    const r = finishRound(p, 3);
    p = r.progress;
    got.push(r.newPrize);
  }
  assert.deepEqual(got, [null, null, 0, null, null, 1]);
  assert.equal(normalizeProgress(JSON.parse(JSON.stringify(p))).prizes, 2);
  assert.equal(normalizeProgress({ prizes: 99 }).prizes, PRIZES.length);
  assert.equal(normalizeProgress({}).prizes, 0);
  assert.equal(normalizeSettings({ roundsPerPrize: 0 }).roundsPerPrize, 1);
  assert.equal(defaultSettings().dressUp, true);
});
