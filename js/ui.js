// Shared UI pieces: buttons, HUD, toasts, dialogs, Kiki speech bubble, avatar.
import { el, sleep } from './util.js';
import { t } from './i18n.js';
import { S } from './state.js';
import { sfx, speak } from './audio.js';
import { totalStars } from './rewards.js';

export function button(label, onclick, cls = '') {
  return el('button', { class: 'btn ' + cls, type: 'button', onclick: (e) => { sfx('tap'); onclick(e); } }, label);
}

export function avatarEl(profile = S.profile, size = '') {
  const outfit = S.rewards && S.profile && profile?.id === S.profile.id ? S.data.rewards.items.find((i) => i.id === S.rewards.equipped.outfit) : null;
  return el('span', { class: 'avatar ' + size, 'aria-hidden': 'true' },
    el('span', { class: 'avatar-face', text: S.data.rewards.avatars.find((a) => a.id === profile?.avatar)?.emoji || '🧒' }),
    outfit ? el('span', { class: 'avatar-acc', text: outfit.emoji }) : null);
}

export function hud() {
  const p = S.profile;
  return el('div', { class: 'hud' },
    el('span', { class: 'hud-who' }, avatarEl(p, 'sm'), el('span', { class: 'hud-name', text: p.nickname })),
    el('span', { class: 'hud-stat', title: t('hud.stars') }, '⭐ ', el('b', { text: totalStars() })),
    el('span', { class: 'hud-stat', title: t('hud.coins') }, '🪙 ', el('b', { text: S.rewards.coins })),
    el('span', { class: 'hud-stat', title: t('hud.gems') }, '💎 ', el('b', { text: S.rewards.gems })));
}

export function backBar(label, onclick, title = '') {
  return el('div', { class: 'topbar' }, button('← ' + label, onclick, 'btn-ghost'), title ? el('h1', { class: 'topbar-title', text: title }) : el('span'));
}

export function kikiBubble(text, { speakIt = false, key = '' } = {}) {
  const node = el('div', { class: 'kiki' },
    el('span', { class: 'kiki-face', 'aria-hidden': 'true', text: '🦜' }),
    el('p', { class: 'kiki-say', text }),
    el('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.readAloud'), onclick: () => speak(key, text, { force: true }), text: '🔊' }));
  if (speakIt) speak(key, text);
  return node;
}

export async function toast(text, ms = 2200) {
  let host = document.getElementById('toasts');
  if (!host) { host = el('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(host); }
  const n = el('div', { class: 'toast', role: 'status', text });
  host.append(n);
  await sleep(ms); n.classList.add('out'); await sleep(300); n.remove();
}

export function dialog({ title, body, actions }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { overlay.remove(); prev?.focus?.(); resolve(v); };
    const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('h2', { text: title }),
      typeof body === 'string' ? el('p', { text: body }) : body,
      el('div', { class: 'dialog-actions' }, actions.map((a) => el('button', { class: 'btn ' + (a.cls || ''), type: 'button', onclick: () => close(a.value), text: a.label }))));
    const overlay = el('div', { class: 'overlay', onkeydown: (e) => { if (e.key === 'Escape') close(actions.find((a) => a.cancel)?.value ?? null); } }, box);
    document.body.append(overlay);
    box.querySelector('button')?.focus();
  });
}
export const confirmDialog = ({ title, body, confirm, cancel = t('common.cancel'), danger = false }) =>
  dialog({ title, body, actions: [{ label: cancel, value: false, cancel: true, cls: 'btn-ghost' }, { label: confirm, value: true, cls: danger ? 'btn-danger' : 'btn-primary' }] });
export const infoDialog = ({ title, body, ok = t('common.ok') }) => dialog({ title, body, actions: [{ label: ok, value: true, cls: 'btn-primary', cancel: true }] });

export function starRow(n, max = 3) {
  return el('span', { class: 'stars', 'aria-label': t('common.starsOf', { n, max }) },
    Array.from({ length: max }, (_, i) => el('span', { class: 'star ' + (i < n ? 'on' : 'off'), 'aria-hidden': 'true', text: i < n ? '⭐' : '☆' })));
}

export function storageBanner(status) {
  if (status.idb && status.settings) return null;
  return el('div', { class: 'banner banner-warn', role: 'alert', text: t('errors.noStorage') });
}
