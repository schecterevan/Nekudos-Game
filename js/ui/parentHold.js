// Press-and-hold entry to the parent area, so a child tapping around never lands there.
import { h, icon } from './dom.js';

export const HOLD_MS = 2000;

export function parentHoldButton(app) {
  let timer = null;
  const btn = h('button', { class: 'parent-hold', 'aria-label': 'Parent area: press and hold' }, icon('lock'), h('span', { class: 'hold-ring' }));
  const start = (e) => {
    e.preventDefault();
    if (timer) return;
    btn.classList.add('holding');
    timer = setTimeout(() => {
      timer = null;
      btn.classList.remove('holding');
      app.openParent();
    }, HOLD_MS);
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
    btn.classList.remove('holding');
  };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && start(e));
  btn.addEventListener('keyup', cancel);
  return btn;
}
