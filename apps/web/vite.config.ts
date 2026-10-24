import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward /api calls to the backend, so the browser sees one origin
    // and we avoid CORS issues during development.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
