import { el, mulberry32, shuffle } from '../util.js';
import { t } from '../i18n.js';
import { sfx } from '../audio.js';
import { wobble } from './common.js';

export default {
  id: 'spot-difference',
  mount(root, ch, api) {
    const rng = mulberry32(ch.seed);
    const total = ch.rows * ch.cols;
    const a = Array.from({ length: total }, () => ch.pool[Math.floor(rng() * ch.pool.length)]);
    const b = a.slice();
    const diffIdx = shuffle(Array.from({ length: total }, (_, i) => i), rng).slice(0, ch.diffs);
    for (const i of diffIdx) {
      const others = ch.pool.filter((p) => p !== a[i]);
      b[i] = others[Math.floor(rng() * others.length)];
    }
    let found = 0;
    const counter = el('p', { class: 'hunt-count', 'aria-live': 'polite' });
    const style = { gridTemplateColumns: `repeat(${ch.cols}, 1fr)` };
    const left = el('div', { class: 'spot-grid', style, role: 'img', 'aria-label': t('games.pictureOne') }, a.map((e) => el('span', { class: 'spot-cell', text: e })));
    const cells = b.map((e, i) => {
      const c = el('button', { class: 'spot-cell', type: 'button', 'aria-label': e, onclick: () => {
        if (c.disabled) return;
        if (diffIdx.includes(i)) {
          found += 1; c.disabled = true; c.classList.remove('pulse'); c.classList.add('circled'); left.children[i].classList.add('circled'); sfx('found'); update();
          if (found === ch.diffs) api.correct();
        } else { wobble(c); api.wrong(); }
      } }, e);
      return c;
    });
    const right = el('div', { class: 'spot-grid tappable', style }, cells);
    function update() { counter.textContent = t('games.differencesFound', { n: found, total: ch.diffs }); }
    update();
    root.append(counter, el('div', { class: 'spot-pair' },
      el('div', {}, el('p', { class: 'small', text: t('games.pictureOne') }), left),
      el('div', {}, el('p', { class: 'small', text: t('games.pictureTwo') }), right)));
    return {
      hint() {
        const i = diffIdx.find((k) => !cells[k].disabled);
        if (i != null) { cells[i].classList.add('pulse'); setTimeout(() => cells[i].classList.remove('pulse'), 2500); }
        return ch.hint;
      },
      destroy() {},
    };
  },
};
