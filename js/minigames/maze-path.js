import { el, mulberry32, shuffle } from '../util.js';
import { t } from '../i18n.js';
import { sfx } from '../audio.js';
import { wobble } from './common.js';

const DIRV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const OPP = { N: 'S', E: 'W', S: 'N', W: 'E' };
const NAMES = { North: 'N', East: 'E', South: 'S', West: 'W' };

function buildMaze(w, h, rng) {
  const cells = Array.from({ length: w * h }, () => ({ N: true, E: true, S: true, W: true }));
  const seen = new Set([0]); const stack = [0];
  while (stack.length) {
    const cur = stack[stack.length - 1]; const x = cur % w, y = Math.floor(cur / w);
    const opts = shuffle(Object.keys(DIRV), rng).filter((d) => {
      const nx = x + DIRV[d][0], ny = y + DIRV[d][1];
      return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen.has(ny * w + nx);
    });
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[0]; const n = (y + DIRV[d][1]) * w + (x + DIRV[d][0]);
    cells[cur][d] = false; cells[n][OPP[d]] = false; seen.add(n); stack.push(n);
  }
  return cells;
}
function bfs(cells, w, h, from, to) {
  const prev = new Map([[from, null]]); const q = [from];
  while (q.length) {
    const c = q.shift(); if (c === to) break;
    const x = c % w, y = Math.floor(c / w);
    for (const d of Object.keys(DIRV)) {
      if (cells[c][d]) continue;
      const n = (y + DIRV[d][1]) * w + (x + DIRV[d][0]);
      if (!prev.has(n)) { prev.set(n, c); q.push(n); }
    }
  }
  const path = []; for (let c = to; c != null; c = prev.get(c)) path.unshift(c);
  return path;
}

export default {
  id: 'maze-path',
  mount(root, ch, api) {
    return ch.mode === 'compass' ? compassMode(root, ch, api) : mazeMode(root, ch, api);
  },
};

function mazeMode(root, ch, api) {
  const { w, h } = ch; const rng = mulberry32(ch.seed);
  const cells = buildMaze(w, h, rng);
  // Put the goal in the cell furthest from the start.
  let goal = w * h - 1, best = -1;
  for (let i = 1; i < w * h; i++) { const d = bfs(cells, w, h, 0, i).length; if (d > best) { best = d; goal = i; } }
  let pos = 0; let done = false;
  const grid = el('div', { class: 'maze', style: { gridTemplateColumns: `repeat(${w}, 1fr)`, '--n': w }, role: 'application', 'aria-label': t('games.mazeAria'), tabindex: '0' });
  const nodes = cells.map((c, i) => {
    const n = el('button', { class: 'maze-cell', type: 'button', tabindex: '-1', 'aria-label': t('games.mazeCell'), onclick: () => tapCell(i) });
    for (const d of Object.keys(DIRV)) if (c[d]) n.classList.add('w' + d);
    return n;
  });
  grid.append(...nodes);
  const player = el('span', { class: 'maze-player', 'aria-hidden': 'true', text: ch.player });
  nodes[goal].append(el('span', { class: 'maze-goal', 'aria-hidden': 'true', text: ch.goal }));
  nodes[0].append(player);

  function move(d) {
    if (done) return;
    if (cells[pos][d]) { sfx('bump'); grid.classList.remove('wobble'); void grid.offsetWidth; grid.classList.add('wobble'); return; }
    const x = pos % w, y = Math.floor(pos / w);
    pos = (y + DIRV[d][1]) * w + (x + DIRV[d][0]);
    nodes[pos].append(player); sfx('tap');
    nodes.forEach((n) => n.classList.remove('hintcell'));
    if (pos === goal) { done = true; api.correct(); }
  }
  function tapCell(i) {
    const x = pos % w, y = Math.floor(pos / w), tx = i % w, ty = Math.floor(i / w);
    const dx = tx - x, dy = ty - y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return;
    move(dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N');
  }
  const onKey = (e) => {
    const m = { ArrowUp: 'N', ArrowDown: 'S', ArrowLeft: 'W', ArrowRight: 'E' }[e.key];
    if (m) { e.preventDefault(); move(m); }
  };
  document.addEventListener('keydown', onKey);
  const dpad = el('div', { class: 'dpad', role: 'group', 'aria-label': t('games.dpad') },
    ...[['N', '▲', 'up'], ['W', '◀', 'left'], ['E', '▶', 'right'], ['S', '▼', 'down']].map(([d, s, c]) =>
      el('button', { class: 'btn dpad-' + c, type: 'button', 'aria-label': d, onclick: () => move(d), text: s })));
  root.append(el('div', { class: 'maze-wrap' }, grid), dpad);
  return {
    hint() {
      const path = bfs(cells, w, h, pos, goal).slice(1, 5);
      nodes.forEach((n) => n.classList.remove('hintcell'));
      path.forEach((c) => nodes[c].classList.add('hintcell'));
      return ch.hint;
    },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}

function compassMode(root, ch, api) {
  const { w, h } = ch; let done = false;
  const grid = el('div', { class: 'compass-grid', style: { gridTemplateColumns: `repeat(${w}, 1fr)` }, role: 'group', 'aria-label': t('games.compassAria') });
  const nodes = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const mark = ch.landmarks.find((m) => m.x === x && m.y === y);
    const isStart = x === ch.start[0] && y === ch.start[1];
    const n = el('button', { class: 'ccell' + (isStart ? ' start' : ''), type: 'button', 'aria-label': t('games.cellAria', { x: x + 1, y: y + 1 }), onclick: () => {
      if (done || n.disabled) return;
      if (x === ch.target[0] && y === ch.target[1]) { done = true; n.classList.add('ok'); n.append(el('span', { text: '🏁' })); api.correct(); }
      else { n.disabled = true; n.classList.add('bad'); wobble(n); api.wrong(); }
    } }, isStart ? ch.player : mark ? mark.emoji : '');
    nodes.push(n);
  }
  grid.append(...nodes);
  const rose = el('div', { class: 'compass-rose', 'aria-hidden': 'true' },
    el('span', { class: 'cr-n', text: t('games.roseFullN') }), el('span', { class: 'cr-w', text: 'W' }), el('span', { class: 'cr-c', text: '🧭' }),
    el('span', { class: 'cr-e', text: 'E' }), el('span', { class: 'cr-s', text: 'S' }));
  root.append(el('div', { class: 'compass-wrap' }, rose, grid));
  return {
    hint() {
      // Light up the walk, one leg at a time.
      let [x, y] = ch.start; const path = [];
      for (const s of ch.steps) { const d = DIRV[NAMES[s.dir]]; for (let k = 0; k < s.n; k++) { x += d[0]; y += d[1]; path.push(y * w + x); } }
      path.slice(0, -1).forEach((i, k) => setTimeout(() => nodes[i].classList.add('trail'), k * 250));
      setTimeout(() => nodes.forEach((n) => n.classList.remove('trail')), path.length * 250 + 2200);
      return ch.hint;
    },
    destroy() {},
  };
}
