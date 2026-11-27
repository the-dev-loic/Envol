// Service worker : rend le jeu jouable SANS CONNEXION.
// - À l'installation, TOUS les fichiers du jeu sont téléchargés et rangés dans le cache.
// - Ensuite : on essaie le réseau (pour avoir la dernière version) avec un délai court,
//   et sinon on sert la copie en cache → le jeu se lance en mode avion.
// La liste FILES et la version CACHE sont générées par :  python3 tools/update-sw.py
const CACHE = 'envol-5c3f32dab7';
const FILES = [
  './',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './index.html',
  './manifest.webmanifest',
  './src/config.js',
  './src/core/game.js',
  './src/core/orientation.js',
  './src/core/rng.js',
  './src/input/tilt.js',
  './src/main.js',
  './src/player/bird.js',
  './src/ui/hud.js',
  './src/version.js',
  './src/world/cute.js',
  './src/world/ground.js',
  './src/world/merge.js',
  './src/world/obstacles.js',
  './src/world/sky.js',
  './src/world/stages.js',
  './src/world/style.js',
  './src/world/themes/canyon.js',
  './src/world/themes/city.js',
  './src/world/themes/country.js',
  './src/world/themes/forest.js',
  './src/world/themes/index.js',
  './src/world/themes/snow.js',
  './src/world/world.js',
  './styles.css',
  './vendor/three.core.js',
  './vendor/three.module.js',
];
const NETWORK_TIMEOUT = 2500; // ms : au-delà, on joue avec la copie locale

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(networkThenCache(req));
});

async function networkThenCache(req) {
  const cache = await caches.open(CACHE);
  const fromNetwork = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  fromNetwork.catch(() => {}); // hors ligne : l'erreur est gérée plus bas
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
  try {
    const res = await Promise.race([fromNetwork, timeout]);
    if (res) return res;
  } catch { /* hors ligne */ }
  const cached = await cache.match(req, { ignoreSearch: true })
    || (req.mode === 'navigate' && await cache.match('./index.html'));
  return cached || fromNetwork;
}
