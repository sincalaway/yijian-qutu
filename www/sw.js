// 离线缓存：应用外壳缓存优先，更新版本号即可刷新
const VERSION = 'qutu-v2'
const SHELL = ['./', './index.html', './css/app.css', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url)
  if (e.request.method !== 'GET' || u.origin !== location.origin) return
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)) } return r }).catch(() => hit)
    return hit || net
  }))
})
