import { el } from '../util.js';
import { t } from '../i18n.js';
import { wobble } from './common.js';
import { sfx } from '../audio.js';

export default {
  id: 'word-builder',
  mount(root, ch, api) {
    const slots = Array(ch.word.length).fill(null); // tile index in each slot
    const slotEls = ch.word.split('').map((_, i) => el('button', { class: 'slot', type: 'button', 'aria-label': t('games.slot', { n: i + 1 }), onclick: () => remove(i) }));
    const tileEls = ch.letters.map((l, i) => el('button', { class: 'tile letter', type: 'button', onclick: () => place(i) }, l));
    root.append(el('div', { class: 'wb-emoji', role: 'img', 'aria-label': ch.emoji, text: ch.emoji }),
      el('div', { class: 'slots' }, slotEls), el('div', { class: 'tiles' }, tileEls));
    let locked = false;

    function render() {
      slotEls.forEach((s, i) => { s.textContent = slots[i] == null ? '' : ch.letters[slots[i]]; s.classList.toggle('filled', slots[i] != null); s.classList.remove('bad'); });
      tileEls.forEach((b, i) => { b.disabled = slots.includes(i); b.classList.toggle('used', slots.includes(i)); });
    }
    function place(i) {
      if (locked) return;
      const at = slots.indexOf(null); if (at < 0) return;
      slots[at] = i; sfx('tap'); render();
      if (!slots.includes(null)) check();
    }
    function remove(at) { if (locked || slots[at] == null) return; slots[at] = null; render(); }
    function check() {
      const guess = slots.map((i) => ch.letters[i]).join('');
      if (guess === ch.word) { locked = true; slotEls.forEach((s) => s.classList.add('ok')); tileEls.forEach((b) => { b.disabled = true; }); api.correct(); return; }
      locked = true; slotEls.forEach((s) => s.classList.add('bad')); wobble(root.querySelector('.slots')); api.wrong();
      setTimeout(() => { slots.fill(null); locked = false; render(); }, 700);
    }
    return {
      hint() {
        if (locked) return ch.hint;
        // Fix wrong letters from the left, then place the next correct one.
        for (let i = 0; i < slots.length; i++) {
          if (slots[i] != null && ch.letters[slots[i]] !== ch.word[i]) { slots[i] = null; break; }
        }
        const at = slots.indexOf(null);
        if (at >= 0) {
          const ti = ch.letters.findIndex((l, k) => l === ch.word[at] && !slots.includes(k));
          if (ti >= 0) { slots[at] = ti; render(); slotEls[at].classList.add('hinted'); if (!slots.includes(null)) check(); }
        }
        return ch.hint;
      },
      destroy() {},
    };
  },
};
