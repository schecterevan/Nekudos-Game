// Letter variants. Each written form that can sound different gets its own entry,
// so dagesh (bet / vet), shin / sin, and final forms are explicit, never assumed.
//
//   id        stable content ID
//   glyph     exact written form (base letter + dagesh / shin dot where relevant)
//   name      English display name for parents
//   family    the base letter, used to group variants in the parent screen
//   final     true for end-of-word forms; they are only used inside reviewed reading items
//             (plus final khaf with kamatz / shva, which are valid on their own)
//
// Which letters share a sound is pronunciation data — see presets.js.

const D = 'ּ'; // dagesh
const SHIN_DOT = 'ׁ';
const SIN_DOT = 'ׂ';

export const LETTERS = [
  { id: 'alef', glyph: 'א', name: 'Alef', family: 'alef' },
  { id: 'bet', glyph: 'ב' + D, name: 'Bet (with dagesh)', family: 'bet' },
  { id: 'vet', glyph: 'ב', name: 'Vet', family: 'bet' },
  { id: 'gimel', glyph: 'ג', name: 'Gimel', family: 'gimel' },
  { id: 'gimel-dagesh', glyph: 'ג' + D, name: 'Gimel (with dagesh)', family: 'gimel' },
  { id: 'dalet', glyph: 'ד', name: 'Dalet', family: 'dalet' },
  { id: 'dalet-dagesh', glyph: 'ד' + D, name: 'Dalet (with dagesh)', family: 'dalet' },
  { id: 'he', glyph: 'ה', name: 'Hei', family: 'he' },
  { id: 'vav', glyph: 'ו', name: 'Vav', family: 'vav' },
  { id: 'zayin', glyph: 'ז', name: 'Zayin', family: 'zayin' },
  { id: 'chet', glyph: 'ח', name: 'Chet', family: 'chet' },
  { id: 'tet', glyph: 'ט', name: 'Tet', family: 'tet' },
  { id: 'yod', glyph: 'י', name: 'Yud', family: 'yod' },
  { id: 'kaf', glyph: 'כ' + D, name: 'Kaf (with dagesh)', family: 'kaf' },
  { id: 'khaf', glyph: 'כ', name: 'Chaf', family: 'kaf' },
  { id: 'final-khaf', glyph: 'ך', name: 'Final Chaf', family: 'kaf', final: true },
  { id: 'lamed', glyph: 'ל', name: 'Lamed', family: 'lamed' },
  { id: 'mem', glyph: 'מ', name: 'Mem', family: 'mem' },
  { id: 'final-mem', glyph: 'ם', name: 'Final Mem', family: 'mem', final: true },
  { id: 'nun', glyph: 'נ', name: 'Nun', family: 'nun' },
  { id: 'final-nun', glyph: 'ן', name: 'Final Nun', family: 'nun', final: true },
  { id: 'samech', glyph: 'ס', name: 'Samech', family: 'samech' },
  { id: 'ayin', glyph: 'ע', name: 'Ayin', family: 'ayin' },
  { id: 'pe', glyph: 'פ' + D, name: 'Pei (with dagesh)', family: 'pe' },
  { id: 'fe', glyph: 'פ', name: 'Fei', family: 'pe' },
  { id: 'final-fe', glyph: 'ף', name: 'Final Fei', family: 'pe', final: true },
  { id: 'tzadi', glyph: 'צ', name: 'Tzadi', family: 'tzadi' },
  { id: 'final-tzadi', glyph: 'ץ', name: 'Final Tzadi', family: 'tzadi', final: true },
  { id: 'kuf', glyph: 'ק', name: 'Kuf', family: 'kuf' },
  { id: 'resh', glyph: 'ר', name: 'Reish', family: 'resh' },
  { id: 'shin', glyph: 'ש' + SHIN_DOT, name: 'Shin', family: 'shin' },
  { id: 'sin', glyph: 'ש' + SIN_DOT, name: 'Sin', family: 'shin' },
  { id: 'tav-dagesh', glyph: 'ת' + D, name: 'Tav (with dagesh)', family: 'tav' },
  { id: 'tav', glyph: 'ת', name: 'Tav (no dagesh)', family: 'tav' },
];

// Letter + vowel pairs that are not valid stand-alone written syllables.
// Final letters are only written at the end of a word, so as single combinations
// we allow just ךָ and ךְ. Vav + cholam is written identically to cholam male, so it is excluded
// to avoid a "two identical cards" question.
export function isValidCombo(letter, vowel) {
  if (letter.final) {
    return letter.id === 'final-khaf' && (vowel.id === 'kamatz' || vowel.id === 'shva');
  }
  if (letter.id === 'vav' && (vowel.id === 'cholam' || vowel.id === 'cholam-male')) return false;
  return true;
}
