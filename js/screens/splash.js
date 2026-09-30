import { el } from '../util.js';
import { t } from '../i18n.js';
import { S } from '../state.js';
import { button, storageBanner } from '../ui.js';
import { unlockAudio, sfx } from '../audio.js';
import { status } from '../storage.js';
import { go } from '../router.js';

export default async function splash() {
  const banner = storageBanner(status);
  return el('div', { class: 'splash' },
    banner,
    el('div', { class: 'splash-art', 'aria-hidden': 'true' }, el('span', { class: 'sp-sun', text: '☀️' }), el('span', { class: 'sp-island', text: '🏝️' }), el('span', { class: 'sp-ship', text: '⛵' })),
    el('h1', { class: 'logo', text: S.data.config.gameName }),
    el('p', { class: 'tagline', text: t('screens.splash.tagline') }),
    button(t('common.continue'), () => {
      unlockAudio(); sfx('star');
      go(S.profiles.length ? 'profiles' : 'setup', { first: !S.profiles.length });
    }, 'btn-primary btn-xl'),
    el('p', { class: 'small', text: t('screens.splash.soundNote') }));
}
