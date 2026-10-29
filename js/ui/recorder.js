// Microphone recording for the parent studio, plus a clean-up pass that trims the silence before
// and after the speech and evens out the volume, so prompts start promptly when tapped.

export const MAX_RECORD_MS = 8000;

export function micSupported() {
  return !!(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);
}

function pickMime() {
  for (const t of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

// Starts recording. Returns { stop(): Promise<Blob>, cancel() }.
export async function startRecording({ onAutoStop } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }));
    };
  });
  rec.start();
  const timer = setTimeout(() => {
    if (rec.state === 'recording') {
      rec.stop();
      onAutoStop?.();
    }
  }, MAX_RECORD_MS);
  return {
    async stop() {
      clearTimeout(timer);
      if (rec.state === 'recording') rec.stop();
      return stopped;
    },
    cancel() {
      clearTimeout(timer);
      if (rec.state === 'recording') rec.stop();
    },
  };
}

// Trim + normalize. Falls back to the original blob if the browser cannot decode it.
export async function cleanUpRecording(blob) {
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    const ctx = new AC();
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    ctx.close?.();
    const data = buf.getChannelData(0);
    const rate = buf.sampleRate;
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    if (peak < 0.01) return blob; // essentially silent — keep as is so the parent can hear the problem
    const threshold = Math.max(0.02, peak * 0.08);
    const win = Math.floor(rate * 0.01);
    const loud = (i) => {
      let s = 0;
      for (let j = i; j < Math.min(i + win, data.length); j++) s = Math.max(s, Math.abs(data[j]));
      return s > threshold;
    };
    let start = 0;
    while (start < data.length && !loud(start)) start += win;
    let end = data.length - win;
    while (end > start && !loud(end)) end -= win;
    start = Math.max(0, start - Math.floor(rate * 0.08));
    end = Math.min(data.length, end + win + Math.floor(rate * 0.15));
    const gain = Math.min(4, 0.9 / peak);
    return encodeWav(data.subarray(start, end), rate, gain);
  } catch (err) {
    console.warn('Could not clean up recording; keeping original', err);
    return blob;
  }
}

function encodeWav(samples, inRate, gain) {
  const outRate = Math.min(inRate, 24000);
  const ratio = inRate / outRate;
  const n = Math.floor(samples.length / ratio);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, outRate, true);
  v.setUint32(28, outRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    // Box-filter average while downsampling, to avoid harsh aliasing.
    const a = Math.floor(i * ratio);
    const b = Math.max(a + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += samples[j];
    const s = Math.max(-1, Math.min(1, (sum / (b - a)) * gain));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}
