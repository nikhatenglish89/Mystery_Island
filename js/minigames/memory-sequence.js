import { el, sleep } from '../util.js';
import { t } from '../i18n.js';
import { pad, sfx } from '../audio.js';

export default {
  id: 'memory-sequence',
  mount(root, ch, api) {
    let alive = true, accepting = false, pos = 0, playing = false;
    const status = el('p', { class: 'mem-status', 'aria-live': 'polite' });
    const pads = ch.palette.map((emoji, i) => el('button', { class: 'pad', type: 'button', 'aria-label': emoji, onclick: () => tap(i) }, emoji));
    root.append(status, el('div', { class: 'pads pads-' + pads.length }, pads),
      el('div', { class: 'mem-dots' }, ch.sequence.map(() => el('span', { class: 'dot' }))));
    const dots = root.querySelectorAll('.mem-dots .dot');

    async function flash(i) { pads[i].classList.add('lit'); pad(i); await sleep(520); pads[i].classList.remove('lit'); await sleep(180); }
    async function play() {
      if (playing) return; playing = true; accepting = false; pos = 0; dots.forEach((d) => d.classList.remove('done'));
      status.textContent = t('games.watch');
      pads.forEach((p) => { p.disabled = true; });
      await sleep(500);
      for (const i of ch.sequence) { if (!alive) return; await flash(i); }
      if (!alive) return;
      status.textContent = t('games.yourTurn'); pads.forEach((p) => { p.disabled = false; }); accepting = true; playing = false;
    }
    function tap(i) {
      if (!accepting) return;
      pads[i].classList.add('lit'); setTimeout(() => pads[i].classList.remove('lit'), 250); pad(i);
      if (i === ch.sequence[pos]) {
        dots[pos].classList.add('done'); pos += 1;
        if (pos === ch.sequence.length) { accepting = false; pads.forEach((p) => { p.disabled = true; }); api.correct(); }
      } else {
        accepting = false; api.wrong(); sfx('wrong');
        status.textContent = t('games.watchAgain'); setTimeout(() => { if (alive) play(); }, 900);
      }
    }
    play();
    return {
      hint() { if (!playing) play(); return ch.hint; },
      destroy() { alive = false; },
    };
  },
};
