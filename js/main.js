// App wiring: loads stored data, creates the audio engine, and switches screens.
import { makeLocalStore } from './storage/local.js';
import { openRecordingStore } from './storage/recordings.js';
import { AudioController } from './core/audio.js';
import { makeResolver } from './core/audioKeys.js';
import { normalizeSettings } from './core/settings.js';
import { createPlayer, createSpeaker, createSfx } from './ui/platform.js';
import { renderHome } from './ui/child.js';
import { renderParent } from './ui/parent.js';

// Fallback if IndexedDB is unavailable (e.g. some private-browsing modes): recordings work
// for this visit only, and the parent area says so.
function memoryRecordingStore() {
  const map = new Map();
  const listeners = new Set();
  const changed = () => listeners.forEach((fn) => fn());
  return {
    volatile: true,
    has: (k) => map.has(k),
    info: (k) => (map.has(k) ? { type: map.get(k).type, source: map.get(k).source, updatedAt: map.get(k).updatedAt, size: map.get(k).blob.size } : null),
    keys: () => [...map.keys()],
    onChange: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    get: async (k) => map.get(k),
    put: async (key, blob, source = 'mic') => (map.set(key, { key, blob, type: blob.type, source, updatedAt: Date.now() }), changed()),
    remove: async (k) => (map.delete(k), changed()),
    clear: async () => (map.clear(), changed()),
    getAll: async () => [...map.values()],
    url: async (k) => (map.has(k) ? URL.createObjectURL(map.get(k).blob) : null),
  };
}

async function init() {
  const root = document.getElementById('app');
  const store = makeLocalStore();
  let recs;
  try {
    recs = await openRecordingStore();
  } catch (err) {
    console.warn('IndexedDB unavailable, using temporary storage', err);
    recs = memoryRecordingStore();
  }
  const player = createPlayer();
  const speaker = createSpeaker();
  const sfx = createSfx();
  const audio = new AudioController({ player, speaker, getUrl: (k) => recs.url(k) });
  audio.onChange((on) => sfx.duck(on));

  const app = {
    root,
    store,
    recs,
    audio,
    sfx,
    speaker,
    settings: store.loadSettings(),
    progress: store.loadProgress(),
    cleanup: [],
    audioUnlocked: false,

    resolver() {
      return makeResolver(app.settings, recs.has);
    },
    // Replace the current screen. Always silences the previous screen's audio first.
    mount(el) {
      audio.stop();
      app.cleanup.splice(0).forEach((fn) => fn());
      root.replaceChildren(el);
      window.scrollTo(0, 0);
    },
    unlockAudio() {
      player.unlock();
      speaker.unlock();
      sfx.unlock();
      app.audioUnlocked = true;
      sfx.setMusic(app.settings.music);
    },
    setSettings(next) {
      app.settings = normalizeSettings(next);
      store.saveSettings(app.settings);
      applyLook();
      if (app.audioUnlocked) sfx.setMusic(app.settings.music);
    },
    saveProgress() {
      store.saveProgress(app.progress);
    },
    goHome() {
      renderHome(app);
    },
    openParent(tab) {
      sfx.setMusic(false);
      renderParent(app, tab);
    },
    closeParent() {
      if (app.audioUnlocked) sfx.setMusic(app.settings.music);
      renderHome(app);
    },
  };

  function applyLook() {
    document.body.dataset.font = app.settings.font;
  }
  applyLook();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.stop();
      sfx.setMusic(false);
    } else if (app.audioUnlocked && !root.querySelector('.parent')) {
      sfx.setMusic(app.settings.music);
    }
  });

  window.nekudosApp = app; // handy for debugging and the in-browser tests
  renderHome(app);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
