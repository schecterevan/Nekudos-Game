// Vowel (nekudos) definitions. Pure data — no game logic here.
//
// Each vowel has:
//   id          stable content ID (never change once recordings exist)
//   mark        the combining niqqud character written under/over/inside the letter (or '' if none)
//   trailing    extra letter(s) that are part of the vowel form, written after the carrier letter
//               (e.g. chirik male = chirik + yod, shuruk = vav with dagesh)
//   standalone  true when the vowel form is a full letter and needs no carrier (shuruk, cholam male)
//   name        default English display name (parents can rename it)
//   hebrewName  vocalized Hebrew name, shown to parents only
//   order       teaching / display order
//
// Pronunciation (what it sounds like, which vowels share a sound) is NOT stored here.
// See presets.js and the parent settings, because it depends on the family's tradition.

export const MARKS = {
  shva: 'ְ',
  chatafSegol: 'ֱ',
  chatafPatach: 'ֲ',
  chatafKamatz: 'ֳ',
  chirik: 'ִ',
  tzere: 'ֵ',
  segol: 'ֶ',
  patach: 'ַ',
  kamatz: 'ָ',
  cholam: 'ֹ',
  kubutz: 'ֻ',
  dagesh: 'ּ',
  shinDot: 'ׁ',
  sinDot: 'ׂ',
};

const VAV = 'ו';
const YOD = 'י';

export const VOWELS = [
  { id: 'kamatz', mark: MARKS.kamatz, trailing: '', name: 'Kamatz', hebrewName: 'קָמָץ', order: 1 },
  { id: 'patach', mark: MARKS.patach, trailing: '', name: 'Patach', hebrewName: 'פַּתָּח', order: 2 },
  { id: 'tzere', mark: MARKS.tzere, trailing: '', name: 'Tzere', hebrewName: 'צֵירֵי', order: 3 },
  { id: 'segol', mark: MARKS.segol, trailing: '', name: 'Segol', hebrewName: 'סֶגּוֹל', order: 4 },
  { id: 'chirik', mark: MARKS.chirik, trailing: '', name: 'Chirik', hebrewName: 'חִירִיק', order: 5 },
  { id: 'cholam', mark: MARKS.cholam, trailing: '', name: 'Cholam', hebrewName: 'חוֹלָם', order: 6 },
  { id: 'kubutz', mark: MARKS.kubutz, trailing: '', name: 'Kubutz', hebrewName: 'קֻבּוּץ', order: 7 },
  { id: 'shuruk', mark: '', trailing: VAV + MARKS.dagesh, standalone: true, name: 'Shuruk', hebrewName: 'שׁוּרוּק', order: 8 },
  { id: 'cholam-male', mark: '', trailing: VAV + MARKS.cholam, standalone: true, name: 'Cholam (with vav)', hebrewName: 'חוֹלָם מָלֵא', order: 9 },
  { id: 'chirik-male', mark: MARKS.chirik, trailing: YOD, name: 'Chirik (with yud)', hebrewName: 'חִירִיק מָלֵא', order: 10 },
  { id: 'tzere-male', mark: MARKS.tzere, trailing: YOD, name: 'Tzere (with yud)', hebrewName: 'צֵירֵי מָלֵא', order: 11 },
  { id: 'shva', mark: MARKS.shva, trailing: '', name: 'Shva', hebrewName: 'שְׁוָא', order: 12 },
  { id: 'chataf-patach', mark: MARKS.chatafPatach, trailing: '', name: 'Chataf Patach', hebrewName: 'חֲטַף פַּתָּח', order: 13 },
  { id: 'chataf-segol', mark: MARKS.chatafSegol, trailing: '', name: 'Chataf Segol', hebrewName: 'חֲטַף סֶגּוֹל', order: 14 },
  { id: 'chataf-kamatz', mark: MARKS.chatafKamatz, trailing: '', name: 'Chataf Kamatz', hebrewName: 'חֲטַף קָמָץ', order: 15 },
];

export const DOTTED_CIRCLE = '◌';
