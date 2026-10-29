// Tiny DOM helpers and inline SVG icons (no framework).

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Hebrew text: always marked as Hebrew, right-to-left, in the niqqud-friendly font.
export function heb(text, cls = '') {
  return h('span', { class: `heb ${cls}`.trim(), lang: 'he', dir: 'rtl' }, text);
}

export function icon(name, cls = '') {
  const span = h('span', { class: `icon ${cls}`.trim(), 'aria-hidden': 'true' });
  span.innerHTML = ICONS[name] || '';
  return span;
}

const svg = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const ICONS = {
  play: svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/>'),
  speaker: svg('<path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.4 3.7a1 1 0 0 0 1.6-.8V5.6a1 1 0 0 0-1.6-.8L8 8.5H5a1 1 0 0 0-1 1z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  home: svg('<path d="M3.5 11.2 12 4l8.5 7.2M6 9.5V20h4.5v-5.5h3V20H18V9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/>'),
  next: svg('<path d="M5 12h13M12.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  replay: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 3.5v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  star: svg('<path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
  grownup: svg('<circle cx="8.5" cy="6" r="3" fill="currentColor"/><path d="M3.5 21v-6a5 5 0 0 1 10 0v6z" fill="currentColor"/><circle cx="17.5" cy="11" r="2.2" fill="currentColor"/><path d="M14.5 21v-3.5a3 3 0 0 1 6 0V21z" fill="currentColor"/>'),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  hand: svg('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10l.1-1.2a1.5 1.5 0 0 1 3 .2V11a1.5 1.5 0 0 1 3 0v4.5a5.5 5.5 0 0 1-5.5 5.5h-1a5.5 5.5 0 0 1-4.6-2.5L4.6 14.4a1.6 1.6 0 0 1 2.6-1.8L9 14.5z" fill="currentColor"/>'),
  vowels: svg('<circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2 2.2"/><rect x="7.5" y="17" width="9" height="2.4" rx="1.2" fill="currentColor"/>'),
  letters: svg('<text x="12" y="17" text-anchor="middle" font-size="15" font-family="serif" fill="currentColor">א</text><circle cx="12" cy="21.2" r="1.4" fill="currentColor"/>'),
};
