const V = 'tz-v5';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/core.js', 'js/public.js', 'js/spaces.js', 'js/admin.js', 'js/boot.js', 'manifest.webmanifest', 'icon-192.png', 'logo-icon.png', 'logo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.searchParams.has('probe')) return;   // Supabase, CDN et test de connexion : réseau direct
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
