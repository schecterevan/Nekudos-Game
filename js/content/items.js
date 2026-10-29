// Curated reading-item bank (2+ letters). Parents can review every item in the parent area,
// hide any item, and add their own.
//
//   id          stable content ID (recordings are keyed by it: "item:<id>")
//   kind        'sequence' = practice syllables, NOT a real word
//               'word'     = a real Hebrew word
//   text        exact spelling with vocalization, as it should be displayed
//   segments    explicit metadata: one entry per written letter the child must read, in order.
//               { l: letterId, v: vowelId | null, dagesh?: true }
//               v: null means the letter carries no vowel (end of word, or a silent letter).
//               dagesh: true marks a doubling dagesh on a letter whose variant has no dagesh.
//               Vowel letters that belong to a vowel form (the vav of shuruk / cholam male, the yod
//               of chirik male) are part of that vowel, not separate segments.
//   length      number of segments (stored explicitly — never computed from Unicode code points)
//   difficulty  1 (easiest) … 5
//   gloss       meaning (words only), for the parent
//   note        reviewer note for the parent (silent letters, tradition differences…)
//
// The audio for each item is a recording of the WHOLE item made by the parent. Nothing here
// is used to synthesize a pronunciation; `segments` only decides which items are allowed.

export const ITEMS = [
  // ---- Practice sequences (not words) ----
  { id: 'seq-ma-la', kind: 'sequence', text: 'מָלָ', segments: [{ l: 'mem', v: 'kamatz' }, { l: 'lamed', v: 'kamatz' }], length: 2, difficulty: 1 },
  { id: 'seq-la-ma', kind: 'sequence', text: 'לָמָ', segments: [{ l: 'lamed', v: 'kamatz' }, { l: 'mem', v: 'kamatz' }], length: 2, difficulty: 1 },
  { id: 'seq-na-ma', kind: 'sequence', text: 'נָמָ', segments: [{ l: 'nun', v: 'kamatz' }, { l: 'mem', v: 'kamatz' }], length: 2, difficulty: 1 },
  { id: 'seq-sa-la', kind: 'sequence', text: 'סָלָ', segments: [{ l: 'samech', v: 'kamatz' }, { l: 'lamed', v: 'kamatz' }], length: 2, difficulty: 1 },
  { id: 'seq-ra-ma', kind: 'sequence', text: 'רָמָ', segments: [{ l: 'resh', v: 'kamatz' }, { l: 'mem', v: 'kamatz' }], length: 2, difficulty: 1 },
  { id: 'seq-ba-la', kind: 'sequence', text: 'בָּלָ', segments: [{ l: 'bet', v: 'kamatz' }, { l: 'lamed', v: 'kamatz' }], length: 2, difficulty: 1 },
  { id: 'seq-la-va', kind: 'sequence', text: 'לָבָ', segments: [{ l: 'lamed', v: 'kamatz' }, { l: 'vet', v: 'kamatz' }], length: 2, difficulty: 2, note: 'Second letter is vet (no dagesh).' },
  { id: 'seq-ma-na', kind: 'sequence', text: 'מַנַ', segments: [{ l: 'mem', v: 'patach' }, { l: 'nun', v: 'patach' }], length: 2, difficulty: 1 },
  { id: 'seq-mi-li', kind: 'sequence', text: 'מִלִ', segments: [{ l: 'mem', v: 'chirik' }, { l: 'lamed', v: 'chirik' }], length: 2, difficulty: 2 },
  { id: 'seq-le-me', kind: 'sequence', text: 'לֶמֶ', segments: [{ l: 'lamed', v: 'segol' }, { l: 'mem', v: 'segol' }], length: 2, difficulty: 2 },
  { id: 'seq-ne-se', kind: 'sequence', text: 'נֵסֵ', segments: [{ l: 'nun', v: 'tzere' }, { l: 'samech', v: 'tzere' }], length: 2, difficulty: 2 },
  { id: 'seq-mo-lo', kind: 'sequence', text: 'מֹלֹ', segments: [{ l: 'mem', v: 'cholam' }, { l: 'lamed', v: 'cholam' }], length: 2, difficulty: 2 },
  { id: 'seq-mu-lu', kind: 'sequence', text: 'מֻלֻ', segments: [{ l: 'mem', v: 'kubutz' }, { l: 'lamed', v: 'kubutz' }], length: 2, difficulty: 2 },
  { id: 'seq-shi-ma', kind: 'sequence', text: 'שִׁמָ', segments: [{ l: 'shin', v: 'chirik' }, { l: 'mem', v: 'kamatz' }], length: 2, difficulty: 2 },
  { id: 'seq-ma-la-na', kind: 'sequence', text: 'מָלָנָ', segments: [{ l: 'mem', v: 'kamatz' }, { l: 'lamed', v: 'kamatz' }, { l: 'nun', v: 'kamatz' }], length: 3, difficulty: 3 },
  { id: 'seq-la-mi-sa', kind: 'sequence', text: 'לָמִסָ', segments: [{ l: 'lamed', v: 'kamatz' }, { l: 'mem', v: 'chirik' }, { l: 'samech', v: 'kamatz' }], length: 3, difficulty: 3 },
  { id: 'seq-ba-ma-la', kind: 'sequence', text: 'בָּמָלָ', segments: [{ l: 'bet', v: 'kamatz' }, { l: 'mem', v: 'kamatz' }, { l: 'lamed', v: 'kamatz' }], length: 3, difficulty: 3 },
  { id: 'seq-ra-na-mi', kind: 'sequence', text: 'רַנַמִ', segments: [{ l: 'resh', v: 'patach' }, { l: 'nun', v: 'patach' }, { l: 'mem', v: 'chirik' }], length: 3, difficulty: 3 },
  { id: 'seq-ma-la-na-sa', kind: 'sequence', text: 'מָלָנָסָ', segments: [{ l: 'mem', v: 'kamatz' }, { l: 'lamed', v: 'kamatz' }, { l: 'nun', v: 'kamatz' }, { l: 'samech', v: 'kamatz' }], length: 4, difficulty: 4 },

  // ---- Real words ----
  { id: 'w-av', kind: 'word', text: 'אָב', segments: [{ l: 'alef', v: 'kamatz' }, { l: 'vet', v: null }], length: 2, difficulty: 2, gloss: 'father' },
  { id: 'w-ba', kind: 'word', text: 'בָּא', segments: [{ l: 'bet', v: 'kamatz' }, { l: 'alef', v: null }], length: 2, difficulty: 2, gloss: 'came / comes', note: 'Final alef is silent.' },
  { id: 'w-yad', kind: 'word', text: 'יָד', segments: [{ l: 'yod', v: 'kamatz' }, { l: 'dalet', v: null }], length: 2, difficulty: 2, gloss: 'hand' },
  { id: 'w-dag', kind: 'word', text: 'דָּג', segments: [{ l: 'dalet-dagesh', v: 'kamatz' }, { l: 'gimel', v: null }], length: 2, difficulty: 2, gloss: 'fish' },
  { id: 'w-gan', kind: 'word', text: 'גַּן', segments: [{ l: 'gimel-dagesh', v: 'patach' }, { l: 'final-nun', v: null }], length: 2, difficulty: 2, gloss: 'garden / kindergarten' },
  { id: 'w-gam', kind: 'word', text: 'גַּם', segments: [{ l: 'gimel-dagesh', v: 'patach' }, { l: 'final-mem', v: null }], length: 2, difficulty: 2, gloss: 'also' },
  { id: 'w-sham', kind: 'word', text: 'שָׁם', segments: [{ l: 'shin', v: 'kamatz' }, { l: 'final-mem', v: null }], length: 2, difficulty: 2, gloss: 'there' },
  { id: 'w-mah', kind: 'word', text: 'מָה', segments: [{ l: 'mem', v: 'kamatz' }, { l: 'he', v: null }], length: 2, difficulty: 2, gloss: 'what', note: 'Final hei is silent.' },
  { id: 'w-lo', kind: 'word', text: 'לֹא', segments: [{ l: 'lamed', v: 'cholam' }, { l: 'alef', v: null }], length: 2, difficulty: 2, gloss: 'no', note: 'Final alef is silent.' },
  { id: 'w-im', kind: 'word', text: 'אִם', segments: [{ l: 'alef', v: 'chirik' }, { l: 'final-mem', v: null }], length: 2, difficulty: 2, gloss: 'if' },
  { id: 'w-am', kind: 'word', text: 'עַם', segments: [{ l: 'ayin', v: 'patach' }, { l: 'final-mem', v: null }], length: 2, difficulty: 2, gloss: 'nation / people' },
  { id: 'w-ken', kind: 'word', text: 'כֵּן', segments: [{ l: 'kaf', v: 'tzere' }, { l: 'final-nun', v: null }], length: 2, difficulty: 2, gloss: 'yes' },
  { id: 'w-ben', kind: 'word', text: 'בֵּן', segments: [{ l: 'bet', v: 'tzere' }, { l: 'final-nun', v: null }], length: 2, difficulty: 2, gloss: 'son' },
  { id: 'w-ner', kind: 'word', text: 'נֵר', segments: [{ l: 'nun', v: 'tzere' }, { l: 'resh', v: null }], length: 2, difficulty: 2, gloss: 'candle' },
  { id: 'w-or', kind: 'word', text: 'אוֹר', segments: [{ l: 'alef', v: 'cholam-male' }, { l: 'resh', v: null }], length: 2, difficulty: 3, gloss: 'light' },
  { id: 'w-tov', kind: 'word', text: 'טוֹב', segments: [{ l: 'tet', v: 'cholam-male' }, { l: 'vet', v: null }], length: 2, difficulty: 3, gloss: 'good' },
  { id: 'w-sus', kind: 'word', text: 'סוּס', segments: [{ l: 'samech', v: 'shuruk' }, { l: 'samech', v: null }], length: 2, difficulty: 3, gloss: 'horse' },
  { id: 'w-pil', kind: 'word', text: 'פִּיל', segments: [{ l: 'pe', v: 'chirik-male' }, { l: 'lamed', v: null }], length: 2, difficulty: 3, gloss: 'elephant' },
  { id: 'w-hu', kind: 'word', text: 'הוּא', segments: [{ l: 'he', v: 'shuruk' }, { l: 'alef', v: null }], length: 2, difficulty: 3, gloss: 'he', note: 'Final alef is silent.' },
  { id: 'w-hi', kind: 'word', text: 'הִיא', segments: [{ l: 'he', v: 'chirik-male' }, { l: 'alef', v: null }], length: 2, difficulty: 3, gloss: 'she', note: 'Final alef is silent.' },
  { id: 'w-abba', kind: 'word', text: 'אַבָּא', segments: [{ l: 'alef', v: 'patach' }, { l: 'bet', v: 'kamatz' }, { l: 'alef', v: null }], length: 3, difficulty: 3, gloss: 'dad', note: 'Final alef is silent.' },
  { id: 'w-ima', kind: 'word', text: 'אִמָּא', segments: [{ l: 'alef', v: 'chirik' }, { l: 'mem', v: 'kamatz', dagesh: true }, { l: 'alef', v: null }], length: 3, difficulty: 3, gloss: 'mom', note: 'The mem has a doubling dagesh (a dot inside). Final alef is silent.' },
  { id: 'w-shalom', kind: 'word', text: 'שָׁלוֹם', segments: [{ l: 'shin', v: 'kamatz' }, { l: 'lamed', v: 'cholam-male' }, { l: 'final-mem', v: null }], length: 3, difficulty: 3, gloss: 'peace / hello' },
  { id: 'w-torah', kind: 'word', text: 'תּוֹרָה', segments: [{ l: 'tav-dagesh', v: 'cholam-male' }, { l: 'resh', v: 'kamatz' }, { l: 'he', v: null }], length: 3, difficulty: 3, gloss: 'Torah', note: 'Final hei is silent.' },
  { id: 'w-todah', kind: 'word', text: 'תּוֹדָה', segments: [{ l: 'tav-dagesh', v: 'cholam-male' }, { l: 'dalet', v: 'kamatz' }, { l: 'he', v: null }], length: 3, difficulty: 3, gloss: 'thank you', note: 'Final hei is silent.' },
  { id: 'w-shabbat', kind: 'word', text: 'שַׁבָּת', segments: [{ l: 'shin', v: 'patach' }, { l: 'bet', v: 'kamatz' }, { l: 'tav', v: null }], length: 3, difficulty: 3, gloss: 'Shabbat', note: 'Final tav has no dagesh: "Shabbat" or "Shabbos" depending on tradition — record it the way the teacher says it.' },
  { id: 'w-bayit', kind: 'word', text: 'בַּיִת', segments: [{ l: 'bet', v: 'patach' }, { l: 'yod', v: 'chirik' }, { l: 'tav', v: null }], length: 3, difficulty: 4, gloss: 'house', note: 'Final tav has no dagesh ("bayit" / "bayis").' },
  { id: 'w-mayim', kind: 'word', text: 'מַיִם', segments: [{ l: 'mem', v: 'patach' }, { l: 'yod', v: 'chirik' }, { l: 'final-mem', v: null }], length: 3, difficulty: 4, gloss: 'water' },
  { id: 'w-yeled', kind: 'word', text: 'יֶלֶד', segments: [{ l: 'yod', v: 'segol' }, { l: 'lamed', v: 'segol' }, { l: 'dalet', v: null }], length: 3, difficulty: 3, gloss: 'boy / child' },
  { id: 'w-kelev', kind: 'word', text: 'כֶּלֶב', segments: [{ l: 'kaf', v: 'segol' }, { l: 'lamed', v: 'segol' }, { l: 'vet', v: null }], length: 3, difficulty: 3, gloss: 'dog' },
  { id: 'w-lechem', kind: 'word', text: 'לֶחֶם', segments: [{ l: 'lamed', v: 'segol' }, { l: 'chet', v: 'segol' }, { l: 'final-mem', v: null }], length: 3, difficulty: 3, gloss: 'bread' },
  { id: 'w-sefer', kind: 'word', text: 'סֵפֶר', segments: [{ l: 'samech', v: 'tzere' }, { l: 'fe', v: 'segol' }, { l: 'resh', v: null }], length: 3, difficulty: 3, gloss: 'book' },
  { id: 'w-moshe', kind: 'word', text: 'מֹשֶׁה', segments: [{ l: 'mem', v: 'cholam' }, { l: 'shin', v: 'segol' }, { l: 'he', v: null }], length: 3, difficulty: 4, gloss: 'Moshe (Moses)', note: 'The cholam dot sits near the shin dot — check it looks clear.' },
  { id: 'w-echad', kind: 'word', text: 'אֶחָד', segments: [{ l: 'alef', v: 'segol' }, { l: 'chet', v: 'kamatz' }, { l: 'dalet', v: null }], length: 3, difficulty: 3, gloss: 'one' },
];
