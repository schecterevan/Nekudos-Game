// Settings and progress live in localStorage (small JSON). Recordings live in IndexedDB (recordings.js).
import { normalizeSettings } from '../core/settings.js';
import { normalizeProgress } from '../core/progress.js';

const SETTINGS_KEY = 'nekudos.settings';
const PROGRESS_KEY = 'nekudos.progress';

export function makeLocalStore(storage = globalThis.localStorage) {
  const read = (k) => {
    try {
      const raw = storage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const write = (k, v) => {
    try {
      storage.setItem(k, JSON.stringify(v));
      return true;
    } catch (err) {
      console.warn('Could not save', k, err);
      return false;
    }
  };
  return {
    loadSettings: () => normalizeSettings(read(SETTINGS_KEY)),
    saveSettings: (s) => write(SETTINGS_KEY, s),
    loadProgress: () => normalizeProgress(read(PROGRESS_KEY)),
    saveProgress: (p) => write(PROGRESS_KEY, p),
  };
}
