// Kill-switch service worker.
//
// L'ancien SW (cache du shell applicatif) laissait des navigateurs bloqués sur
// des builds périmés — au point de servir une version assez ancienne pour
// utiliser un autre SDK de paiement Paystack, d'où des échecs de transaction.
//
// Ce SW ne met plus rien en cache : à l'activation il vide tous les caches, se
// désinscrit, puis force le rechargement des fenêtres ouvertes. Le rechargement
// se fait alors sans SW → le build courant est chargé depuis le réseau.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
