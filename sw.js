// Service worker volutamente "vuoto": serve solo a far comparire il
// prompt di installazione su Android/Chrome. Non mette nulla in cache
// perché i dati (corse, note, schede) devono sempre arrivare freschi da
// Supabase — un'app di allenamento con dati vecchi in cache sarebbe
// peggio che non averla installata.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
