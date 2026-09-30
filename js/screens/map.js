import { el } from '../util.js';
import { t, kiki } from '../i18n.js';
import { S } from '../state.js';
import { button, hud, starRow, kikiBubble, toast, backBar, storageBanner } from '../ui.js';
import { go } from '../router.js';
import { worlds, isWorldUnlocked, worldDoneCount, recommendedLevel, isLevelUnlocked, isDone, starsFor, worldById } from '../rewards.js';
import { leaveProfile } from '../player.js';
import { status } from '../storage.js';
import { sfx } from '../audio.js';

// Positions (percent of the map board) of the five worlds along the winding path.
const POS = { pb: [26, 86], mj: [74, 70], cc: [26, 54], at: [72, 38], ti: [46, 16] };
const SVGNS = 'http://www.w3.org/2000/svg';

export async function treasureMap() {
  const ws = worlds(); const rec = recommendedLevel();
  const pathPts = ws.map((w) => POS[w.id].join(',')).join(' ');
  const nodes = ws.map((w) => {
    const unlocked = isWorldUnlocked(w.id); const done = worldDoneCount(w); const complete = done === w.levels.length;
    const [x, y] = POS[w.id];
    return el('button', {
      class: 'world-node' + (unlocked ? '' : ' locked') + (complete ? ' complete' : '') + (rec?.world.id === w.id ? ' next' : ''),
      type: 'button', style: { left: x + '%', top: y + '%', '--wc': w.color },
      'aria-label': `${w.name}. ${unlocked ? t('screens.map.progress', { done, total: w.levels.length }) : t('screens.map.locked')}`,
      onclick: () => {
        if (!unlocked) { sfx('wrong'); return toast(w.id === 'ti' ? t('screens.map.lockedFinal') : t('screens.map.lockedHint', { prev: ws[ws.findIndex((k) => k.id === w.id) - 1].name })); }
        go('world', { worldId: w.id });
      },
    }, el('span', { class: 'wn-emoji', 'aria-hidden': 'true', text: unlocked ? w.emoji : '🔒' }), el('span', { class: 'wn-name', text: w.name }),
      el('span', { class: 'wn-prog', text: unlocked ? `${done}/${w.levels.length}` : '' }));
  });
  const pieces = ws.filter((w) => w.mapPiece).map((w) => el('span', { class: 'piece' + (S.progress.mapPieces.includes(w.id) ? ' got' : ''), title: w.mapPiece, text: S.progress.mapPieces.includes(w.id) ? '🧩' : '▫️' }));
  return el('div', { class: 'page map-page' },
    storageBanner(status),
    hud(),
    el('div', { class: 'map-head' }, el('h1', { text: t('screens.map.title') }), el('span', { class: 'pieces', 'aria-label': t('screens.map.pieces', { n: S.progress.mapPieces.length }) }, pieces)),
    rec ? el('div', { class: 'continue' }, kikiBubble(t('screens.map.next', { level: rec.level.title, world: rec.world.name })), button(t('screens.map.continue'), () => go('levelIntro', { levelId: rec.level.id }), 'btn-primary')) : kikiBubble(kiki('gameComplete')),
    el('div', { class: 'map-board' },
      (() => {
        const svg = document.createElementNS(SVGNS, 'svg');
        svg.setAttribute('class', 'map-path'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
        const line = document.createElementNS(SVGNS, 'polyline');
        line.setAttribute('points', pathPts); line.setAttribute('class', 'path-line'); svg.append(line); return svg;
      })(),
      nodes),
    el('nav', { class: 'bottom-nav', 'aria-label': t('screens.map.nav') },
      navBtn('⛺', t('screens.map.camp'), 'camp'), navBtn('🏅', t('screens.map.awards'), 'awards'),
      navBtn('⚙️', t('screens.map.settings'), 'settings'), navBtn('🔒', t('common.parentArea'), 'parentGate'),
      el('button', { class: 'nav-btn', type: 'button', onclick: () => { leaveProfile(); go('profiles'); } }, el('span', { 'aria-hidden': 'true', text: '👥' }), el('span', { text: t('screens.map.switch') }))));
}
const navBtn = (icon, label, screen) => el('button', { class: 'nav-btn', type: 'button', onclick: () => { sfx('tap'); go(screen); } }, el('span', { 'aria-hidden': 'true', text: icon }), el('span', { text: label }));

export async function worldDetail({ worldId }) {
  const w = worldById(worldId); const rec = recommendedLevel();
  const tiles = w.levels.map((l) => {
    const ok = isLevelUnlocked(l.id); const done = isDone(l.id); const isNext = rec?.level.id === l.id;
    return el('button', {
      class: 'level-tile' + (ok ? '' : ' locked') + (done ? ' done' : '') + (isNext ? ' next' : ''), type: 'button', disabled: !ok,
      'aria-label': `${t('screens.world.levelN', { n: l.index })}: ${l.title}. ${ok ? (done ? t('common.starsOf', { n: starsFor(l.id), max: 3 }) : t('screens.world.ready')) : t('screens.map.locked')}`,
      onclick: () => go('levelIntro', { levelId: l.id }),
    }, el('span', { class: 'lt-num', text: ok ? l.index : '🔒' }), el('span', { class: 'lt-clue', 'aria-hidden': 'true', text: ok ? l.clue : '' }), el('span', { class: 'lt-title', text: l.title }), ok ? starRow(starsFor(l.id)) : null);
  });
  return el('div', { class: 'page world-page', dataset: { world: w.id } },
    hud(), backBar(t('common.map'), () => go('map')),
    el('div', { class: 'world-head', style: { '--wc': w.color } }, el('span', { class: 'wh-emoji', 'aria-hidden': 'true', text: w.emoji }),
      el('div', {}, el('h1', { text: w.name }), el('p', { text: w.description }), el('p', { class: 'small', text: t('screens.world.learning', { learning: w.learning }) }))),
    el('div', { class: 'level-grid' }, tiles));
}
