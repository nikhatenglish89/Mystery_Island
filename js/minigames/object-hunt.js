import { el, mulberry32, shuffle } from '../util.js';
import { t } from '../i18n.js';
import { sfx } from '../audio.js';
import { wobble } from './common.js';

export default {
  id: 'object-hunt',
  mount(root, ch, api) {
    const rng = mulberry32(ch.seed);
    const cols = 6, rows = 5;
    const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i), rng);
    const items = [];
    for (let i = 0; i < ch.count; i++) items.push({ e: ch.target, target: true });
    for (let i = 0; i < ch.decoyCount; i++) items.push({ e: ch.decoys[i % ch.decoys.length], target: false });
    let found = 0;
    const counter = el('p', { class: 'hunt-count', 'aria-live': 'polite' });
    const scene = el('div', { class: 'hunt-scene' });
    const nodes = items.map((it, k) => {
      const c = cells[k]; const cx = c % cols, cy = Math.floor(c / cols);
      const jx = (rng() - 0.5) * 0.24, jy = (rng() - 0.5) * 0.24;
      const b = el('button', { class: 'hunt-item', type: 'button', 'aria-label': it.e, style: {
        left: ((cx + 0.5 + jx) / cols * 100) + '%', top: ((cy + 0.5 + jy) / rows * 100) + '%', fontSize: `${(1.5 + rng() * 0.4).toFixed(2)}rem`,
      }, onclick: () => {
        if (b.disabled) return;
        if (it.target) {
          found += 1; b.disabled = true; b.classList.remove('pulse'); b.classList.add('got'); sfx('found'); update();
          if (found === ch.count) api.correct();
        } else { wobble(b); api.wrong(); }
      } }, it.e);
      scene.append(b); return { b, it };
    });
    function update() { counter.textContent = t('games.found', { n: found, total: ch.count }); }
    update();
    root.append(counter, scene);
    return {
      hint() {
        const n = nodes.find((x) => x.it.target && !x.b.disabled);
        if (n) { n.b.classList.add('pulse'); setTimeout(() => n.b.classList.remove('pulse'), 2500); }
        return ch.hint;
      },
      destroy() {},
    };
  },
};
