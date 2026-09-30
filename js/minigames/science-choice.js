import { el, shuffle } from '../util.js';
import { t } from '../i18n.js';
import { choiceBoard, wobble } from './common.js';
import { sfx } from '../audio.js';

export default {
  id: 'science-choice',
  mount(root, ch, api) {
    if (ch.type !== 'order') return choiceBoard(root, ch, api);
    // Order type: tap the items in the correct order.
    let next = 0;
    const slots = el('ol', { class: 'order-slots', 'aria-label': t('games.orderSlots') },
      ch.items.map((_, i) => el('li', { class: 'order-slot', 'data-n': i + 1 })));
    let deck = shuffle(ch.items.map((text, i) => ({ text, i })));
    if (deck.every((d, k) => d.i === k)) deck = deck.reverse();
    const tiles = deck.map((d) => {
      const b = el('button', { class: 'tile', type: 'button', onclick: () => {
        if (b.disabled) return;
        if (d.i === next) {
          slots.children[next].textContent = d.text; slots.children[next].classList.add('filled');
          b.disabled = true; b.classList.add('used'); next += 1; sfx('found');
          if (next === ch.items.length) api.correct();
        } else { wobble(b); api.wrong(); }
      } }, d.text);
      b.dataset.i = d.i; return b;
    });
    root.append(slots, el('div', { class: 'tiles' }, tiles));
    return {
      hint() {
        const target = tiles.find((b) => Number(b.dataset.i) === next);
        if (target) { target.classList.add('pulse'); setTimeout(() => target.classList.remove('pulse'), 2500); }
        return ch.hint;
      },
      destroy() {},
    };
  },
};
