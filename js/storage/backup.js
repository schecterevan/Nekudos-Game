// Export / import of settings, progress, and recordings as a single JSON file.
import { normalizeSettings } from '../core/settings.js';
import { normalizeProgress } from '../core/progress.js';

export const BACKUP_FORMAT = 'nekudos-backup';

async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type });
}

export async function buildBackup({ settings, progress, recordings }) {
  const recs = [];
  for (const r of recordings) {
    recs.push({ key: r.key, type: r.type, source: r.source, updatedAt: r.updatedAt, data: await blobToBase64(r.blob) });
  }
  return { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), settings, progress, recordings: recs };
}

// Validates and decodes a backup. Throws with a parent-readable message if it is not one.
export function parseBackup(json) {
  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    throw new Error('This file is not a valid backup (could not read JSON).');
  }
  if (!data || data.format !== BACKUP_FORMAT) throw new Error('This file is not a Nekudos backup.');
  const recordings = (data.recordings || [])
    .filter((r) => r && typeof r.key === 'string' && typeof r.data === 'string')
    .map((r) => ({ key: r.key, blob: base64ToBlob(r.data, r.type || 'audio/webm'), source: 'import' }));
  return {
    settings: data.settings ? normalizeSettings(data.settings) : null,
    progress: data.progress ? normalizeProgress(data.progress) : null,
    recordings,
  };
}
