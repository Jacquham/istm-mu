// ISTM-MU — Service Worker (mode hors-ligne)
// A deposer a la racine du depot GitHub, a cote de index.html

const CACHE_NAME = 'istm-mu-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installation : on met de cote les fichiers de base de l'appli
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// Activation : on jette les anciennes versions du cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Strategie :
// - Les requetes vers Supabase (donnees, connexion) passent toujours par le reseau :
//   on ne veut jamais afficher de fausses donnees perimees comme si elles etaient a jour.
// - Le reste (la page elle-meme, le logo, le manifeste) est servi depuis le cache si le
//   reseau echoue, pour que l'ecran s'ouvre quand meme sans connexion.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.hostname.includes('supabase.co')) return; // jamais mis en cache : toujours en direct

  if(req.mode === 'navigate'){
    // Page principale : version fraiche en priorite, cache si hors-ligne
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Autres fichiers de l'appli (logo, manifeste...) : cache en priorite, reseau en secours
  event.respondWith(
    caches.match(req).then((cached) => {
      if(cached) return cached;
      return fetch(req).then((res) => {
        if(url.origin === self.location.origin){
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
