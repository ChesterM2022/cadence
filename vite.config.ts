import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Cadence is a fully static, offline-first PWA. It makes ZERO network calls at
// runtime — everything (code, fonts, content) is bundled and served once, then
// cached by the service worker. There is no backend and no analytics.
export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
