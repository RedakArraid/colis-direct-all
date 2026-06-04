import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Service worker retiré : il gardait des clients bloqués sur d'anciens builds
// (au point de servir une version utilisant un autre SDK de paiement). On ne
// l'enregistre plus et on désinscrit toute instance déjà présente + on purge
// ses caches. sw.js est désormais un kill-switch (voir public/sw.js).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}
