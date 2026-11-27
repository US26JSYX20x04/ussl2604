// 230Rund3 – Offline-Speicher
// Mit Internet: immer zuerst die aktuelle Version vom Server holen und merken.
// Ohne Internet: die zuletzt gemerkte Version zeigen.
// Diese Datei muss bei neuen Spielversionen NICHT geändert werden.
const CACHE = 'rund3-v1';
const PEER = /^https:\/\/(unpkg\.com|cdn\.jsdelivr\.net)\/(npm\/)?peerjs@/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Verbindungsbibliothek (feste Version): einmal speichern, danach aus dem Speicher
  if (PEER.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Seite selbst: alle Aufrufe (mit Raum-Link, mit ?…) teilen sich einen Eintrag
  const page = req.mode === 'navigate';
  const key = page ? new URL('./index.html', self.registration.scope).href : req.url;
  e.respondWith(
    fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.open(CACHE).then(c => c.match(key)).then(hit => hit || (page ? new Response('<!doctype html><meta charset="utf-8"><p style="font:16px sans-serif;padding:20px">Ohne Internet und noch nicht gespeichert. Bitte einmal mit Internet öffnen.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) : Response.error())))
  );
});
