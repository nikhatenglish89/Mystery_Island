import { el, formatDuration, numberToWords } from '../util.js';
import { t, kiki } from '../i18n.js';
import { S } from '../state.js';
import { button, backBar, confirmDialog, toast, starRow, storageBanner } from '../ui.js';
import { go } from '../router.js';
import * as store from '../storage.js';
import { validProgress, validRewards, emptyProgress, emptyRewards, resetProfileProgress, removeProfile, eraseEverything, leaveProfile } from '../player.js';
import { analyticsAvailable } from '../analytics.js';

export async function parentGate() {
  const back = () => go(S.profile ? 'map' : 'profiles');
  const HOLD = 1500; let timer = null; let started = 0; let raf = 0;
  const ring = el('div', { class: 'hold-bar' }, el('span'));
  const box = el('div', { class: 'gate-box' });
  const holdBtn = el('button', { class: 'btn btn-primary btn-xl hold-btn', type: 'button', text: t('screens.gate.hold'), 'aria-describedby': 'gate-help' });
  const begin = () => {
    if (timer) return; started = performance.now();
    const tick = () => { ring.firstChild.style.width = Math.min(100, ((performance.now() - started) / HOLD) * 100) + '%'; raf = requestAnimationFrame(tick); };
    tick(); timer = setTimeout(() => { cancelAnimationFrame(raf); question(); }, HOLD);
  };
  const cancel = () => { clearTimeout(timer); timer = null; cancelAnimationFrame(raf); ring.firstChild.style.width = '0'; };
  holdBtn.addEventListener('pointerdown', begin); holdBtn.addEventListener('pointerup', cancel); holdBtn.addEventListener('pointerleave', cancel); holdBtn.addEventListener('pointercancel', cancel);
  holdBtn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); begin(); } });
  holdBtn.addEventListener('keyup', cancel);
  holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  function question() {
    const n = 100 + Math.floor(Math.random() * 900); const words = numberToWords(n);
    const input = el('input', { class: 'input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', 'aria-label': t('screens.gate.inputAria') });
    const err = el('p', { class: 'error', role: 'alert' });
    const check = () => { if (input.value.trim() === String(n)) go('dashboard'); else { err.textContent = t('screens.gate.wrong'); input.value = ''; question(); } };
    box.replaceChildren(el('p', { class: 'lead', text: t('screens.gate.ask', { words }) }), input, err, button(t('common.open'), check, 'btn-primary'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    input.focus();
  }
  box.append(holdBtn, ring, el('p', { id: 'gate-help', class: 'small', text: t('screens.gate.help') }));
  return el('div', { class: 'page center' }, backBar(t('common.back'), back), el('h1', { text: t('screens.gate.title') }), el('p', { text: kiki('parentNote') }), box);
}

async function loadFor(p) {
  const [progress, rewards] = await Promise.all([store.get('progress', p.id), store.get('rewards', p.id)]);
  const bad = (progress && !validProgress(progress)) || (rewards && !validRewards(rewards));
  return { bad, progress: bad ? emptyProgress(p.id) : progress || emptyProgress(p.id), rewards: bad ? emptyRewards(p.id) : rewards || emptyRewards(p.id) };
}

export async function dashboard() {
  const worlds = S.data.levels.worlds; const cards = [];
  const totalLevels = worlds.reduce((n, w) => n + w.levels.length, 0);
  for (const p of S.profiles) {
    const { bad, progress, rewards } = await loadFor(p);
    const done = Object.values(progress.levels).filter((l) => l.completed).length;
    const stars = Object.values(progress.levels).reduce((n, l) => n + (l.stars || 0), 0);
    const engRows = Object.entries(progress.stats.engines).map(([k, v]) => el('tr', {},
      el('td', { text: t(`engines.${k}.category`) }), el('td', { text: v.played }), el('td', { text: v.wrong }), el('td', { text: v.hints })));
    cards.push(el('section', { class: 'dash-card' },
      el('h2', { text: `${S.data.rewards.avatars.find((a) => a.id === p.avatar)?.emoji || ''} ${p.nickname}` }),
      el('p', { class: 'small', text: S.data.config.ageBands.find((b) => b.id === p.band)?.name }),
      bad ? el('p', { class: 'error', text: t('screens.dash.bad') }) : null,
      el('div', { class: 'dash-stats' },
        stat(t('screens.dash.levels'), `${done}/${totalLevels}`), stat(t('screens.dash.stars'), `${stars}/${totalLevels * 3}`), stat(t('screens.dash.coins'), rewards.coins), stat(t('screens.dash.gems'), rewards.gems),
        stat(t('screens.dash.time'), formatDuration(progress.stats.playSeconds)), stat(t('screens.dash.sessions'), progress.stats.sessions)),
      el('h3', { text: t('screens.dash.worlds') }),
      el('ul', { class: 'dash-worlds' }, worlds.map((w) => {
        const wd = w.levels.filter((l) => progress.levels[l.id]?.completed).length;
        return el('li', {}, el('span', { text: `${w.emoji} ${w.name}` }), el('span', { class: 'bar', role: 'progressbar', 'aria-valuenow': wd, 'aria-valuemax': w.levels.length, 'aria-label': w.name }, el('i', { style: { width: (wd / w.levels.length) * 100 + '%' } })), el('span', { text: `${wd}/${w.levels.length}` }));
      })),
      engRows.length ? el('table', { class: 'dash-table' }, el('thead', {}, el('tr', {}, ['screens.dash.category', 'screens.dash.played', 'screens.dash.wrong', 'screens.dash.hints'].map((k) => el('th', { scope: 'col', text: t(k) })))), el('tbody', {}, engRows)) : el('p', { class: 'small', text: t('screens.dash.noPlay') }),
      el('div', { class: 'row' },
        button(t('screens.dash.resetOne'), async () => {
          if (!(await confirmDialog({ title: t('screens.dash.resetOneTitle', { name: p.nickname }), body: t('screens.dash.resetOneBody'), confirm: t('screens.dash.resetOneYes'), danger: true }))) return;
          await resetProfileProgress(p.id); toast(t('screens.dash.done')); go('dashboard');
        }, 'btn-ghost'),
        button(t('screens.dash.remove'), async () => {
          if (!(await confirmDialog({ title: t('screens.dash.removeTitle', { name: p.nickname }), body: t('screens.dash.removeBody'), confirm: t('screens.dash.removeYes'), danger: true }))) return;
          await removeProfile(p.id); toast(t('screens.dash.done')); go('dashboard');
        }, 'btn-danger'))));
  }
  const analyticsOn = store.getSetting('analytics');
  const sw = el('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!analyticsOn), disabled: !analyticsAvailable(), text: analyticsOn && analyticsAvailable() ? t('common.on') : t('common.off'),
    onclick: () => { const v = !store.getSetting('analytics'); store.setSetting('analytics', v); sw.setAttribute('aria-checked', String(v)); sw.textContent = v ? t('common.on') : t('common.off'); } });
  return el('div', { class: 'page dash-page' },
    storageBanner(store.status),
    backBar(t('common.back'), () => go(S.profile ? 'map' : 'profiles')), el('h1', { text: t('screens.dash.title') }),
    el('p', { class: 'small', text: t('screens.dash.intro') }),
    cards.length ? cards : el('p', { text: t('screens.dash.none') }),
    el('section', { class: 'dash-card' }, el('h2', { text: t('screens.dash.settings') }),
      el('div', { class: 'setting-row' }, el('div', {}, el('b', { text: t('screens.dash.analytics') }), el('p', { class: 'small', text: analyticsAvailable() ? t('screens.dash.analyticsHelp') : t('screens.dash.analyticsOff') })), sw),
      button(t('screens.dash.eraseAll'), async () => {
        if (!(await confirmDialog({ title: t('screens.dash.eraseTitle'), body: t('screens.dash.eraseBody'), confirm: t('screens.dash.eraseYes'), danger: true }))) return;
        await eraseEverything(); toast(t('screens.dash.done')); go('splash');
      }, 'btn-danger')));
}
const stat = (label, value) => el('div', { class: 'stat' }, el('b', { text: value }), el('span', { class: 'small', text: label }));
