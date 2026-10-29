// Browser audio plumbing: one shared <audio> element (so iOS keeps it unlocked after the Play tap),
// optional device speech for instructions, and soft Web Audio reward sounds / background music.

// A tiny silent WAV, played inside the Play tap to unlock audio on iOS / Safari.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export function createPlayer() {
  const el = new Audio();
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  let finish = null;
  return {
    element: el,
    play(url) {
      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          el.removeEventListener('ended', done);
          el.removeEventListener('error', done);
          clearTimeout(timer);
          if (finish === done) finish = null;
          resolve();
        };
        finish = done;
        el.addEventListener('ended', done);
        el.addEventListener('error', done);
        const timer = setTimeout(done, 20000); // never hang a question on a broken clip
        el.src = url;
        el.play().catch(done);
      });
    },
    stop() {
      el.pause();
      finish?.();
    },
    unlock() {
      el.src = SILENT_WAV;
      return el.play().catch(() => {});
    },
  };
}

export function createSpeaker(getLang = () => 'en-US') {
  const synth = globalThis.speechSynthesis;
  let pending = null;
  return {
    available: !!synth,
    speak(text) {
      if (!synth || !text) return Promise.resolve();
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = getLang();
        u.rate = 0.9;
        const done = () => {
          clearTimeout(timer);
          if (pending === done) pending = null;
          resolve();
        };
        const timer = setTimeout(done, 1500 + text.length * 120);
        pending = done;
        u.onend = done;
        u.onerror = done;
        synth.speak(u);
      });
    },
    cancel() {
      if (!synth) return;
      synth.cancel();
      pending?.();
    },
    unlock() {
      if (synth) synth.speak(new SpeechSynthesisUtterance(''));
    },
  };
}

// Soft synthesized sounds: no assets, nothing loud, nothing that sounds like an error buzzer.
export function createSfx() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let musicTimer = null;
  let ducked = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    return ctx;
  }

  function note(freq, start, dur, gain, dest = master, type = 'sine') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(dest);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  return {
    unlock() {
      if (ensure()?.state === 'suspended') ctx.resume();
    },
    chime() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      note(783.99, t, 0.35, 0.18);
      note(1046.5, t + 0.09, 0.45, 0.16);
      note(1567.98, t + 0.18, 0.5, 0.08);
    },
    fanfare() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.12, 0.6, 0.14));
    },
    setMusic(on) {
      if (!ensure()) return;
      clearInterval(musicTimer);
      musicTimer = null;
      musicGain.gain.setTargetAtTime(on ? (ducked ? 0.02 : 0.07) : 0, ctx.currentTime, 0.3);
      if (!on) return;
      let step = 0;
      const tick = () => {
        const t = ctx.currentTime + 0.05;
        const f = PENTA[(step * 3 + (step % 4)) % PENTA.length] / 2;
        note(f, t, 1.4, 0.5, musicGain, 'triangle');
        if (step % 4 === 0) note(f / 2, t, 2.2, 0.35, musicGain);
        step += 1;
      };
      tick();
      musicTimer = setInterval(tick, 700);
    },
    // Lower the music while a prompt is speaking so it never competes with the learning audio.
    duck(on) {
      ducked = on;
      if (ctx && musicTimer) musicGain.gain.setTargetAtTime(on ? 0.02 : 0.07, ctx.currentTime, 0.15);
    },
  };
}
