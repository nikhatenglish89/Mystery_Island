// Optional offline support (planned for V1.2). Only registered when data/config.json has pwa.enabled = true.
// Caches the static game files after the first online visit; the first load always needs the network.
const CACHE = 'mystery-island-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'assets/ui/icon.svg',
  'css/base.css', 'css/map.css', 'css/game.css', 'css/responsive.css',
  'js/app.js', 'js/util.js', 'js/i18n.js', 'js/state.js', 'js/storage.js', 'js/player.js', 'js/rewards.js', 'js/audio.js', 'js/analytics.js', 'js/router.js', 'js/ui.js',
  'js/screens/splash.js', 'js/screens/profiles.js', 'js/screens/map.js', 'js/screens/level.js', 'js/screens/camp.js', 'js/screens/achievements.js', 'js/screens/settings.js', 'js/screens/parent.js',
  'js/minigames/index.js', 'js/minigames/common.js', 'js/minigames/number.js', 'js/minigames/word-builder.js', 'js/minigames/memory-sequence.js', 'js/minigames/pattern-puzzle.js',
  'js/minigames/object-hunt.js', 'js/minigames/maze-path.js', 'js/minigames/science-choice.js', 'js/minigames/spot-difference.js',
  'data/levels.json', 'data/questions.json', 'data/rewards.json', 'data/achievements.json', 'data/dialogue.json', 'data/text.json', 'data/config.json',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
