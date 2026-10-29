// Reusable spoken instructions and encouragement.
// The parent records these in their own voice (any language). `script` is a suggestion for what
// to say. `tts` is what the device voice says if the recording is missing AND the parent has
// allowed the device voice for instructions. Learning content (vowel names, sounds, syllables,
// words) never falls back to the device voice outside the clearly labelled demo mode.

export const PROMPTS = [
  { key: 'instr:welcome', label: 'Welcome', script: '"Let\'s play!"', tts: "Let's play!" },
  { key: 'instr:explore', label: 'Explore', script: '"Tap a card to hear it."', tts: 'Tap a card to hear it.' },
  { key: 'instr:find-name', label: 'Find by name (said before the vowel name)', script: '"Tap the…" (the vowel name is added after)', tts: 'Tap the' },
  { key: 'instr:find-sound', label: 'Find by sound (said before the sound)', script: '"Which one says…"', tts: 'Which one says' },
  { key: 'instr:find-combo', label: 'Find the letter + vowel (said before it)', script: '"Find…"', tts: 'Find' },
  { key: 'instr:find-item', label: 'Find the reading item (said before it)', script: '"Can you find…"', tts: 'Can you find' },
  { key: 'instr:try-read', label: 'Try reading', script: '"Try to read it. Then tap the speaker to hear it."', tts: 'Try to read it. Then tap the speaker.' },
  { key: 'instr:try-again', label: 'Gentle try again', script: '"Let\'s listen again."', tts: "Let's listen again." },
  { key: 'instr:look', label: 'Showing the answer', script: '"Look, it\'s this one!"', tts: "Look, it's this one!" },
  { key: 'instr:round-done', label: 'End of round', script: '"You did it! Great practicing!"', tts: 'You did it! Great practicing!' },
  { key: 'praise:1', label: 'Praise 1', script: '"Yes!"', tts: 'Yes!' },
  { key: 'praise:2', label: 'Praise 2', script: '"Great job!"', tts: 'Great job!' },
  { key: 'praise:3', label: 'Praise 3', script: '"You found it!"', tts: 'You found it!' },
];

export const PRAISE_KEYS = PROMPTS.filter((p) => p.key.startsWith('praise:')).map((p) => p.key);
