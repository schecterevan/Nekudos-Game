// The dress-up picture: a smiley face that collects princess things, one per prize, and finally
// rides a unicorn. Drawn as layered inline SVG so each prize can pop in on its own.
import { h } from './dom.js';
import { PRIZES } from '../content/rewards.js';

const ORDER = PRIZES.map((p) => p.id);

// Each layer is SVG markup; `has` says whether that prize is earned.
function layer(id, newest, markup) {
  return `<g class="prize-layer${id === newest ? ' prize-new' : ''}" data-prize="${id}">${markup}</g>`;
}

const DEFS = `
<defs>
  <radialGradient id="pz-face" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff3a0"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#f5a623"/></radialGradient>
  <linearGradient id="pz-dress" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ccf"/><stop offset="1" stop-color="#e0559b"/></linearGradient>
  <linearGradient id="pz-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4b0"/><stop offset=".5" stop-color="#ffcf3a"/><stop offset="1" stop-color="#d99a10"/></linearGradient>
  <linearGradient id="pz-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f0b43c"/></linearGradient>
  <linearGradient id="pz-cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e5be8"/><stop offset="1" stop-color="#5a2fb0"/></linearGradient>
  <linearGradient id="pz-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#a9e4ff"/></linearGradient>
  <linearGradient id="pz-mane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7eb6"/><stop offset=".25" stop-color="#ffb36b"/><stop offset=".5" stop-color="#ffe66b"/><stop offset=".75" stop-color="#7fe0a8"/><stop offset="1" stop-color="#8fb8ff"/></linearGradient>
</defs>`;

function castle() {
  const tower = (x, y, w, hgt, roof) => `
    <rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="#ffd6ea" stroke="#f4a7cb" stroke-width="2"/>
    <path d="M${x - 5} ${y} L${x + w / 2} ${y - roof} L${x + w + 5} ${y} Z" fill="#b48cf2" stroke="#9a6fe0" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${x + w / 2} ${y - roof} v-14 l12 5 l-12 5" fill="#ff6fa8" stroke="#ff6fa8" stroke-width="1.5"/>
    <rect x="${x + w / 2 - 5}" y="${y + 16}" width="10" height="16" rx="5" fill="#9a6fe0" opacity=".7"/>`;
  return `<g opacity=".95">
    ${tower(24, 150, 44, 150, 46)}
    ${tower(252, 150, 44, 150, 46)}
    <rect x="62" y="190" width="196" height="110" fill="#ffe3f0" stroke="#f4a7cb" stroke-width="2"/>
    <path d="M62 190 h196" stroke="#f4a7cb" stroke-width="2"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${66 + i * 28}" y="178" width="16" height="14" fill="#ffe3f0" stroke="#f4a7cb" stroke-width="2"/>`).join('')}
    ${tower(130, 118, 60, 80, 54)}
    <path d="M138 300 v-38 a22 22 0 0 1 44 0 v38 Z" fill="#c9a6ff" stroke="#9a6fe0" stroke-width="2"/>
  </g>`;
}

function cape() {
  return `<path d="M122 158 C 96 200, 84 250, 76 290 Q 160 304 244 290 C 236 250, 224 200, 198 158 Z" fill="url(#pz-cape)" stroke="#4a2596" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M78 284 Q 160 298 242 284" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="2 9" stroke-linecap="round" opacity=".9"/>`;
}

function hairBack() {
  return `<path d="M104 92 C 100 40, 220 40, 216 92 C 226 130, 230 175, 218 205 C 206 196, 196 170, 196 150 L 124 150 C 124 170, 114 196, 102 205 C 90 175, 94 130, 104 92 Z" fill="url(#pz-hair)" stroke="#d4951f" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function hairFront() {
  return `<path d="M112 80 C 122 48, 198 48, 208 80 C 196 70, 186 68, 176 74 C 168 64, 152 64, 144 74 C 134 68, 122 70, 112 80 Z" fill="url(#pz-hair)" stroke="#d4951f" stroke-width="2.5" stroke-linejoin="round"/>`;
}

function stickBody(hasDress) {
  // Arms always end at the same hands so the scepter stays put. Legs only show without the dress.
  const legs = hasDress
    ? ''
    : `<path d="M148 152 L 142 272 M172 152 L 178 272" stroke="#f0a020" stroke-width="7" stroke-linecap="round"/>`;
  return `${legs}
    <path d="M${hasDress ? '128 170' : '118 136'} Q 100 160 92 182" fill="none" stroke="#f0a020" stroke-width="7" stroke-linecap="round"/>
    <path d="M${hasDress ? '192 170' : '202 136'} Q 222 156 230 172" fill="none" stroke="#f0a020" stroke-width="7" stroke-linecap="round"/>`;
}

function feet() {
  return `<ellipse cx="138" cy="278" rx="12" ry="7" fill="#f0a020"/><ellipse cx="182" cy="278" rx="12" ry="7" fill="#f0a020"/>`;
}

function slippers() {
  const shoe = (cx, flip) => `<g transform="translate(${cx} 292) scale(${flip * 1.3} 1.3)">
    <path d="M-16 2 C -16 -8, 2 -10, 8 -4 L 16 -2 C 18 4, 12 8, 0 8 L -14 8 Z" fill="url(#pz-glass)" stroke="#5fb8e6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-10 -1 l3 -3 l3 3 l-3 3 Z" fill="#fff"/></g>`;
  return shoe(136, -1) + shoe(184, 1);
}

function dress() {
  return `<path d="M132 150 Q 160 160 188 150 L 194 196 Q 236 246, 250 282 Q 160 300, 70 282 Q 84 246, 126 196 Z" fill="url(#pz-dress)" stroke="#c23b80" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M126 196 Q 160 206 194 196" fill="none" stroke="#ffe066" stroke-width="5" stroke-linecap="round"/>
    <path d="M76 276 Q 96 266 112 280 Q 130 266 148 282 Q 166 266 184 282 Q 202 266 220 280 Q 236 266 246 278" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>
    ${[[110, 240], [150, 232], [196, 244], [132, 262], [176, 258], [214, 266], [96, 266]].map(([x, y]) => `<path d="M${x} ${y - 5} l2 5 l-2 5 l-2 -5 Z M${x - 5} ${y} l5 -2 l5 2 l-5 2 Z" fill="#fff6c2"/>`).join('')}
    <ellipse cx="124" cy="166" rx="15" ry="13" fill="#ffb3da" stroke="#c23b80" stroke-width="2.5"/>
    <ellipse cx="196" cy="166" rx="15" ry="13" fill="#ffb3da" stroke="#c23b80" stroke-width="2.5"/>`;
}

function head(withLashes) {
  const lash = (x) => `<path d="M${x - 8} 92 l-5 -6 M${x - 2} 89 l-2 -7 M${x + 4} 89 l2 -7" stroke="#2b2b2b" stroke-width="2.4" stroke-linecap="round"/>`;
  return `<circle cx="160" cy="105" r="50" fill="url(#pz-face)" stroke="#e39a12" stroke-width="3"/>
    <ellipse cx="142" cy="100" rx="7" ry="10" fill="#2b2b2b"/><ellipse cx="178" cy="100" rx="7" ry="10" fill="#2b2b2b"/>
    <circle cx="144" cy="96" r="2.6" fill="#fff"/><circle cx="180" cy="96" r="2.6" fill="#fff"/>
    ${withLashes ? lash(140) + lash(176) : ''}
    <path d="M134 120 Q 160 146 186 120" fill="none" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"/>`;
}

function cheeks() {
  return `<ellipse cx="126" cy="120" rx="10" ry="6" fill="#ff7aa8" opacity=".55"/><ellipse cx="194" cy="120" rx="10" ry="6" fill="#ff7aa8" opacity=".55"/>
    <path d="M150 128 Q 160 134 170 128" fill="none" stroke="#ff4f8b" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
}

function earrings() {
  const drop = (x) => `<circle cx="${x}" cy="126" r="3" fill="#ffcf3a"/><path d="M${x} 129 l7 10 l-7 10 l-7 -10 Z" fill="#7fe3ff" stroke="#2aa7d6" stroke-width="1.5"/><path d="M${x - 2} 136 l2 -3" stroke="#fff" stroke-width="1.5"/>`;
  return drop(110) + drop(210);
}

function necklace() {
  const pearls = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = 134 + t * 52;
    const y = 156 + Math.sin(t * Math.PI) * 12;
    pearls.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fffaf0" stroke="#d8cfc0" stroke-width="1"/>`);
  }
  return pearls.join('') + `<path d="M160 168 l7 9 l-7 9 l-7 -9 Z" fill="#ff5fa2" stroke="#c23b80" stroke-width="1.5"/>`;
}

function tiara() {
  return `<path d="M124 64 L 132 34 L 146 52 L 160 22 L 174 52 L 188 34 L 196 64 Q 160 56 124 64 Z" fill="url(#pz-gold)" stroke="#b37a00" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="160" cy="44" r="5.5" fill="#ff4f8b" stroke="#b3245f" stroke-width="1.5"/>
    <circle cx="137" cy="52" r="3.5" fill="#6fd3ff"/><circle cx="183" cy="52" r="3.5" fill="#6fd3ff"/>
    <circle cx="132" cy="34" r="3" fill="#fff6c2"/><circle cx="160" cy="22" r="3.5" fill="#fff6c2"/><circle cx="188" cy="34" r="3" fill="#fff6c2"/>`;
}

function scepter() {
  return `<path d="M232 228 L 240 104" stroke="url(#pz-gold)" stroke-width="7" stroke-linecap="round"/>
    <path d="M232 228 L 240 104" stroke="#b37a00" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>
    <circle cx="240" cy="104" r="9" fill="#ff7eb6" stroke="#c23b80" stroke-width="2"/>
    <path d="M241 70 l5.5 11 l12 1.6 l-8.8 8.4 l2.2 12 l-10.9 -5.8 l-10.9 5.8 l2.2 -12 l-8.8 -8.4 l12 -1.6 Z" fill="url(#pz-gold)" stroke="#b37a00" stroke-width="2" stroke-linejoin="round" transform="translate(0 -6)"/>`;
}

function hands() {
  return `<circle cx="92" cy="184" r="8" fill="#ffd23f" stroke="#e39a12" stroke-width="2"/><circle cx="231" cy="172" r="8" fill="#ffd23f" stroke="#e39a12" stroke-width="2"/>`;
}

function rainbow() {
  const colors = ['#ff7eb6', '#ffb36b', '#ffe66b', '#7fe0a8', '#8fb8ff', '#b48cf2'];
  return `<g opacity=".85">${colors.map((c, i) => `<path d="M${14 + i * 9} 240 A ${146 - i * 9} ${146 - i * 9} 0 0 1 ${306 - i * 9} 240" fill="none" stroke="${c}" stroke-width="9"/>`).join('')}</g>`;
}

function flowerCrown() {
  const flower = ([x, y], c) =>
    `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(Math.cos((a * Math.PI) / 180) * 3.6).toFixed(1)}" cy="${(Math.sin((a * Math.PI) / 180) * 3.6).toFixed(1)}" r="3.2" fill="${c}"/>`).join('')}<circle r="2.2" fill="#ffe066"/></g>`;
  const spots = [[244, 144], [251, 137], [259, 133], [281, 137], [288, 144]];
  const colors = ['#ff7eb6', '#b48cf2', '#ff9f6b', '#8fb8ff', '#ff7eb6'];
  return `<path d="M242 146 Q 264 124 290 146" fill="none" stroke="#4fbf7a" stroke-width="3"/>
    ${[[248, 140], [270, 131], [285, 140]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="2" fill="#4fbf7a"/>`).join('')}
    ${spots.map((pt, i) => flower(pt, colors[i])).join('')}`;
}

function butterflies() {
  const fly = ([x, y], c, d) => `<g transform="translate(${x} ${y})"><g class="flutter" style="animation-delay:${d}s">
    <ellipse cx="-6" cy="-4" rx="7" ry="9" fill="${c}" stroke="#fff" stroke-width="1.5" transform="rotate(-20)"/>
    <ellipse cx="6" cy="-4" rx="7" ry="9" fill="${c}" stroke="#fff" stroke-width="1.5" transform="rotate(20)"/>
    <ellipse cx="-5" cy="6" rx="5" ry="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>
    <ellipse cx="5" cy="6" rx="5" ry="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>
    <rect x="-1.5" y="-10" width="3" height="20" rx="1.5" fill="#3b2b4f"/></g></g>`;
  return fly([20, 96], '#7fd6ff', 0) + fly([298, 98], '#ffb36b', 0.3) + fly([106, 54], '#ff8cc0', 0.15);
}

function kitten() {
  return `<g transform="translate(284 276)">
    <path d="M14 18 C 34 18, 34 -6, 24 -10" fill="none" stroke="#f0a35b" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="0" cy="8" rx="17" ry="14" fill="#ffc285" stroke="#d98a3d" stroke-width="2"/>
    <path d="M-16 -22 l2 -16 l10 10 Z M16 -22 l-2 -16 l-10 10 Z" fill="#ffc285" stroke="#d98a3d" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="0" cy="-16" r="16" fill="#ffc285" stroke="#d98a3d" stroke-width="2"/>
    <ellipse cx="-6" cy="-18" rx="2.6" ry="3.4" fill="#2b2b2b"/><ellipse cx="6" cy="-18" rx="2.6" ry="3.4" fill="#2b2b2b"/>
    <path d="M-2 -12 h4 l-2 2.5 Z" fill="#ff7aa8"/>
    <path d="M-4 -7 q 4 3 4 -1 q 0 4 4 1" fill="none" stroke="#2b2b2b" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M-8 -11 l-10 -2 M-8 -9 l-10 2 M8 -11 l10 -2 M8 -9 l10 2" stroke="#8a5a2b" stroke-width="1" stroke-linecap="round"/>
    <path d="M-12 -2 q 12 6 24 0" fill="none" stroke="#ff5fa2" stroke-width="3" stroke-linecap="round"/>
    <circle cx="0" cy="2" r="2.6" fill="#ffe066"/></g>`;
}

// Stands at the far left, just behind the unicorn's tail, looking toward the princess.
function giraffe() {
  const spot = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${(r * 0.8).toFixed(1)}" fill="#c47a2c"/>`;
  return `<g>
    ${[12, 22, 40, 50].map((x) => `<rect x="${x}" y="240" width="6" height="56" rx="3" fill="#ffcf6b" stroke="#b8742a" stroke-width="1.5"/><rect x="${x}" y="292" width="6" height="6" rx="2" fill="#6b4a2b"/>`).join('')}
    <path d="M8 230 Q 0 244 4 258" fill="none" stroke="#b8742a" stroke-width="2.5"/><circle cx="4" cy="260" r="3" fill="#6b4a2b"/>
    <ellipse cx="32" cy="236" rx="28" ry="16" fill="#ffcf6b" stroke="#b8742a" stroke-width="2"/>
    <path d="M34 230 L 50 230 L 62 140 L 48 136 Z" fill="#ffcf6b" stroke="#b8742a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M47 138 L 37 226" stroke="#c47a2c" stroke-width="3" stroke-dasharray="5 4"/>
    ${spot(20, 232, 5)}${spot(34, 242, 4.5)}${spot(44, 230, 4)}${spot(14, 242, 3.5)}${spot(53, 204, 3.5)}${spot(55, 178, 3)}${spot(57, 156, 3)}${spot(46, 214, 3)}
    <path d="M51 122 L 49 108 M59 121 L 59 107" stroke="#b8742a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="49" cy="107" r="3.2" fill="#6b4a2b"/><circle cx="59" cy="106" r="3.2" fill="#6b4a2b"/>
    <ellipse cx="44" cy="126" rx="7" ry="3.5" transform="rotate(-25 44 126)" fill="#ffcf6b" stroke="#b8742a" stroke-width="1.5"/>
    <ellipse cx="60" cy="130" rx="15" ry="10" transform="rotate(-12 60 130)" fill="#ffcf6b" stroke="#b8742a" stroke-width="2"/>
    <ellipse cx="72" cy="133" rx="7" ry="6" fill="#ffe3a8" stroke="#b8742a" stroke-width="1.5"/>
    <circle cx="74" cy="131" r="1.2" fill="#6b4a2b"/>
    <circle cx="59" cy="126" r="2.6" fill="#2b2b2b"/><circle cx="60" cy="125" r="0.9" fill="#fff"/>
    <path d="M66 138 q 4 3 8 0" fill="none" stroke="#6b4a2b" stroke-width="1.5" stroke-linecap="round"/>
  </g>`;
}

function fireworks() {
  const burst = ([x, y, r], c, d) => `<g transform="translate(${x} ${y})"><g class="burst-fw" style="animation-delay:${d}s">
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<path d="M${(Math.cos(a) * r * 0.35).toFixed(1)} ${(Math.sin(a) * r * 0.35).toFixed(1)} L${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${(Math.cos(a) * r * 1.15).toFixed(1)}" cy="${(Math.sin(a) * r * 1.15).toFixed(1)}" r="1.8" fill="#fff6c2"/>`;
    }).join('')}</g></g>`;
  return burst([55, 40, 22], '#ff7eb6', 0) + burst([262, 36, 24], '#8fe3ff', 0.6) + burst([168, 18, 13], '#ffe066', 1.1);
}

function unicorn(extra = '') {
  const leg = (x, d = 0) => `<path d="M${x} 236 q ${d} 30 0 56" stroke="#f3eefe" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M${x - 8} 292 h16" stroke="#c9a6ff" stroke-width="8" stroke-linecap="round"/>`;
  return `<g class="unicorn">
    <path d="M96 212 C 60 200, 44 236, 52 270 C 62 256, 66 244, 82 236 C 70 258, 76 276, 90 286 C 92 262, 100 246, 108 232 Z" fill="url(#pz-mane)" stroke="#d27bd8" stroke-width="2"/>
    ${leg(112, -4)}${leg(136, 4)}${leg(206, -4)}${leg(230, 4)}
    <ellipse cx="170" cy="218" rx="78" ry="40" fill="#fbf8ff" stroke="#9d84d0" stroke-width="3"/>
    <path d="M218 206 C 226 176, 236 160, 252 146 L 276 166 C 262 178, 250 196, 246 224 Z" fill="#fbf8ff" stroke="#9d84d0" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="270" cy="156" rx="30" ry="21" transform="rotate(28 270 156)" fill="#fbf8ff" stroke="#9d84d0" stroke-width="3"/>
    <ellipse cx="290" cy="172" rx="12" ry="9" transform="rotate(28 290 172)" fill="#ffd6ea"/>
    <circle cx="268" cy="150" r="4.5" fill="#2b2b2b"/><circle cx="269.5" cy="148.5" r="1.5" fill="#fff"/>
    <path d="M262 144 l-4 -5 M266 142 l-1 -6" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/>
    <path d="M254 136 l-6 -16 l14 10 Z" fill="#fbf8ff" stroke="#9d84d0" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M264 134 L 282 96 L 276 140 Z" fill="url(#pz-gold)" stroke="#b37a00" stroke-width="2" stroke-linejoin="round"/>
    <path d="M268 126 l10 -3 M271 116 l8 -2 M274 107 l6 -2" stroke="#b37a00" stroke-width="1.5"/>
    <path d="M250 136 C 232 142, 222 160, 214 186 C 226 176, 230 170, 236 168 C 226 186, 222 196, 220 210 C 234 190, 244 172, 256 160 Z" fill="url(#pz-mane)" stroke="#d27bd8" stroke-width="2"/>
    <ellipse cx="282" cy="166" rx="2" ry="1.4" fill="#c97aa0"/>
    ${extra}
  </g>`;
}

// count: how many prizes are earned (0..PRIZES.length). newest: id of a prize to animate in.
export function princessSvg(count, newest = null) {
  const has = new Set(ORDER.slice(0, count));
  const riding = has.has('unicorn');
  const d = has.has('dress');
  const parts = [];
  parts.push(stickBody(d));
  if (!has.has('slippers') && !d) parts.push(feet());
  if (d) parts.push(layer('dress', newest, dress()));
  if (has.has('slippers')) parts.push(layer('slippers', newest, slippers()));
  if (has.has('hair')) parts.push(layer('hair', newest, hairBack()));
  if (has.has('necklace')) parts.push(layer('necklace', newest, necklace()));
  parts.push(head(has.has('cheeks')));
  if (has.has('cheeks')) parts.push(layer('cheeks', newest, cheeks()));
  if (has.has('hair')) parts.push(layer('hair', newest, hairFront()));
  if (has.has('earrings')) parts.push(layer('earrings', newest, earrings()));
  if (has.has('tiara')) parts.push(layer('tiara', newest, tiara()));
  if (has.has('scepter')) parts.push(layer('scepter', newest, scepter()));
  parts.push(hands());

  // The cape sits behind everything on the figure.
  const figure = `${has.has('cape') ? layer('cape', newest, cape()) : ''}${parts.join('')}`;
  // Riding: the whole figure shrinks and sits side-saddle on the unicorn's back.
  const placed = riding
    ? `${has.has('giraffe') ? layer('giraffe', newest, giraffe()) : ''}${layer('unicorn', newest, unicorn(has.has('flowers') ? layer('flowers', newest, flowerCrown()) : ''))}<g class="rider${newest === 'unicorn' ? ' climb-on' : ''}" transform="translate(52 56) scale(.62)">${figure}</g>`
    : `<g class="stander">${figure}</g>`;
  return `<svg viewBox="0 0 320 310" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${DEFS}
    ${has.has('fireworks') ? layer('fireworks', newest, fireworks()) : ''}
    ${has.has('rainbow') ? layer('rainbow', newest, rainbow()) : ''}
    ${has.has('castle') ? layer('castle', newest, riding ? `<g transform="translate(40 60) scale(.75)" opacity=".85">${castle()}</g>` : castle()) : ''}
    ${placed}
    ${has.has('kitten') ? layer('kitten', newest, kitten()) : ''}
    ${has.has('butterflies') ? layer('butterflies', newest, butterflies()) : ''}
  </svg>`;
}

// Once she rides the unicorn, it trots along (except on the screen where it first arrives).
export function isRiding(count) {
  return count > ORDER.indexOf('unicorn');
}

export function princessScene(count, { newest = null, cls = '' } = {}) {
  return h('div', { class: `princess ${cls}`.trim(), html: princessSvg(count, newest) });
}

// A row of hearts: one per prize, filled when earned.
export function prizeTrack(count) {
  return h(
    'div',
    { class: 'prize-track', 'aria-hidden': 'true' },
    PRIZES.map((p, i) => h('span', { class: `prize-dot${i < count ? ' got' : ''}${i === count - 1 ? ' latest' : ''}` })),
  );
}
