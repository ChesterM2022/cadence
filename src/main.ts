import { mount } from 'svelte';
import './styles/global.css';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

// Register the offline service worker (production only). It caches the app
// shell so Cadence works with no network after the first load. Analytics are
// best-effort and never required for the app to function.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      /* offline support is best-effort; the app still works without it */
    });
  });
}

export default app;
