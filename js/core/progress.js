// Practice history. Pure functions over a plain JSON object (persisted by storage/local.js).
import { PRIZES } from '../content/rewards.js';

export function emptyProgress() {
  return { version: 1, items: {}, stars: 0, rounds: 0, prizes: 0, prizeRounds: 0 };
}

export function normalizeProgress(raw) {
  const p = emptyProgress();
  if (!raw || typeof raw !== 'object') return p;
  return {
    ...p,
    items: raw.items && typeof raw.items === 'object' ? { ...raw.items } : {},
    stars: Number.isFinite(raw.stars) ? raw.stars : 0,
    rounds: Number.isFinite(raw.rounds) ? raw.rounds : 0,
    prizes: Number.isFinite(raw.prizes) ? Math.max(0, Math.min(PRIZES.length, raw.prizes)) : 0,
    prizeRounds: Number.isFinite(raw.prizeRounds) ? Math.max(0, raw.prizeRounds) : 0,
  };
}

export function recordResult(progress, result, now = Date.now()) {
  const prev = progress.items[result.key] || {
    mode: result.mode,
    targetId: result.targetId,
    tags: result.tags,
    seen: 0,
    first: 0,
    retry: 0,
    helped: 0,
    practice: 0,
    lastResult: null,
    lastSeen: 0,
  };
  const rec = { ...prev, tags: result.tags, seen: prev.seen + 1, lastResult: result.outcome, lastSeen: now };
  rec[result.outcome] = (prev[result.outcome] || 0) + 1;
  return { ...progress, items: { ...progress.items, [result.key]: rec }, stars: progress.stars + 1 };
}

// A finished round counts toward the next dress-up prize. Every round ends in a finish (there is
// no losing), so this is always reached. newPrize is the index of a prize just earned, or null.
export function finishRound(progress, roundsPerPrize = 1) {
  const next = { ...progress, rounds: progress.rounds + 1 };
  if (next.prizes >= PRIZES.length) return { progress: { ...next, prizeRounds: 0 }, newPrize: null };
  const prizeRounds = next.prizeRounds + 1;
  if (prizeRounds < roundsPerPrize) return { progress: { ...next, prizeRounds }, newPrize: null };
  return { progress: { ...next, prizes: next.prizes + 1, prizeRounds: 0 }, newPrize: next.prizes };
}

const blank = () => ({ seen: 0, first: 0, retry: 0, helped: 0, practice: 0 });
function add(acc, rec) {
  for (const k of ['seen', 'first', 'retry', 'helped', 'practice']) acc[k] += rec[k] || 0;
}

// Aggregates for the parent progress screen.
export function summarize(progress) {
  const byMode = {};
  const byVowel = {};
  const byVowelMode = {};
  for (const rec of Object.values(progress.items)) {
    const mode = rec.mode === 'reading' && rec.practice ? 'reading-try' : rec.mode;
    add((byMode[mode] ||= blank()), rec);
    for (const v of rec.tags?.vowels || []) {
      add((byVowel[v] ||= blank()), rec);
      add(((byVowelMode[v] ||= {})[mode] ||= blank()), rec);
    }
  }
  const needsPractice = Object.entries(progress.items)
    .filter(([, r]) => r.lastResult === 'helped' || r.lastResult === 'retry')
    .map(([key, r]) => ({ key, ...r }))
    .sort((a, b) => b.lastSeen - a.lastSeen);
  return { byMode, byVowel, byVowelMode, needsPractice };
}
