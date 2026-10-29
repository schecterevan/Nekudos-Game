// Plays a sequence of audio steps, one at a time. Starting a new sequence (or calling stop())
// cancels whatever was playing, so prompts never overlap and an old question's prompt can never
// play over a new one.
//
// The controller is platform-neutral. It is given:
//   player.play(url) -> Promise   resolves when the clip ends or is stopped
//   player.stop()
//   speaker.speak(text) -> Promise   (device speech; may be a no-op)
//   speaker.cancel()
//   getUrl(key) -> Promise<string | null>   object URL for a stored recording

export class AudioController {
  constructor({ player, speaker, getUrl }) {
    this.player = player;
    this.speaker = speaker;
    this.getUrl = getUrl;
    this.generation = 0;
    this.playing = false;
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setPlaying(v) {
    if (this.playing === v) return;
    this.playing = v;
    for (const fn of this.listeners) fn(v);
  }

  stop() {
    this.generation += 1;
    this.player.stop();
    this.speaker.cancel();
    this.setPlaying(false);
  }

  // Resolves true if the whole sequence played, false if it was cancelled.
  async play(steps) {
    this.stop();
    const gen = this.generation;
    const live = () => gen === this.generation;
    this.setPlaying(true);
    try {
      for (const step of steps) {
        if (!live()) return false;
        if (step.type === 'rec') {
          const url = await this.getUrl(step.key);
          if (!live()) return false;
          if (url) await this.player.play(url);
        } else if (step.type === 'tts') {
          await this.speaker.speak(step.text);
        } else if (step.type === 'pause') {
          await new Promise((r) => setTimeout(r, step.ms));
        }
      }
      return live();
    } catch (err) {
      console.warn('Audio step failed', err);
      return false;
    } finally {
      if (live()) this.setPlaying(false);
    }
  }
}
