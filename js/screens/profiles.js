import { el } from '../util.js';
import { t, kiki, kikiLines } from '../i18n.js';
import { S } from '../state.js';
import { button, avatarEl, kikiBubble, infoDialog, toast, confirmDialog, storageBanner } from '../ui.js';
import { go } from '../router.js';
import { selectProfile, createProfile, cleanNickname, loadCheckpoint, clearCheckpoint } from '../player.js';
import { status } from '../storage.js';
import { speak } from '../audio.js';
import { track } from '../analytics.js';

export async function enterProfile(id) {
  const res = await selectProfile(id);
  if (!res.ok) {
    await infoDialog({ title: t('errors.corruptTitle'), body: t('errors.corruptBody') });
    return go('parentGate');
  }
  track('session_start', { band: res.profile.band });
  const cp = await loadCheckpoint(id);
  if (cp && S.data.levels.worlds.some((w) => w.levels.some((l) => l.id === cp.levelId))) {
    toast(t('screens.profiles.resume'));
    return go('play', { levelId: cp.levelId, round: cp.round, wrong: cp.wrong, hints: cp.hints, seconds: cp.seconds });
  }
  if (cp) await clearCheckpoint(id);
  return go('map');
}

export async function profileSelect() {
  const max = S.data.config.maxProfiles;
  const cards = S.profiles.map((p) => el('button', { class: 'profile-card', type: 'button', onclick: () => enterProfile(p.id) },
    avatarEl(p, 'lg'), el('span', { class: 'profile-name', text: p.nickname }),
    el('span', { class: 'small', text: S.data.config.ageBands.find((b) => b.id === p.band)?.name || '' })));
  const add = el('button', { class: 'profile-card add', type: 'button', onclick: () => {
    if (S.profiles.length >= max) return infoDialog({ title: t('screens.profiles.limitTitle'), body: t('screens.profiles.limitBody', { max }) });
    go('setup');
  } }, el('span', { class: 'avatar lg', 'aria-hidden': 'true', text: '➕' }), el('span', { class: 'profile-name', text: t('screens.profiles.add') }));
  return el('div', { class: 'page' },
    storageBanner(status),
    el('h1', { text: t('screens.profiles.title') }),
    el('div', { class: 'profile-grid' }, cards, add),
    el('div', { class: 'row' }, button(t('common.parentArea'), () => go('parentGate'), 'btn-ghost')));
}

export async function playerSetup({ first = false } = {}) {
  const bands = S.data.config.ageBands; const avatars = S.data.rewards.avatars;
  let band = null, avatar = avatars[0].id;
  const nick = el('input', { id: 'nick', class: 'input', type: 'text', maxlength: S.data.config.nicknameMaxLength, autocomplete: 'off', autocapitalize: 'words', placeholder: t('screens.setup.nickPlaceholder') });
  const err = el('p', { class: 'error', role: 'alert' });
  const bandBtns = bands.map((b) => el('button', { class: 'choice band', type: 'button', 'aria-pressed': 'false', onclick: () => { band = b.id; bandBtns.forEach((x, i) => { const on = bands[i].id === band; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); }); } },
    el('b', { text: b.name }), el('span', { class: 'small', text: t('screens.setup.ages', { ages: b.ages }) }), el('span', { class: 'small', text: t('screens.setup.band.' + b.id) })));
  const avBtns = avatars.map((a, i) => el('button', { class: 'avatar-pick' + (i === 0 ? ' sel' : ''), type: 'button', 'aria-label': t('screens.setup.avatarN', { n: i + 1 }), 'aria-pressed': String(i === 0), onclick: () => { avatar = a.id; avBtns.forEach((x, k) => { const on = avatars[k].id === avatar; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); }); } }, a.emoji));
  const start = button(t('screens.setup.start'), async () => {
    err.textContent = '';
    if (!cleanNickname(nick.value)) { err.textContent = t('screens.setup.errNick'); nick.focus(); return; }
    if (!band) { err.textContent = t('screens.setup.errBand'); return; }
    try {
      start.disabled = true;
      const p = await createProfile({ nickname: nick.value, band, avatar });
      const res = await selectProfile(p.id);
      if (!res.ok) throw new Error('select');
      track('profile_created', { band });
      go('tutorial');
    } catch { start.disabled = false; err.textContent = t('errors.saveFailed'); }
  }, 'btn-primary btn-xl');
  return el('div', { class: 'page' },
    storageBanner(status),
    S.profiles.length ? button('← ' + t('common.back'), () => go('profiles'), 'btn-ghost') : null,
    el('h1', { text: t('screens.setup.title') }),
    first ? kikiBubble(kiki('welcome'), { speakIt: true, key: 'kiki_welcome' }) : null,
    el('label', { class: 'field', for: 'nick' }, el('span', { text: t('screens.setup.nickLabel') }), nick, el('span', { class: 'small', text: t('screens.setup.nickHelp') })),
    el('fieldset', { class: 'field' }, el('legend', { text: t('screens.setup.bandLabel') }), el('div', { class: 'choices band-choices' }, bandBtns)),
    el('fieldset', { class: 'field' }, el('legend', { text: t('screens.setup.avatarLabel') }), el('div', { class: 'avatar-row' }, avBtns)),
    err, start);
}

export async function tutorial() {
  const lines = kikiLines('tutorial'); let i = 0;
  const box = el('div', { class: 'tutorial-box' });
  const btn = button('', () => { if (i < lines.length - 1) { i++; show(); } else go('levelIntro', { levelId: S.data.levels.worlds[0].levels[0].id }); }, 'btn-primary btn-xl');
  function show() {
    box.replaceChildren(kikiBubble(lines[i]), el('p', { class: 'small', text: t('screens.tutorial.step', { n: i + 1, total: lines.length }) }));
    btn.textContent = i < lines.length - 1 ? t('common.next') : t('screens.tutorial.enter');
    speak('kiki_tutorial_' + (i + 1), lines[i]);
  }
  show();
  return el('div', { class: 'page center' }, el('h1', { text: t('screens.tutorial.title') }), box, btn);
}
