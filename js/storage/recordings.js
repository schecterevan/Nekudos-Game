// Parent recordings, stored as Blobs in IndexedDB, keyed by audio key (e.g. "vname:kamatz").
// Record shape: { key, blob, type, source: 'mic' | 'upload' | 'import', updatedAt }

const STORE = 'recordings';

function openDb(indexedDB, name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => (result = r));
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const reqP = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export async function openRecordingStore(indexedDB = globalThis.indexedDB, name = 'nekudos') {
  const db = await openDb(indexedDB, name);
  // In-memory index of which keys exist, so "is this recorded?" is synchronous for the game.
  const meta = new Map();
  const all = await tx(db, 'readonly', (s) => reqP(s.getAll()));
  for (const r of all) meta.set(r.key, { type: r.type, source: r.source, updatedAt: r.updatedAt, size: r.blob?.size || 0 });

  const urls = new Map();
  const listeners = new Set();
  const changed = () => listeners.forEach((fn) => fn());
  const revoke = (key) => {
    const u = urls.get(key);
    if (u) URL.revokeObjectURL(u.url);
    urls.delete(key);
  };

  return {
    close: () => db.close(),
    has: (key) => meta.has(key),
    info: (key) => meta.get(key) || null,
    keys: () => [...meta.keys()],
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async get(key) {
      return tx(db, 'readonly', (s) => reqP(s.get(key)));
    },
    async put(key, blob, source = 'mic') {
      const rec = { key, blob, type: blob.type || 'audio/webm', source, updatedAt: Date.now() };
      await tx(db, 'readwrite', (s) => reqP(s.put(rec)));
      revoke(key);
      meta.set(key, { type: rec.type, source, updatedAt: rec.updatedAt, size: blob.size });
      changed();
    },
    async remove(key) {
      await tx(db, 'readwrite', (s) => reqP(s.delete(key)));
      revoke(key);
      meta.delete(key);
      changed();
    },
    async clear() {
      await tx(db, 'readwrite', (s) => reqP(s.clear()));
      for (const k of [...urls.keys()]) revoke(k);
      meta.clear();
      changed();
    },
    async getAll() {
      return tx(db, 'readonly', (s) => reqP(s.getAll()));
    },
    // Object URL for playback, cached until the recording changes.
    async url(key) {
      const m = meta.get(key);
      if (!m) return null;
      const cached = urls.get(key);
      if (cached && cached.updatedAt === m.updatedAt) return cached.url;
      const rec = await this.get(key);
      if (!rec) return null;
      const url = URL.createObjectURL(rec.blob);
      urls.set(key, { url, updatedAt: m.updatedAt });
      return url;
    },
  };
}
