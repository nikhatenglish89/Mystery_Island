import { el } from '../util.js';
import { t } from '../i18n.js';
import { S } from '../state.js';
import { button, hud, avatarEl, backBar, toast } from '../ui.js';
import { go } from '../router.js';
import { buyItem, toggleItem } from '../rewards.js';
import { sfx } from '../audio.js';

export async function camp({ tab = 'outfit' } = {}) {
  const items = S.data.rewards.items.filter((i) => i.slot === tab);
  const owned = new Set(S.rewards.owned);
  const placedSpots = [[12, 66], [30, 76], [50, 70], [70, 76], [86, 64], [22, 44], [66, 46], [44, 38]];
  const scene = el('div', { class: 'camp-scene', role: 'img', 'aria-label': t('screens.camp.sceneAria') },
    el('div', { class: 'camp-avatar' }, avatarEl(S.profile, 'xl')),
    S.rewards.placed.map((id, i) => el('span', { class: 'camp-item', style: { left: placedSpots[i][0] + '%', top: placedSpots[i][1] + '%' }, text: S.data.rewards.items.find((x) => x.id === id)?.emoji })));
  const cards = items.map((it) => {
    const has = owned.has(it.id);
    const on = it.slot === 'outfit' ? S.rewards.equipped.outfit === it.id : S.rewards.placed.includes(it.id);
    const cur = it.currency === 'gems' ? '💎' : '🪙';
    const afford = S.rewards[it.currency === 'gems' ? 'gems' : 'coins'] >= it.price;
    const action = has
      ? button(on ? (it.slot === 'outfit' ? t('screens.camp.unequip') : t('screens.camp.remove')) : (it.slot === 'outfit' ? t('screens.camp.equip') : t('screens.camp.place')), async () => {
        const r = await toggleItem(it.id);
        if (!r.ok && r.reason === 'full') return toast(t('screens.camp.full', { max: S.data.rewards.maxPlaced }));
        go('camp', { tab });
      }, on ? 'btn-ghost' : 'btn-primary')
      : button(`${cur} ${it.price}`, async () => {
        const r = await buyItem(it.id);
        if (!r.ok) { sfx('wrong'); return toast(t('screens.camp.needMore')); }
        sfx('coin'); toast(t('screens.camp.bought', { item: it.name }));
        if (r.achievements.length) toast(t('screens.camp.newAch', { name: r.achievements[0].name }), 3000);
        await toggleItem(it.id); go('camp', { tab });
      }, afford ? 'btn-primary' : 'btn-disabled');
    return el('li', { class: 'shop-card' + (has ? ' owned' : '') + (it.currency === 'gems' ? ' rare' : '') },
      el('span', { class: 'shop-emoji', 'aria-hidden': 'true', text: it.emoji }), el('span', { class: 'shop-name', text: it.name }), action);
  });
  return el('div', { class: 'page camp-page' },
    hud(), backBar(t('common.map'), () => go('map')), el('h1', { text: t('screens.camp.title') }), scene,
    el('div', { class: 'tabs', role: 'tablist' },
      ['outfit', 'decor'].map((k) => el('button', { class: 'tab' + (k === tab ? ' sel' : ''), role: 'tab', 'aria-selected': String(k === tab), type: 'button', onclick: () => go('camp', { tab: k }), text: t('screens.camp.tab.' + k) }))),
    el('p', { class: 'small', text: t('screens.camp.rareNote') }),
    el('ul', { class: 'shop-grid' }, cards));
}
