/* FIRE ZONE service worker — caches shell for offline play. */
const CACHE = 'firezone-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/utils.js',
  './js/config.js',
  './js/state.js',
  './js/settings.js',
  './js/damage.js',
  './js/models.js',
  './js/engine.js',
  './js/player.js',
  './js/weapons.js',
  './js/enemy.js',
  './js/waves.js',
  './js/hud.js',
  './js/input.js',
  './js/net.js',
  './js/game.js',
  './js/ui.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // never cache Three.js CDN or PeerJS
  if(url.hostname.includes('unpkg') || url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('jsdelivr')){
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if(e.request.method === 'GET' && res.status === 200 && url.origin === location.origin){
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});