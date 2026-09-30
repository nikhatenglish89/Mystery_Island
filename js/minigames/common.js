import { el } from '../util.js';
import { t } from '../i18n.js';
import { sfx } from '../audio.js';

// Multiple choice board shared by Number Challenge, Pattern Puzzle and Science Choice.
export function choiceBoard(root, ch, api, { big = false } = {}) {
  const buttons = [];
  if (ch.sequence) {
    root.append(el('div', { class: 'seq-row', role: 'img', 'aria-label': ch.sequence.map((s) => (s === '?' ? t('games.missing') : s)).join(', ') },
      ch.sequence.map((s) => el('span', { class: 'seq-cell' + (s === '?' ? ' seq-missing' : ''), text: s === '?' ? '?' : s }))));
  }
  if (ch.visual) {
    root.append(el('div', { class: 'visual-grid', role: 'img', 'aria-label': `${ch.visual.n} ${ch.visual.emoji}` },
      Array.from({ length: ch.visual.n }, () => el('span', { class: 'visual-item', text: ch.visual.emoji }))));
  }
  if (ch.map) root.append(mapGrid(ch.map));
  const grid = el('div', { class: 'choices' + (big ? ' choices-big' : '') + (ch.choices.length > 4 ? ' choices-5' : '') });
  ch.choices.forEach((c, i) => {
    const b = el('button', { class: 'choice', type: 'button', onclick: () => {
      if (b.disabled) return;
      if (i === ch.answer) {
        b.classList.add('ok'); buttons.forEach((x) => { x.disabled = true; }); api.correct();
      } else { b.classList.add('bad'); b.disabled = true; api.wrong(); }
    } }, c);
    buttons.push(b); grid.append(b);
  });
  root.append(grid);
  return {
    hint() {
      const wrongLeft = buttons.filter((b, i) => i !== ch.answer && !b.disabled);
      if (wrongLeft.length > 1) { wrongLeft[0].disabled = true; wrongLeft[0].classList.add('dim'); }
      return ch.hint;
    },
    destroy() {},
  };
}

// A small labelled grid used for "which direction is X from Y" questions.
export function mapGrid(map) {
  const g = el('div', { class: 'mini-map', style: { gridTemplateColumns: `repeat(${map.w}, 1fr)` }, role: 'img', 'aria-label': t('games.mapAria') });
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const c = map.cells.find((m) => m.x === x && m.y === y);
    g.append(el('span', { class: 'mini-cell', text: c ? c.emoji : '' }));
  }
  return el('div', { class: 'map-wrap' }, el('span', { class: 'rose', 'aria-hidden': 'true', text: t('games.roseN') }), g);
}

export function wobble(node) { node.classList.remove('wobble'); void node.offsetWidth; node.classList.add('wobble'); sfx('wrong'); }
