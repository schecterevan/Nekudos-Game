// Parent settings: defaults, validation, and preset application. Pure functions.
import { VOWELS } from '../content/vowels.js';
import { LETTERS } from '../content/letters.js';
import { PRESETS } from '../content/presets.js';

export const SETTINGS_VERSION = 1;

export const MODES = ['explore', 'vowel-name', 'vowel-sound', 'combo', 'reading'];

export function defaultSettings() {
  return {
    version: SETTINGS_VERSION,
    // Pronunciation: nothing is assumed until the parent picks and confirms.
    pronunciation: {
      presetId: null,
      confirmed: false,
      vowelGroups: {}, // vowelId -> group label (missing = its own group)
      letterGroups: {}, // letterId -> group label
      soundHints: {}, // vowelId -> parent-facing hint text
    },
    vowelNames: {}, // vowelId -> custom display name
    letterNames: {}, // letterId -> custom display name
    enabledVowels: ['kamatz', 'patach'],
    enabledLetters: ['bet', 'mem', 'lamed'],
    mode: 'explore',
    readingActivity: 'hear-tap', // 'hear-tap' | 'try-read'
    comboFocus: 'mix', // 'mix' | 'same-letter' | 'same-vowel'
    choices: 3,
    roundLength: 5,
    maxItemLength: 1,
    itemKinds: { sequence: true, word: true },
    hiddenItems: [],
    customItems: [],
    helpAfterMisses: 2,
    music: false,
    rewardSounds: true,
    dressUp: true, // princess dress-up prizes for finished rounds
    roundsPerPrize: 1,
    instructionVoice: true, // device voice may speak *instructions* that are not recorded
    shareEquivalentRecordings: true, // a recording can stand in for a sound-equivalent symbol
    demoMode: false,
    font: 'serif',
  };
}

const clampInt = (v, lo, hi, d) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};

// Accepts anything (e.g. an imported file) and returns valid settings.
export function normalizeSettings(raw) {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const vowelIds = new Set(VOWELS.map((v) => v.id));
  const letterIds = new Set(LETTERS.map((l) => l.id));
  const s = { ...d, ...raw };
  s.version = SETTINGS_VERSION;
  s.pronunciation = { ...d.pronunciation, ...(raw.pronunciation || {}) };
  for (const k of ['vowelGroups', 'letterGroups', 'soundHints']) {
    s.pronunciation[k] = { ...(s.pronunciation[k] || {}) };
  }
  s.vowelNames = { ...(raw.vowelNames || {}) };
  s.letterNames = { ...(raw.letterNames || {}) };
  s.enabledVowels = Array.isArray(raw.enabledVowels) ? raw.enabledVowels.filter((id) => vowelIds.has(id)) : d.enabledVowels;
  s.enabledLetters = Array.isArray(raw.enabledLetters) ? raw.enabledLetters.filter((id) => letterIds.has(id)) : d.enabledLetters;
  if (!MODES.includes(s.mode)) s.mode = d.mode;
  if (!['hear-tap', 'try-read'].includes(s.readingActivity)) s.readingActivity = d.readingActivity;
  if (!['mix', 'same-letter', 'same-vowel'].includes(s.comboFocus)) s.comboFocus = d.comboFocus;
  s.choices = clampInt(s.choices, 2, 4, d.choices);
  s.roundLength = clampInt(s.roundLength, 1, 20, d.roundLength);
  s.maxItemLength = clampInt(s.maxItemLength, 1, 8, d.maxItemLength);
  s.roundsPerPrize = clampInt(s.roundsPerPrize, 1, 5, d.roundsPerPrize);
  s.helpAfterMisses = clampInt(s.helpAfterMisses, 1, 5, d.helpAfterMisses);
  s.itemKinds = { ...d.itemKinds, ...(raw.itemKinds || {}) };
  s.hiddenItems = Array.isArray(raw.hiddenItems) ? [...raw.hiddenItems] : [];
  s.customItems = Array.isArray(raw.customItems) ? raw.customItems.filter(isValidCustomItem) : [];
  for (const k of ['music', 'rewardSounds', 'dressUp', 'instructionVoice', 'shareEquivalentRecordings', 'demoMode']) {
    s[k] = typeof raw[k] === 'boolean' ? raw[k] : d[k];
  }
  if (!['serif', 'sans'].includes(s.font)) s.font = d.font;
  return s;
}

function isValidCustomItem(item) {
  return item && typeof item.id === 'string' && typeof item.text === 'string' && Array.isArray(item.segments) && item.segments.length > 0;
}

// Copies a preset's groups into settings. The parent still has to confirm.
export function applyPreset(settings, presetId) {
  const p = PRESETS[presetId];
  if (!p) throw new Error(`Unknown preset ${presetId}`);
  return {
    ...settings,
    pronunciation: {
      presetId,
      confirmed: false,
      vowelGroups: { ...p.vowelGroups },
      letterGroups: { ...p.letterGroups },
      soundHints: { ...p.soundHints },
    },
  };
}
