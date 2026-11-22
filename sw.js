const V = 'tz-v1';
const SHELL = ['./', 'index.html', 'style.css', 'config.js', 'legal.js', 'core.js', 'public.js', 'spaces.js', 'admin.js', 'boot.js', 'manifest.webmanifest', 'icon-192.png', 'logo-icon.png', 'logo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Supabase & CDN : jamais en cache
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
