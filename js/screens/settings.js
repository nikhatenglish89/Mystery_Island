import { el } from '../util.js';
import { t } from '../i18n.js';
import { hud, backBar, button } from '../ui.js';
import { go } from '../router.js';
import { getSetting, setSetting } from '../storage.js';
import { sfx, stopVoice } from '../audio.js';

function toggle(label, key, help) {
  const b = el('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(!!getSetting(key)), onclick: () => {
    const v = !getSetting(key); setSetting(key, v); b.setAttribute('aria-checked', String(v)); b.textContent = v ? t('common.on') : t('common.off'); if (!v) stopVoice(); else sfx('tap');
  }, text: getSetting(key) ? t('common.on') : t('common.off') });
  return el('div', { class: 'setting-row' }, el('div', {}, el('b', { text: label }), help ? el('p', { class: 'small', text: help }) : null), b);
}

export async function settings() {
  return el('div', { class: 'page settings-page' },
    hud(), backBar(t('common.map'), () => go('map')), el('h1', { text: t('screens.settings.title') }),
    toggle(t('screens.settings.sound'), 'audio', t('screens.settings.soundHelp')),
    toggle(t('screens.settings.voice'), 'voice', t('screens.settings.voiceHelp')),
    el('p', { class: 'small', text: t('screens.settings.parentNote') }),
    button(t('common.parentArea'), () => go('parentGate'), 'btn-ghost'));
}
