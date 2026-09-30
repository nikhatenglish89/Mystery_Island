import { el } from '../util.js';
import { t } from '../i18n.js';
import { S } from '../state.js';
import { hud, backBar } from '../ui.js';
import { go } from '../router.js';

export async function achievements() {
  const list = S.data.achievements.achievements; const got = Object.keys(S.ach.unlocked).length;
  return el('div', { class: 'page ach-page' },
    hud(), backBar(t('common.map'), () => go('map')), el('h1', { text: t('screens.awards.title') }),
    el('p', { class: 'lead', text: t('screens.awards.count', { n: got, total: list.length }) }),
    el('ul', { class: 'ach-grid' }, list.map((a) => {
      const on = !!S.ach.unlocked[a.id];
      return el('li', { class: 'ach-card' + (on ? ' on' : ' off') },
        el('span', { class: 'ach-emoji', 'aria-hidden': 'true', text: on ? a.emoji : '🔒' }),
        el('b', { text: a.name }), el('span', { class: 'small', text: a.description }),
        on ? el('span', { class: 'small ok-text', text: t('screens.awards.unlocked') }) : null);
    })));
}
