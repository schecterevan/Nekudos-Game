# Nekudos Stars

An audio-first Hebrew vowel (nekudos) game for a young child who can't read yet. She taps a big Play button, hears a prompt, and taps big cards. A right answer adds a star to her night sky. There are no timers, lives, or buzzers. All the explanations and settings are in a parent area that opens with press-and-hold.

The app is plain HTML, CSS, and JavaScript modules, with **no dependencies, no build step, no accounts, and no server-side code**. Everything is stored in the browser on the device.

For setting up content and recordings, see **[PARENT_GUIDE.md](PARENT_GUIDE.md)**.

## Running it

You need [Node.js](https://nodejs.org) 20 or newer. It's only used for the tiny local server and the tests.

```bash
npm start
```

Then open http://localhost:5173.

### On an iPad or phone

Browsers only allow **microphone recording** on `https://` pages or on `localhost`. You have two options:

1. **Record on the computer, play on the iPad (simplest).**
   - Record everything on the computer at `http://localhost:5173`, then use Parent area → Backup → Export.
   - On the computer, run the following command. It prints an address like `http://192.168.1.20:5173`.

     ```bash
     npm run start:lan
     ```

   - Open that address in Safari on the iPad and use Parent area → Backup → Import with the exported file. (AirDrop the file to the iPad first, or put it in iCloud Drive.)
   - Uploading audio files also works over plain http. Only live microphone recording doesn't.
2. **Host it on HTTPS** (GitHub Pages, Netlify, Cloudflare Pages, etc. Free static hosting is enough; just upload this folder). Then everything works on the iPad directly, including the microphone. Safari's *Share → Add to Home Screen* gives a full-screen app that also works offline.

Data is stored separately for each address. `localhost`, the LAN address, and a hosted address each have their own settings and recordings, and Backup/Import moves data between them.

## Tests

```bash
npm test
```

That runs 32 logic tests in Node. They cover:
- Only enabled content appears.
- Sound-equivalent answers are never marked wrong.
- One-vowel and one-letter selections work.
- Missing recordings never produce a silent question.
- Prompts never overlap, and a new prompt cancels the old one.
- Settings, progress, and backups round-trip.
- Every reading item's spelling matches its letter and vowel metadata.

Then, with `npm start` running, open http://localhost:5173/tests/browser.html and tap **Run tests**. Use the browser's phone-size view to test small screens. This page checks what Node can't:
- Every vowel, letter+vowel combination, and reading item, in both fonts, fits its card at the current screen width without clipping marks.
- Vowel marks attach to the dotted-circle carrier.
- Real audio playback doesn't overlap.
- Settings, progress, and a recording survive a real page reload (localStorage + IndexedDB). It cleans up its test data afterwards.

## Project layout

```
index.html            app shell
css/app.css           all styles (child screens + parent area)
fonts/                Noto Serif/Sans Hebrew, Hebrew subset, bundled for offline use (SIL OFL)
js/content/           LEARNING CONTENT ONLY: pure data, no logic
  vowels.js           vowel symbols, names, multi-letter forms (shuruk, cholam male, …)
  letters.js          letter variants (בּ/ב, שׁ/שׂ, תּ/ת, finals) + which combos are valid
  items.js            curated reading items: exact text + explicit segment metadata
  presets.js          pronunciation starting points (sound-equivalence groups)
  prompts.js          reusable instructions and praise to record
  rewards.js          the dress-up prizes, in order
js/core/              game logic, pure and unit-tested
  catalog.js          content + settings → what's enabled, what sounds alike
  audioKeys.js        which recording plays for what (never TTS for learning content)
  questions.js        builds a round (choices, distractors, sound equivalence)
  round.js            attempts, showing the answer, re-asking later
  progress.js         first-try vs. retry vs. helped, summaries
  audio.js            one-at-a-time audio sequencing with cancellation
  settings.js         defaults + validation
js/storage/           localStorage (settings, progress), IndexedDB (recordings), backup files
js/ui/                DOM screens: child.js, parent.js, studio.js, recorder.js, platform.js
tests/                Node tests + in-browser test page
dressup.html          preview of the dress-up prizes, step by step
server.js             zero-dependency static server
sw.js                 offline cache (HTTPS only)
```

## Adding content

- **A reading item.** Use Parent area → Reading items → *Add your own item*. Or add an entry to `js/content/items.js` with a new, stable `id`, the exact `text`, `segments` (one per letter read, as `{ l: letterId, v: vowelId | null }`), `length`, `difficulty`, and a `kind` of `'word'` (with `gloss`) or `'sequence'`. `npm test` checks that the text matches the segments.
- **A vowel or letter variant.** Add it to `vowels.js` or `letters.js` with a new `id`, and add its sound group to each preset in `presets.js` if needed.
- **Don't rename existing IDs.** Recordings and progress are keyed by them.

Nothing synthesizes Hebrew pronunciation. Every vowel name, vowel sound, syllable, and word plays the parent's own recording of exactly that item. Two sound-equivalent symbols can share a recording only if the parent allows it.
