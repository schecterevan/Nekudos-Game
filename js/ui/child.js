// Child-facing screens. No reading required: everything is icons, big targets, and audio.
import { h, heb, icon } from './dom.js';
import { buildRound } from '../core/questions.js';
import { Round } from '../core/round.js';
import { recordResult, finishRound } from '../core/progress.js';
import { enabledVowels, enabledCombos, isolatedVowelText } from '../core/catalog.js';
import { makeRng } from '../core/rng.js';
import { PRAISE_KEYS } from '../content/prompts.js';
import { parentHoldButton } from './parentHold.js';
import { princessScene, prizeTrack, isRiding } from './princess.js';
import { PRIZES } from '../content/rewards.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function demoBanner(app) {
  return app.settings.demoMode
    ? h('div', { class: 'demo-banner', role: 'status' }, 'DEMO AUDIO — device voice placeholders, not checked pronunciation')
    : null;
}

function speakerButton(onTap, label = 'Hear it again') {
  const btn = h('button', { class: 'speaker-btn', 'aria-label': label, onclick: onTap }, icon('speaker'));
  return btn;
}

// Keeps the speaker button animated while audio plays.
function bindSpeaking(app, el) {
  const off = app.audio.onChange((on) => el.classList.toggle('speaking', on));
  app.cleanup.push(off);
}

// ---------- home ----------

export function renderHome(app) {
  const sky = constellation(app.progress.stars);
  const dressUp = app.settings.dressUp;
  const play = h('button', { class: `play-btn${dressUp ? ' with-princess' : ''}`, 'aria-label': 'Play', onclick: () => startPlay(app) }, icon('play'));
  app.mount(
    h(
      'div',
      { class: 'screen child home' },
      demoBanner(app),
      sky,
      h('div', { class: `home-center${dressUp ? ' dress-up' : ''}` }, dressUp ? princessScene(app.progress.prizes, { cls: `home-princess${isRiding(app.progress.prizes) ? ' parade' : ''}` }) : null, play),
      parentHoldButton(app),
    ),
  );
}

// Each finished question adds a star; every 5 stars join into a little constellation.
// The sky is laid out for the screen's shape so nothing is cropped on a tall phone.
function constellation(count, highlightLast = 0) {
  const shown = Math.min(count, 60);
  const offset = count - shown;
  const ns = 'http://www.w3.org/2000/svg';
  const W = 100;
  const H = Math.round(W * Math.max(0.5, Math.min(2.4, innerHeight / innerWidth)));
  const cols = H > W ? 3 : 4;
  const rows = Math.ceil(12 / cols);
  const cellW = W / cols;
  const cellH = (H * 0.66) / rows;
  const svgEl = document.createElementNS(ns, 'svg');
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.setAttribute('class', 'sky');
  svgEl.setAttribute('aria-hidden', 'true');
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const rand = makeRng(7);
  const pts = [];
  for (let i = 0; i < 60; i++) {
    const group = Math.floor(i / 5);
    const gx = (group % cols) * cellW + cellW * 0.12;
    const gy = H * 0.04 + Math.floor(group / cols) * cellH + cellH * 0.1;
    pts.push([gx + rand() * cellW * 0.76, gy + rand() * cellH * 0.7]);
  }
  for (let i = 0; i < shown; i++) {
    const [x, y] = pts[i];
    if (i % 5 !== 0) {
      const [px, py] = pts[i - 1];
      const line = document.createElementNS(ns, 'line');
      Object.entries({ x1: px, y1: py, x2: x, y2: y, class: 'sky-line' }).forEach(([k, v]) => line.setAttribute(k, v));
      svgEl.append(line);
    }
  }
  for (let i = 0; i < shown; i++) {
    const [x, y] = pts[i];
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', ((i + offset) % 5 === 0 ? 1.5 : 1.05).toString());
    c.setAttribute('class', i >= shown - highlightLast ? 'sky-star new' : 'sky-star');
    c.style.animationDelay = i >= shown - highlightLast ? `${(i - (shown - highlightLast)) * 0.15}s` : `${(i % 7) * 0.4}s`;
    svgEl.append(c);
  }
  return svgEl;
}

// ---------- start ----------

export function startPlay(app) {
  app.unlockAudio(); // inside the tap: allowed to start sound from here on
  if (app.settings.mode === 'explore') return renderExplore(app);
  const result = buildRound({ settings: app.settings, resolver: app.resolver(), progress: app.progress, rng: makeRng(Date.now()) });
  if (result.status !== 'ok') return renderNeedsSetup(app, result.reasons);
  renderGame(app, new Round(result.questions, { helpAfterMisses: app.settings.helpAfterMisses }));
}

// ---------- "ask a grown-up" ----------

const REASONS = {
  'no-vowels': 'No vowels are turned on.',
  'no-letters': 'This activity needs at least one letter turned on.',
  'no-combos': 'None of the selected letters can carry the selected vowels on their own.',
  'no-items': 'No reading items match the selected letters, vowels, and length.',
  'missing-audio': 'The recordings this activity needs have not been made yet.',
  'pronunciation-unconfirmed': 'The pronunciation (which symbols sound alike) has not been confirmed yet.',
};

export function renderNeedsSetup(app, reasons) {
  app.mount(
    h(
      'div',
      { class: 'screen child needs-setup' },
      demoBanner(app),
      topBar(app),
      h(
        'div',
        { class: 'setup-card' },
        icon('grownup', 'big-icon'),
        icon('mic', 'mid-icon'),
        h('p', { class: 'parent-note' }, 'For the grown-up: ', reasons.map((r) => REASONS[r] || r).join(' '), ' Hold the lock button to open the parent area.'),
      ),
      parentHoldButton(app),
    ),
  );
}

function topBar(app, extra = null) {
  return h(
    'div',
    { class: 'top-bar' },
    h('button', { class: 'round-btn home-btn', 'aria-label': 'Home', onclick: () => app.goHome() }, icon('home')),
    extra || h('div'),
    h('div', { class: 'top-spacer' }),
  );
}

// ---------- explore ----------

export function renderExplore(app, tab = 'vowels') {
  const r = app.resolver();
  const vowelCards = enabledVowels(app.settings)
    .map((v) => ({ v, steps: [r.vowelNameStep(v.id), r.vowelSoundStep(v.id)].filter(Boolean) }))
    .filter((x) => x.steps.length);
  const comboCards = app.settings.enabledLetters.length
    ? enabledCombos(app.settings).map((c) => ({ c, step: r.comboStep(c.letterId, c.vowelId) })).filter((x) => x.step)
    : [];
  if (!vowelCards.length && !comboCards.length) return renderNeedsSetup(app, ['missing-audio']);
  if (tab === 'combos' && !comboCards.length) tab = 'vowels';
  if (tab === 'vowels' && !vowelCards.length) tab = 'combos';

  const grid = h('div', { class: 'card-grid explore-grid', 'data-count': tab === 'vowels' ? vowelCards.length : comboCards.length });
  const tapCard = (btn, steps) => {
    grid.querySelectorAll('.playing').forEach((b) => b.classList.remove('playing'));
    btn.classList.add('playing');
    app.audio.play(steps).then(() => btn.classList.remove('playing'));
  };
  if (tab === 'vowels') {
    for (const { v, steps } of vowelCards) {
      const withPause = steps.length === 2 ? [steps[0], { type: 'pause', ms: 350 }, steps[1]] : steps;
      const btn = h('button', { class: 'choice vowel-card', 'aria-label': v.name, onclick: () => tapCard(btn, withPause) }, heb(isolatedVowelText(v), 'vowel-glyph'));
      grid.append(btn);
    }
  } else {
    for (const { c, step } of comboCards) {
      const btn = h('button', { class: 'choice', 'aria-label': c.id, onclick: () => tapCard(btn, [step]) }, heb(c.text, 'item-glyph'));
      grid.append(btn);
    }
  }

  const tabs =
    vowelCards.length && comboCards.length
      ? h(
          'div',
          { class: 'explore-tabs' },
          h('button', { class: `round-btn ${tab === 'vowels' ? 'active' : ''}`, 'aria-label': 'Vowels', onclick: () => renderExplore(app, 'vowels') }, icon('vowels')),
          h('button', { class: `round-btn ${tab === 'combos' ? 'active' : ''}`, 'aria-label': 'Letters with vowels', onclick: () => renderExplore(app, 'combos') }, icon('letters')),
        )
      : null;

  const intro = [app.resolver().promptStep('instr:explore')].filter(Boolean);
  const speaker = speakerButton(() => app.audio.play(intro), 'Hear the instructions');
  bindSpeaking(app, speaker);
  app.mount(h('div', { class: 'screen child explore' }, demoBanner(app), topBar(app, tabs), h('div', { class: 'speaker-row' }, intro.length ? speaker : null), grid));
  if (intro.length) app.audio.play(intro);
}

// ---------- game ----------

export function renderGame(app, round) {
  const stars = h('div', { class: 'round-stars', 'aria-hidden': 'true' });
  const speakerRow = h('div', { class: 'speaker-row' });
  const board = h('div', { class: 'board' });
  app.mount(h('div', { class: 'screen child game' }, demoBanner(app), topBar(app, stars), speakerRow, board));
  let locked = false;
  let token = 0; // invalidates delayed callbacks from a previous question

  function drawStars() {
    stars.replaceChildren();
    for (let i = 0; i < round.total; i++) {
      stars.append(icon('star', i < round.results.length ? 'filled' : ''));
    }
  }

  function praiseSteps() {
    const r = app.resolver();
    const recorded = PRAISE_KEYS.filter((k) => app.recs.has(k));
    const key = recorded.length ? recorded[Math.floor(Math.random() * recorded.length)] : PRAISE_KEYS[Math.floor(Math.random() * PRAISE_KEYS.length)];
    return [r.promptStep(key)].filter(Boolean);
  }

  async function celebrate(cardEl) {
    const my = token;
    locked = true;
    cardEl?.classList.add('correct');
    cardEl?.append(h('span', { class: 'burst', 'aria-hidden': 'true' }, icon('star'), icon('star'), icon('star')));
    app.progress = recordResult(app.progress, round.results.at(-1));
    app.saveProgress();
    drawStars();
    if (app.settings.rewardSounds) app.sfx.chime();
    await Promise.all([app.audio.play([{ type: 'pause', ms: 300 }, ...praiseSteps()]), wait(1100)]);
    if (my !== token) return;
    round.next();
    if (round.done) return renderRoundEnd(app, round);
    showQuestion();
  }

  function showQuestion() {
    token += 1;
    locked = false;
    const q = round.current;
    drawStars();
    board.replaceChildren();
    speakerRow.replaceChildren();

    if (q.activity === 'try-read') return showTryRead(q);

    const speaker = speakerButton(() => app.audio.play(q.prompt));
    bindSpeaking(app, speaker);
    speakerRow.append(speaker);
    const grid = h('div', { class: 'card-grid', 'data-count': q.choices.length });
    for (const c of q.choices) {
      const btn = h(
        'button',
        { class: `choice ${c.isVowel ? 'vowel-card' : ''}`, 'data-id': c.id, 'aria-label': `choice ${c.id}` },
        heb(c.text, c.isVowel ? 'vowel-glyph' : 'item-glyph'),
      );
      btn.addEventListener('click', () => onChoice(q, c, btn, grid));
      grid.append(btn);
    }
    board.append(grid);
    app.audio.play(q.prompt);
  }

  function onChoice(q, c, btn, grid) {
    if (locked) return;
    const res = round.answer(c.id);
    if (res.correct) {
      grid.querySelectorAll('.choice').forEach((b) => b !== btn && b.classList.add('faded'));
      return celebrate(btn);
    }
    btn.classList.remove('wobble');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('wobble', 'tried');
    const r = app.resolver();
    if (res.demonstrate) {
      grid.querySelectorAll('.choice').forEach((b) => {
        const isAnswer = res.correctIds.includes(b.dataset.id);
        b.classList.toggle('show-me', isAnswer);
        b.classList.toggle('faded', !isAnswer);
        if (isAnswer && !b.querySelector('.pointer')) b.append(h('span', { class: 'pointer', 'aria-hidden': 'true' }, icon('hand')));
      });
      app.audio.play([r.promptStep('instr:look'), ...q.reveal].filter(Boolean));
    } else {
      app.audio.play([r.promptStep('instr:try-again'), { type: 'pause', ms: 200 }, ...q.prompt].filter(Boolean));
    }
  }

  function showTryRead(q) {
    const card = h('div', { class: 'read-card' }, heb(q.text, 'item-glyph big'));
    const next = h('button', { class: 'next-btn hidden', 'aria-label': 'Next', onclick: () => {
      if (locked) return;
      round.answer('heard');
      celebrate(null);
    } }, icon('next'));
    const hear = speakerButton(async () => {
      card.classList.add('glow');
      await app.audio.play(q.hear);
      card.classList.remove('glow');
      next.classList.remove('hidden');
    }, 'Hear it');
    bindSpeaking(app, hear);
    speakerRow.append(hear);
    board.append(card, next);
    app.audio.play(q.prompt);
  }

  showQuestion();
}

// ---------- end of round ----------

export function renderRoundEnd(app, round) {
  let newPrize = null;
  if (app.settings.dressUp) {
    ({ progress: app.progress, newPrize } = finishRound(app.progress, app.settings.roundsPerPrize));
  } else {
    app.progress = { ...app.progress, rounds: app.progress.rounds + 1 };
  }
  app.saveProgress();
  const sky = constellation(app.progress.stars, round.results.length);
  const actions = h(
    'div',
    { class: 'end-actions' },
    h('button', { class: 'round-btn big', 'aria-label': 'Home', onclick: () => app.goHome() }, icon('home')),
    h('button', { class: 'play-btn small', 'aria-label': 'Play again', onclick: () => startPlay(app) }, icon('replay')),
  );
  const done = [app.resolver().promptStep('instr:round-done')].filter(Boolean);

  if (!app.settings.dressUp) {
    app.mount(h('div', { class: 'screen child round-end' }, demoBanner(app), sky, actions));
    if (app.settings.rewardSounds) app.sfx.fanfare();
    app.audio.play(done);
    return;
  }

  const count = app.progress.prizes;
  const stage = h('div', { class: 'prize-stage' });
  const track = h('div', { class: 'prize-track-wrap' });
  const screen = h('div', { class: 'screen child round-end dress-up' }, demoBanner(app), sky, stage, track, actions);

  if (newPrize === null) {
    // No new prize this time (all collected, or a few rounds per prize): show her princess.
    stage.append(princessScene(count, { cls: isRiding(count) ? 'end-princess parade' : 'end-princess' }));
    track.append(prizeTrack(count));
    app.mount(screen);
    if (app.settings.rewardSounds) app.sfx.fanfare();
    app.audio.play(done);
    return;
  }

  // A wrapped gift she taps to open. The new prize then pops onto the picture.
  const before = princessScene(count - 1, { cls: 'end-princess waiting' });
  const gift = h('button', { class: 'gift-btn', 'aria-label': 'Open the present', html: GIFT_SVG });
  actions.classList.add('hidden');
  stage.append(before, gift);
  track.append(prizeTrack(count - 1));
  let opened = false;
  const open = () => {
    if (opened) return;
    opened = true;
    gift.classList.add('opening');
    if (app.settings.rewardSounds) app.sfx.fanfare();
    setTimeout(() => {
      stage.replaceChildren(princessScene(count, { newest: PRIZES[newPrize].id, cls: `end-princess reveal${isRiding(count) && PRIZES[newPrize].id !== 'unicorn' ? ' parade' : ''}` }), sparkles());
      track.replaceChildren(prizeTrack(count));
      actions.classList.remove('hidden');
    }, 650);
  };
  gift.addEventListener('click', open);
  app.mount(screen);
  if (app.settings.rewardSounds) app.sfx.chime();
  app.audio.play(done);
}

function sparkles() {
  const wrap = h('div', { class: 'sparkles', 'aria-hidden': 'true' });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 34 + (i % 3) * 9;
    const s = icon('star', 'spark');
    s.style.setProperty('--sx', `${Math.cos(a) * r}vmin`);
    s.style.setProperty('--sy', `${Math.sin(a) * r}vmin`);
    s.style.animationDelay = `${(i % 4) * 0.08}s`;
    wrap.append(s);
  }
  return wrap;
}

const GIFT_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <g class="gift-lid"><rect x="12" y="34" width="96" height="22" rx="5" fill="#ff5fa2" stroke="#c23b80" stroke-width="3"/>
    <rect x="52" y="34" width="16" height="22" fill="#ffe066"/>
    <path d="M60 34 C 40 8, 22 22, 40 32 Z M60 34 C 80 8, 98 22, 80 32 Z" fill="#ffe066" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/></g>
  <rect x="18" y="56" width="84" height="54" rx="5" fill="#ff8cc0" stroke="#c23b80" stroke-width="3"/>
  <rect x="52" y="56" width="16" height="54" fill="#ffe066"/>
</svg>`;
