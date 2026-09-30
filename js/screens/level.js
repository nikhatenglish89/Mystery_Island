import { el, sleep } from '../util.js';
import { t, kiki } from '../i18n.js';
import { S } from '../state.js';
import { button, hud, kikiBubble, backBar, toast, confirmDialog, starRow } from '../ui.js';
import { go, onLeave } from '../router.js';
import { levelById, worldOfLevel, completeLevel, nextLevelAfter, isLevelUnlocked, starsFor } from '../rewards.js';
import { saveCheckpoint, clearCheckpoint } from '../player.js';
import { ENGINES } from '../minigames/index.js';
import { sfx, speak, stopVoice } from '../audio.js';
import { track } from '../analytics.js';

const PROPS = {
  pb: ['🐚', '⛵', '🌴', '🦀', '🪸'], mj: ['🌿', '🐒', '🦜', '🍄', '🌺'], cc: ['🪨', '🦇', '🔦', '🍄', '🕸️'],
  at: ['🗿', '🏺', '🐍', '🪔', '🧱'], ti: ['🌴', '⚓', '🐚', '🦜', '🧭'],
};

export async function levelIntro({ levelId }) {
  const l = levelById(levelId); const w = worldOfLevel(levelId);
  if (!isLevelUnlocked(levelId)) return go('map');
  const info = t('engines.' + l.engine + '.how');
  return el('div', { class: 'page level-intro', dataset: { world: w.id } },
    hud(), backBar(w.name, () => go('world', { worldId: w.id })),
    el('h1', { text: `${t('screens.world.levelN', { n: l.index })}: ${l.title}` }),
    el('div', { class: 'intro-clue', 'aria-hidden': 'true', text: l.clue }),
    kikiBubble(l.intro, { speakIt: true, key: 'intro_' + l.id }),
    el('p', { class: 'how', text: t('screens.intro.how', { how: info }) }),
    el('p', { class: 'small', text: t('screens.intro.best') }, ' ', starRow(starsFor(l.id))),
    button(t('common.start'), () => go('explore', { levelId }), 'btn-primary btn-xl'));
}

export async function explore({ levelId }) {
  const l = levelById(levelId); const w = worldOfLevel(levelId);
  stopVoice();
  const props = PROPS[w.id];
  const spots = [[16, 30], [78, 22], [24, 70], [70, 66], [48, 44]];
  const target = 4;
  const say = el('div', { class: 'explore-say' }, kikiBubble(t('screens.explore.find'), { speakIt: true, key: 'explore_find' }));
  const items = spots.map(([x, y], i) => {
    const isTarget = i === target;
    return el('button', {
      class: 'prop' + (isTarget ? ' glow' : ''), type: 'button', style: { left: x + '%', top: y + '%' },
      'aria-label': isTarget ? t('screens.explore.clueAria') : t('screens.explore.propAria'),
      onclick: async (e) => {
        if (!isTarget) { sfx('tap'); e.currentTarget.classList.add('wiggle'); say.replaceChildren(kikiBubble(kiki('exploreTap'))); setTimeout(() => e.currentTarget.classList.remove('wiggle'), 600); return; }
        sfx('star'); e.currentTarget.classList.add('discovered'); say.replaceChildren(kikiBubble(t('screens.explore.found')));
        await sleep(900); go('play', { levelId, round: 0, wrong: 0, hints: 0, seconds: 0 });
      },
    }, isTarget ? l.clue : props[i]);
  });
  return el('div', { class: 'page explore', dataset: { world: w.id } }, backBar(t('common.back'), () => go('levelIntro', { levelId })), el('h1', { text: l.title }), say, el('div', { class: 'explore-scene' }, items));
}

export async function play({ levelId, round = 0, wrong = 0, hints = 0, seconds = 0 }) {
  const l = levelById(levelId); const w = worldOfLevel(levelId);
  const band = S.profile.band;
  const challenges = S.data.questions.levels[levelId][band];
  const engine = ENGINES[l.engine];
  if (round >= challenges.length) { round = 0; wrong = 0; hints = 0; seconds = 0; } // ignore a stale checkpoint
  let state = { round, wrong, hints, seconds }; let roundStart = Date.now(); let instance = null; let answered = false;
  if (round === 0 && wrong === 0 && hints === 0) track('level_start', { level: levelId, world: w.id, band, engine: l.engine });

  const dots = el('div', { class: 'round-dots', 'aria-label': t('screens.play.round', { n: round + 1, total: challenges.length }) });
  const promptBox = el('div', { class: 'prompt-box' });
  const stage = el('div', { class: 'stage' });
  const notice = el('div', { class: 'notice', 'aria-live': 'polite' });
  const feedback = el('div', { class: 'feedback hidden', 'aria-live': 'polite' });
  const hintBtn = el('button', { class: 'btn btn-hint', type: 'button', onclick: useHint, text: '💡 ' + t('screens.play.hint') });
  const exitBtn = el('button', { class: 'btn btn-ghost', type: 'button', onclick: exit, text: '✕ ' + t('screens.play.exit') });
  onLeave(() => { instance?.destroy?.(); stopVoice(); });

  function paintDots() {
    dots.replaceChildren(...challenges.map((_, i) => el('span', { class: 'rdot' + (i < state.round ? ' done' : i === state.round ? ' now' : '') })));
    dots.setAttribute('aria-label', t('screens.play.round', { n: state.round + 1, total: challenges.length }));
  }
  async function exit() {
    const ok = await confirmDialog({ title: t('screens.play.exitTitle'), body: t('screens.play.exitBody'), confirm: t('screens.play.exitYes'), cancel: t('screens.play.exitNo'), danger: true });
    if (!ok) return;
    await clearCheckpoint(); go('world', { worldId: w.id });
  }
  function useHint() {
    if (answered || !instance) return;
    state.hints += 1; sfx('tap');
    const text = instance.hint?.();
    notice.replaceChildren(kikiBubble(text || kiki('hint'), { speakIt: true, key: '' }));
  }
  const api = {
    correct() {
      if (answered) return; answered = true; sfx('correct'); hintBtn.disabled = true; notice.replaceChildren();
      state.seconds += Math.min((Date.now() - roundStart) / 1000, 300);
      const last = state.round === challenges.length - 1;
      feedback.classList.remove('hidden');
      feedback.replaceChildren(kikiBubble(kiki('correct'), { speakIt: true, key: '' }), button(last ? t('screens.play.finish') : t('common.next'), next, 'btn-primary btn-xl'));
      feedback.querySelector('.btn')?.focus();
    },
    wrong() {
      if (answered) return; state.wrong += 1; sfx('wrong');
      notice.replaceChildren(kikiBubble(kiki('retry')));
    },
  };
  async function next() {
    if (state.round < challenges.length - 1) {
      state.round += 1; await saveCheckpoint({ levelId, ...state }); startRound();
    } else {
      instance?.destroy?.(); await clearCheckpoint();
      const result = await completeLevel(levelId, { wrong: state.wrong, hints: state.hints, seconds: state.seconds, engine: l.engine });
      track('level_complete', { level: levelId, world: w.id, band, engine: l.engine, stars: result.stars });
      if (result.worldCompleted) track('world_complete', { world: w.id, band });
      go('reward', { levelId, result });
    }
  }
  function startRound() {
    instance?.destroy?.(); answered = false; roundStart = Date.now();
    hintBtn.disabled = false; feedback.classList.add('hidden'); feedback.replaceChildren(); notice.replaceChildren(); stage.replaceChildren();
    paintDots();
    const ch = challenges[state.round];
    const readBtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.readAloud'), onclick: () => speak(`q_${levelId}_${band}_${state.round + 1}`, ch.prompt, { force: true }), text: '🔊' });
    promptBox.replaceChildren(el('h2', { class: 'prompt', text: ch.prompt }), readBtn);
    instance = engine.mount(stage, ch, api, { band });
    speak(`q_${levelId}_${band}_${state.round + 1}`, ch.prompt);
  }
  startRound();
  await saveCheckpoint({ levelId, ...state });
  return el('div', { class: 'page play', dataset: { world: w.id } },
    el('div', { class: 'topbar' }, exitBtn, el('span', { class: 'play-title', text: l.title }), hintBtn),
    dots, promptBox, stage, notice, feedback);
}

export async function reward({ levelId, result }) {
  const l = levelById(levelId); const w = worldOfLevel(levelId); const next = nextLevelAfter(levelId);
  const starsEl = el('div', { class: 'reward-stars', 'aria-label': t('common.starsOf', { n: result.stars, max: 3 }) },
    [0, 1, 2].map((i) => el('span', { class: 'rstar', text: '☆' })));
  (async () => {
    sfx('win');
    for (let i = 0; i < result.stars; i++) { await sleep(450); const s = starsEl.children[i]; if (!s) return; s.textContent = '⭐'; s.classList.add('on'); sfx('star'); }
    await sleep(300); sfx('coin');
  })();
  const line = kiki(result.worldCompleted ? 'worldComplete' : 'levelComplete');
  speak('', line);
  const lines = [
    el('li', {}, '🪙 ', t('screens.reward.coins', { n: result.coins })),
    result.gems ? el('li', {}, '💎 ', t('screens.reward.gems', { n: result.gems })) : null,
    result.replay ? el('li', { class: 'small', text: t('screens.reward.replay') }) : null,
  ];
  const wrap = el('div', { class: 'page reward', dataset: { world: w.id } },
    hud(), el('h1', { text: t('screens.reward.title') }), el('p', { class: 'lead', text: l.title }), starsEl,
    kikiBubble(line), el('ul', { class: 'reward-list' }, lines));
  if (result.worldCompleted) {
    wrap.append(el('div', { class: 'banner banner-win' }, el('b', { text: t('screens.reward.worldDone', { world: w.name }) }),
      result.mapPiece ? el('p', { text: '🧩 ' + t('screens.reward.mapPiece', { piece: result.mapPiece }) }) : null,
      result.unlockedWorld ? el('p', { text: '🔓 ' + t('screens.reward.unlocked', { world: result.unlockedWorld.name }) }) : null));
  }
  if (result.achievements.length) {
    wrap.append(el('div', { class: 'ach-new' }, el('h2', { text: t('screens.reward.newAch') }),
      el('ul', {}, result.achievements.map((a) => el('li', {}, `${a.emoji} `, el('b', { text: a.name }), ` — ${a.description}` + (a.gems ? ` (+${a.gems} 💎)` : ''))))));
  }
  const actions = el('div', { class: 'row' });
  if (result.gameComplete) actions.append(button(t('screens.reward.toTreasure'), () => go('ending'), 'btn-primary btn-xl'));
  else if (next) actions.append(button(t('screens.reward.nextLevel'), () => go('levelIntro', { levelId: next.id }), 'btn-primary btn-xl'));
  else actions.append(button(t('common.map'), () => go('map'), 'btn-primary btn-xl'));
  if (result.stars < 3) actions.append(button(t('screens.reward.replayBtn'), () => go('levelIntro', { levelId }), 'btn-ghost'));
  actions.append(button(t('common.map'), () => go('map'), 'btn-ghost'));
  wrap.append(actions);
  return wrap;
}

export async function ending() {
  const line = kiki('gameComplete'); speak('kiki_ending', line); sfx('win');
  return el('div', { class: 'page center ending' },
    el('div', { class: 'chest', 'aria-hidden': 'true', text: '💰' }), el('h1', { text: t('screens.ending.title') }),
    kikiBubble(line), el('p', { text: t('screens.ending.body') }), button(t('common.map'), () => go('map'), 'btn-primary btn-xl'));
}
