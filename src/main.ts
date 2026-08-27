import { mount } from 'svelte';
import './styles/global.css';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

// Register the offline service worker (production only). It caches the app
// shell so Cadence works with no network at all after the first load — which
// is also the strongest privacy guarantee: the app literally cannot phone home.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* offline support is best-effort; the app still works without it */
    });
  });
}

export default app;
