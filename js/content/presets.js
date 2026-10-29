// Pronunciation starting points. NONE of these is applied silently: the parent must pick one
// (or "Every symbol separate") and confirm it matches the teacher before sound-based questions run.
//
// A "sound group" is just a label. Two vowels (or two letters) with the same label are treated as
// sounding the same: a sound-only question never puts both on screen as right/wrong alternatives,
// and if both appear, both are accepted.
//
// soundHint is a parent-facing reminder of what the recording should sound like — never played.

export const PRESETS = {
  modern: {
    label: 'Modern Israeli style',
    description: 'Kamatz = patach, tzere = segol, kubutz = shuruk, cholam = cholam with vav. Tav sounds like tet. Common in Israeli schools; many Sephardi communities are similar.',
    vowelGroups: {
      kamatz: 'a', patach: 'a', 'chataf-patach': 'a',
      tzere: 'e', segol: 'e', 'chataf-segol': 'e', 'tzere-male': 'e',
      chirik: 'i', 'chirik-male': 'i',
      cholam: 'o', 'cholam-male': 'o', 'chataf-kamatz': 'o',
      kubutz: 'u', shuruk: 'u',
      shva: 'shva',
    },
    soundHints: {
      kamatz: 'ah', patach: 'ah', 'chataf-patach': 'ah', tzere: 'eh', segol: 'eh', 'chataf-segol': 'eh',
      'tzere-male': 'eh', chirik: 'ee', 'chirik-male': 'ee', cholam: 'oh', 'cholam-male': 'oh',
      'chataf-kamatz': 'oh', kubutz: 'oo', shuruk: 'oo', shva: 'short e / silent',
    },
    letterGroups: {
      alef: 'silent', ayin: 'silent', vet: 'v', vav: 'v', chet: 'kh', khaf: 'kh', 'final-khaf': 'kh',
      tet: 't', tav: 't', 'tav-dagesh': 't', kaf: 'k', kuf: 'k', samech: 's', sin: 's',
      gimel: 'g', 'gimel-dagesh': 'g', dalet: 'd', 'dalet-dagesh': 'd', mem: 'm', 'final-mem': 'm',
      nun: 'n', 'final-nun': 'n', fe: 'f', 'final-fe': 'f', tzadi: 'ts', 'final-tzadi': 'ts',
    },
  },
  ashkenazi: {
    label: 'Ashkenazi style (e.g. many Chabad / yeshiva classrooms)',
    description: 'Kamatz ("aw") differs from patach ("ah"), tzere ("ay") differs from segol ("eh"). Tav without dagesh sounds like samech. Details vary by community — check each one.',
    vowelGroups: {
      kamatz: 'aw', 'chataf-kamatz': 'aw',
      patach: 'ah', 'chataf-patach': 'ah',
      tzere: 'ay', 'tzere-male': 'ay',
      segol: 'eh', 'chataf-segol': 'eh',
      chirik: 'ee', 'chirik-male': 'ee',
      cholam: 'oh', 'cholam-male': 'oh',
      kubutz: 'oo', shuruk: 'oo',
      shva: 'shva',
    },
    soundHints: {
      kamatz: 'aw', 'chataf-kamatz': 'aw', patach: 'ah', 'chataf-patach': 'ah', tzere: 'ay', 'tzere-male': 'ay',
      segol: 'eh', 'chataf-segol': 'eh', chirik: 'ee', 'chirik-male': 'ee', cholam: 'oy / oh',
      'cholam-male': 'oy / oh', kubutz: 'oo', shuruk: 'oo', shva: 'short e / silent',
    },
    letterGroups: {
      alef: 'silent', ayin: 'silent', vet: 'v', vav: 'v', chet: 'kh', khaf: 'kh', 'final-khaf': 'kh',
      tet: 't', 'tav-dagesh': 't', tav: 's', samech: 's', sin: 's', kaf: 'k', kuf: 'k',
      gimel: 'g', 'gimel-dagesh': 'g', dalet: 'd', 'dalet-dagesh': 'd', mem: 'm', 'final-mem': 'm',
      nun: 'n', 'final-nun': 'n', fe: 'f', 'final-fe': 'f', tzadi: 'ts', 'final-tzadi': 'ts',
    },
  },
  separate: {
    label: 'Every symbol separate',
    description: 'No two vowels or letters are treated as sounding alike. Use this if your teacher distinguishes all of them, or as a blank slate to edit by hand.',
    vowelGroups: {},
    soundHints: {},
    letterGroups: {
      // Written variants that are the same letter in every tradition still share a sound.
      gimel: 'g', 'gimel-dagesh': 'g', dalet: 'd', 'dalet-dagesh': 'd', mem: 'm', 'final-mem': 'm',
      nun: 'n', 'final-nun': 'n', khaf: 'kh', 'final-khaf': 'kh', fe: 'f', 'final-fe': 'f',
      tzadi: 'ts', 'final-tzadi': 'ts',
    },
  },
};
