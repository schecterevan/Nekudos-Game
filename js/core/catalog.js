// The catalog combines the static content with the parent's settings, and answers questions like
// "which vowels are enabled?", "do these two symbols sound the same?", "which reading items are allowed?".
// Pure: no DOM, no storage.
import { VOWELS, DOTTED_CIRCLE, MARKS } from '../content/vowels.js';
import { LETTERS, isValidCombo } from '../content/letters.js';
import { ITEMS } from '../content/items.js';

const vowelById = new Map(VOWELS.map((v) => [v.id, v]));
const letterById = new Map(LETTERS.map((l) => [l.id, l]));

export const getVowel = (id) => vowelById.get(id);
export const getLetter = (id) => letterById.get(id);

export function vowelName(settings, id) {
  return settings.vowelNames?.[id] || vowelById.get(id)?.name || id;
}
export function letterName(settings, id) {
  return settings.letterNames?.[id] || letterById.get(id)?.name || id;
}

// ---- Written forms ----

// The vowel by itself, on a dotted-circle carrier when it needs one.
export function isolatedVowelText(vowel) {
  if (vowel.standalone) return vowel.trailing;
  return DOTTED_CIRCLE + vowel.mark + vowel.trailing;
}

// A letter carrying a vowel. This builds the WRITTEN form only; it is never used to produce audio.
export function comboText(letter, vowel) {
  return letter.glyph + (vowel ? vowel.mark + vowel.trailing : '');
}

export function segmentText(seg) {
  const letter = letterById.get(seg.l);
  const vowel = seg.v ? vowelById.get(seg.v) : null;
  return letter.glyph + (seg.dagesh ? MARKS.dagesh : '') + (vowel ? vowel.mark + vowel.trailing : '');
}

// ---- Enabled content ----

export function enabledVowels(settings) {
  const on = new Set(settings.enabledVowels);
  return VOWELS.filter((v) => on.has(v.id));
}
export function enabledLetters(settings) {
  const on = new Set(settings.enabledLetters);
  return LETTERS.filter((l) => on.has(l.id));
}

// ---- Sound equivalence ----

export function vowelGroup(settings, vowelId) {
  return settings.pronunciation.vowelGroups[vowelId] || `vowel:${vowelId}`;
}
export function letterGroup(settings, letterId) {
  return settings.pronunciation.letterGroups[letterId] || `letter:${letterId}`;
}
export function vowelsSoundAlike(settings, a, b) {
  return vowelGroup(settings, a) === vowelGroup(settings, b);
}

// ---- Letter + vowel combinations ----

export const comboId = (letterId, vowelId) => `${letterId}+${vowelId}`;

export function enabledCombos(settings) {
  const out = [];
  for (const letter of enabledLetters(settings)) {
    for (const vowel of enabledVowels(settings)) {
      if (!isValidCombo(letter, vowel)) continue;
      out.push(makeCombo(settings, letter, vowel));
    }
  }
  return out;
}

function makeCombo(settings, letter, vowel) {
  return {
    id: comboId(letter.id, vowel.id),
    kind: 'combo',
    letterId: letter.id,
    vowelId: vowel.id,
    text: comboText(letter, vowel),
    segments: [{ l: letter.id, v: vowel.id }],
    length: 1,
    soundKey: `${letterGroup(settings, letter.id)}|${vowelGroup(settings, vowel.id)}`,
  };
}

// ---- Reading items ----

export function allItems(settings) {
  return [...ITEMS, ...(settings.customItems || []).map((i) => ({ ...i, custom: true }))];
}

export function itemRequirements(item) {
  const letters = new Set();
  const vowels = new Set();
  for (const s of item.segments) {
    letters.add(s.l);
    if (s.v) vowels.add(s.v);
  }
  return { letters: [...letters], vowels: [...vowels] };
}

// Why an item is not available (empty array = available).
export function itemBlockers(settings, item) {
  const reasons = [];
  const { letters, vowels } = itemRequirements(item);
  const onL = new Set(settings.enabledLetters);
  const onV = new Set(settings.enabledVowels);
  const missL = letters.filter((l) => !onL.has(l));
  const missV = vowels.filter((v) => !onV.has(v));
  if (missL.length) reasons.push({ type: 'letters', ids: missL });
  if (missV.length) reasons.push({ type: 'vowels', ids: missV });
  if (item.length > settings.maxItemLength) reasons.push({ type: 'length' });
  if (!settings.itemKinds[item.kind]) reasons.push({ type: 'kind' });
  if (settings.hiddenItems.includes(item.id)) reasons.push({ type: 'hidden' });
  return reasons;
}

// What an item sounds like, as far as telling apart distractors goes: two items with the same key
// would be indistinguishable by ear, so they are never offered as right vs. wrong.
export function itemSoundKey(settings, item) {
  if (item.soundKey) return item.soundKey;
  if (item.soundsLike) return `like:${item.soundsLike}`;
  return item.segments
    .map((s) => `${letterGroup(settings, s.l)}|${s.v ? vowelGroup(settings, s.v) : '-'}${s.dagesh ? '|dd' : ''}`)
    .join('/');
}

// Reading pool: single combinations (length 1) plus reviewed items, all filtered by settings.
export function readingCandidates(settings) {
  const combos = settings.maxItemLength >= 1 ? enabledCombos(settings) : [];
  const items = allItems(settings)
    .filter((i) => itemBlockers(settings, i).length === 0)
    .map((i) => ({ ...i, soundKey: itemSoundKey(settings, i) }));
  return [...combos, ...items];
}
