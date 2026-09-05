/* Precache every card, not just cards seen during an online session. */
importScripts('./js/offline-files.js');
const CACHE='splendor-classic-offline-v3';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./',...self.OFFLINE_FILES.map(f=>'./'+f)])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('splendor-classic-offline-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
