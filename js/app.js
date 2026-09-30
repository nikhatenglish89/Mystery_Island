// Mystery Island: boot, data loading and screen registration.
import { S } from './state.js';
import { loadText, t } from './i18n.js';
import { initStorage } from './storage.js';
import { loadProfiles } from './player.js';
import { initAudio } from './audio.js';
import { initAnalytics } from './analytics.js';
import { register, go } from './router.js';
import splash from './screens/splash.js';
import { profileSelect, playerSetup, tutorial } from './screens/profiles.js';
import { treasureMap, worldDetail } from './screens/map.js';
import { levelIntro, explore, play, reward, ending } from './screens/level.js';
import { camp } from './screens/camp.js';
import { achievements } from './screens/achievements.js';
import { settings } from './screens/settings.js';
import { parentGate, dashboard } from './screens/parent.js';

const json = (f) => fetch('data/' + f).then((r) => { if (!r.ok) throw new Error(f); return r.json(); });

function showFatal(kind) {
  const root = document.getElementById('screen');
  root.replaceChildren();
  const box = document.createElement('div'); box.className = 'page center'; box.setAttribute('role', 'alert');
  const h = document.createElement('h1'); h.textContent = kind === 'offline' ? 'Connect to the internet to play' : 'Something went wrong';
  const p = document.createElement('p');
  p.textContent = kind === 'offline'
    ? 'Mystery Island needs to download its game files the first time. Please connect to the internet and try again.'
    : 'The game could not start. Please refresh the page.';
  const b = document.createElement('button'); b.className = 'btn btn-primary btn-xl'; b.textContent = 'Try again'; b.onclick = () => location.reload();
  box.append(h, p, b); root.append(box);
}

async function boot() {
  try {
    const [levels, questions, rewards, achievements, config] = await Promise.all(['levels', 'questions', 'rewards', 'achievements', 'config'].map((n) => json(n + '.json')));
    S.data = { levels, questions, rewards, achievements, config };
    await loadText();
  } catch {
    return showFatal(navigator.onLine === false ? 'offline' : 'error');
  }
  document.title = S.data.config.gameName;
  await initStorage();
  await loadProfiles();
  initAudio(S.data.config); initAnalytics(S.data.config);

  register('splash', splash); register('profiles', profileSelect); register('setup', playerSetup); register('tutorial', tutorial);
  register('map', treasureMap); register('world', worldDetail); register('levelIntro', levelIntro); register('explore', explore);
  register('play', play); register('reward', reward); register('ending', ending); register('camp', camp);
  register('awards', achievements); register('settings', settings); register('parentGate', parentGate); register('dashboard', dashboard);

  if (S.data.config.pwa?.enabled && 'serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  document.getElementById('boot')?.remove();
  go('splash');
}

window.addEventListener('error', () => { /* never block gameplay on stray errors */ });
boot();
