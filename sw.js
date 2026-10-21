const C = 'listas-v3';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'index.html', 'css/styles.css', 'js/main.js', 'js/config.js', 'js/storage.js', 'js/render.js', 'js/export.js', 'js/media.js', 'js/docs.js', 'icon.svg']))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
// Rede primeiro (sempre a versão mais nova); sem internet, usa o que está guardado
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
