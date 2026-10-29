// Builds a round of questions from settings + available audio + practice history. Pure.
//
// A question:
//   { key, mode, targetId, prompt: steps[], reveal: steps[], choices: [{ id, text, isVowel, correct }],
//     tags: { vowels, letters } }
// A try-reading card (reading mode, 'try-read' activity):
//   { key, mode: 'reading', activity: 'try-read', targetId, text, hear: steps[], tags }
//
// If no valid question can be built, the round is { status: 'needs-setup', reasons } — the child
// screen then shows the "ask a grown-up" state instead of an unplayable question.
import { shuffle, weightedPick } from './rng.js';
import {
  enabledVowels,
  enabledCombos,
  readingCandidates,
  isolatedVowelText,
  vowelGroup,
  itemRequirements,
} from './catalog.js';

const compact = (steps) => steps.filter(Boolean);

export function progressKey(mode, targetId) {
  return `${mode}|${targetId}`;
}

// Weighted toward items that were missed or need help, but never only those.
function weightFor(progress, key) {
  const rec = progress?.items?.[key];
  if (!rec) return 2;
  if (rec.lastResult === 'first') return 1;
  return 3.5;
}

export function selectTargets(pool, n, mode, progress, rng, baseWeight = () => 1) {
  const picked = [];
  let available = [...pool];
  while (picked.length < n && pool.length) {
    if (!available.length) available = [...pool];
    const prev = picked[picked.length - 1];
    const choices = available.length > 1 && prev ? available.filter((t) => t.id !== prev.id) : available;
    const t = weightedPick(choices, (c) => weightFor(progress, progressKey(mode, c.id)) * baseWeight(c), rng);
    picked.push(t);
    available = available.filter((x) => x !== t);
  }
  // Mix in at least one familiar success when there is one to mix in.
  if (picked.length >= 3) {
    const isFamiliar = (t) => progress?.items?.[progressKey(mode, t.id)]?.lastResult === 'first';
    if (!picked.some(isFamiliar)) {
      const familiar = pool.filter((t) => isFamiliar(t) && !picked.includes(t));
      if (familiar.length) picked[picked.length - 1] = familiar[Math.floor(rng() * familiar.length)];
    }
  }
  return picked;
}

function takeDistinct(cands, n, keyOf, usedKeys) {
  const out = [];
  for (const c of cands) {
    if (out.length >= n) break;
    const k = keyOf(c);
    if (usedKeys.has(k)) continue;
    usedKeys.add(k);
    out.push(c);
  }
  return out;
}

// ---------- vowel modes ----------

function vowelChoice(v, correct) {
  return { id: v.id, text: isolatedVowelText(v), isVowel: true, correct };
}

function buildVowelName(settings, resolver, targets, rng) {
  const all = enabledVowels(settings);
  return targets.map((v) => {
    const nameStep = resolver.vowelNameStep(v.id);
    const others = shuffle(all.filter((o) => o.id !== v.id), rng).slice(0, settings.choices - 1);
    return {
      key: progressKey('vowel-name', v.id),
      mode: 'vowel-name',
      targetId: v.id,
      prompt: compact([resolver.promptStep('instr:find-name'), nameStep]),
      reveal: compact([nameStep]),
      choices: shuffle([vowelChoice(v, true), ...others.map((o) => vowelChoice(o, false))], rng),
      tags: { vowels: [v.id], letters: [] },
    };
  });
}

// Sound-only: every symbol in the target's sound group is correct. Distractors come from other
// groups, one per group. If there are no other groups, all same-group symbols are shown and all
// are accepted (tapping practice) — unselected vowels are never pulled in as distractors.
export function buildVowelSoundQuestion(settings, resolver, v, rng) {
  const all = enabledVowels(settings);
  const g = vowelGroup(settings, v.id);
  const soundStep = resolver.vowelSoundStep(v.id);
  const used = new Set([g]);
  const distractors = takeDistinct(shuffle(all.filter((o) => vowelGroup(settings, o.id) !== g), rng), settings.choices - 1, (o) => vowelGroup(settings, o.id), used);
  let choices = [vowelChoice(v, true), ...distractors.map((o) => vowelChoice(o, false))];
  if (choices.length === 1) {
    const sameSound = all.filter((o) => o.id !== v.id && vowelGroup(settings, o.id) === g).slice(0, settings.choices - 1);
    choices = choices.concat(sameSound.map((o) => vowelChoice(o, true)));
  }
  return {
    key: progressKey('vowel-sound', v.id),
    mode: 'vowel-sound',
    targetId: v.id,
    prompt: compact([resolver.promptStep('instr:find-sound'), soundStep]),
    reveal: compact([soundStep]),
    choices: shuffle(choices, rng),
    tags: { vowels: [v.id], letters: [] },
  };
}

// ---------- letters + vowels, reading ----------

function textChoice(c, correct) {
  return { id: c.id, text: c.text, isVowel: false, correct };
}

function comboDistractors(settings, target, all, rng) {
  const ok = all.filter((c) => c.soundKey !== target.soundKey && c.text !== target.text);
  let preferred = [];
  if (settings.comboFocus === 'same-letter') preferred = ok.filter((c) => c.letterId === target.letterId);
  else if (settings.comboFocus === 'same-vowel') preferred = ok.filter((c) => c.vowelId === target.vowelId);
  const rest = ok.filter((c) => !preferred.includes(c));
  const ordered = [...shuffle(preferred, rng), ...shuffle(rest, rng)];
  return takeDistinct(ordered, settings.choices - 1, (c) => c.soundKey, new Set([target.soundKey]));
}

function buildCombo(settings, resolver, targets, rng) {
  const all = enabledCombos(settings);
  return targets.map((c) => {
    const step = resolver.comboStep(c.letterId, c.vowelId);
    const distractors = comboDistractors(settings, c, all, rng);
    return {
      key: progressKey('combo', c.id),
      mode: 'combo',
      targetId: c.id,
      prompt: compact([resolver.promptStep('instr:find-combo'), step]),
      reveal: compact([step]),
      choices: shuffle([textChoice(c, true), ...distractors.map((d) => textChoice(d, false))], rng),
      tags: { vowels: [c.vowelId], letters: [c.letterId] },
    };
  });
}

function readingDistractors(settings, target, all, rng) {
  const ok = all.filter((c) => c.soundKey !== target.soundKey && c.text !== target.text);
  const byCloseness = shuffle(ok, rng).sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length));
  return takeDistinct(byCloseness, settings.choices - 1, (c) => c.soundKey, new Set([target.soundKey]));
}

function buildReading(settings, resolver, targets, rng) {
  const all = readingCandidates(settings);
  return targets.map((it) => {
    const step = resolver.itemStep(it);
    const req = itemRequirements(it);
    const tags = { vowels: req.vowels, letters: req.letters };
    if (settings.readingActivity === 'try-read') {
      return {
        key: progressKey('reading-try', it.id),
        mode: 'reading',
        activity: 'try-read',
        targetId: it.id,
        text: it.text,
        kind: it.kind,
        prompt: compact([resolver.promptStep('instr:try-read')]),
        hear: compact([step]),
        tags,
      };
    }
    const distractors = readingDistractors(settings, it, all, rng);
    return {
      key: progressKey('reading', it.id),
      mode: 'reading',
      targetId: it.id,
      kind: it.kind,
      prompt: compact([resolver.promptStep('instr:find-item'), step]),
      reveal: compact([step]),
      choices: shuffle([textChoice(it, true), ...distractors.map((d) => textChoice(d, false))], rng),
      tags,
    };
  });
}

// ---------- entry point ----------

export function buildRound({ settings, resolver, progress, rng }) {
  const mode = settings.mode;
  const n = settings.roundLength;
  const reasons = [];
  const vowels = enabledVowels(settings);
  if (!vowels.length) return { status: 'needs-setup', reasons: ['no-vowels'] };

  if (mode === 'vowel-name') {
    const pool = vowels.filter((v) => resolver.vowelNameStep(v.id));
    if (!pool.length) return { status: 'needs-setup', reasons: ['missing-audio'] };
    return { status: 'ok', questions: buildVowelName(settings, resolver, selectTargets(pool, n, mode, progress, rng), rng) };
  }

  if (mode === 'vowel-sound') {
    if (!settings.pronunciation.confirmed) return { status: 'needs-setup', reasons: ['pronunciation-unconfirmed'] };
    const pool = vowels.filter((v) => resolver.vowelSoundStep(v.id));
    if (!pool.length) return { status: 'needs-setup', reasons: ['missing-audio'] };
    const targets = selectTargets(pool, n, mode, progress, rng);
    return { status: 'ok', questions: targets.map((v) => buildVowelSoundQuestion(settings, resolver, v, rng)) };
  }

  if (!settings.pronunciation.confirmed) reasons.push('pronunciation-unconfirmed');

  if (mode === 'combo') {
    if (!settings.enabledLetters.length) return { status: 'needs-setup', reasons: ['no-letters'] };
    if (reasons.length) return { status: 'needs-setup', reasons };
    const all = enabledCombos(settings);
    if (!all.length) return { status: 'needs-setup', reasons: ['no-combos'] };
    const pool = all.filter((c) => resolver.comboStep(c.letterId, c.vowelId));
    if (!pool.length) return { status: 'needs-setup', reasons: ['missing-audio'] };
    return { status: 'ok', questions: buildCombo(settings, resolver, selectTargets(pool, n, mode, progress, rng), rng) };
  }

  if (mode === 'reading') {
    if (!settings.enabledLetters.length) return { status: 'needs-setup', reasons: ['no-letters'] };
    if (reasons.length) return { status: 'needs-setup', reasons };
    const all = readingCandidates(settings);
    if (!all.length) return { status: 'needs-setup', reasons: ['no-items'] };
    const pool = all.filter((it) => resolver.itemStep(it));
    if (!pool.length) return { status: 'needs-setup', reasons: ['missing-audio'] };
    const progressMode = settings.readingActivity === 'try-read' ? 'reading-try' : 'reading';
    // Easier items come up more often.
    const easier = (it) => 1 / (it.difficulty || 1);
    return { status: 'ok', questions: buildReading(settings, resolver, selectTargets(pool, n, progressMode, progress, rng, easier), rng) };
  }

  return { status: 'needs-setup', reasons: ['explore-mode'] };
}
