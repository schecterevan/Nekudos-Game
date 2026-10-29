// Which recording (if any) plays for each piece of content.
//
// An audio "step" is one of:
//   { type: 'rec', key, borrowedFrom? }   a parent recording from the recording store
//   { type: 'tts', text, demo? }          device speech: instructions only, or demo mode (labelled)
//   { type: 'pause', ms }
// A resolver returns null when nothing trustworthy can be played; the question generator then
// leaves that content out instead of producing a silent question.
import { VOWELS } from '../content/vowels.js';
import { LETTERS, isValidCombo } from '../content/letters.js';
import { PROMPTS } from '../content/prompts.js';
import { vowelGroup, letterGroup, vowelName, letterName, comboId } from './catalog.js';

export const keys = {
  vowelName: (id) => `vname:${id}`,
  vowelSound: (id) => `vsound:${id}`,
  combo: (letterId, vowelId) => `combo:${comboId(letterId, vowelId)}`,
  item: (id) => `item:${id}`,
};

const promptByKey = new Map(PROMPTS.map((p) => [p.key, p]));

// has(key) -> boolean: is there a stored recording for this key?
export function makeResolver(settings, has) {
  const share = settings.shareEquivalentRecordings;
  const demo = settings.demoMode;

  const rec = (key, borrowedFrom) => (borrowedFrom ? { type: 'rec', key, borrowedFrom } : { type: 'rec', key });
  const demoStep = (text) => (demo ? { type: 'tts', text, demo: true } : null);

  function vowelNameStep(id) {
    const k = keys.vowelName(id);
    return has(k) ? rec(k) : demoStep(vowelName(settings, id));
  }

  function vowelSoundStep(id) {
    const k = keys.vowelSound(id);
    if (has(k)) return rec(k);
    if (share) {
      const g = vowelGroup(settings, id);
      for (const v of VOWELS) {
        if (v.id !== id && vowelGroup(settings, v.id) === g && has(keys.vowelSound(v.id))) {
          return rec(keys.vowelSound(v.id), v.id);
        }
      }
    }
    return demoStep(settings.pronunciation.soundHints[id] || vowelName(settings, id));
  }

  function comboStep(letterId, vowelId) {
    const k = keys.combo(letterId, vowelId);
    if (has(k)) return rec(k);
    if (share) {
      const lg = letterGroup(settings, letterId);
      const vg = vowelGroup(settings, vowelId);
      for (const l of LETTERS) {
        if (letterGroup(settings, l.id) !== lg) continue;
        for (const v of VOWELS) {
          if (vowelGroup(settings, v.id) !== vg || (l.id === letterId && v.id === vowelId)) continue;
          if (!isValidCombo(l, v)) continue;
          const alt = keys.combo(l.id, v.id);
          if (has(alt)) return rec(alt, comboId(l.id, v.id));
        }
      }
    }
    return demoStep(`${letterName(settings, letterId)} with ${vowelName(settings, vowelId)}`);
  }

  function itemStep(item) {
    if (item.kind === 'combo') return comboStep(item.letterId, item.vowelId);
    const k = keys.item(item.id);
    return has(k) ? rec(k) : demoStep(item.gloss ? `demo word: ${item.gloss}` : 'demo practice item');
  }

  // Instructions may use the device voice (if allowed). Missing instruction = just skip it.
  function promptStep(key) {
    if (has(key)) return rec(key);
    const p = promptByKey.get(key);
    if (p && settings.instructionVoice) return { type: 'tts', text: p.tts };
    return null;
  }

  return { vowelNameStep, vowelSoundStep, comboStep, itemStep, promptStep };
}
