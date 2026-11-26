import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { startLocalBackend } from './scripts/local-backend.mjs';

function localBackend() {
  return {
    name: 'youshu-local-backend',
    apply: 'serve',
    async configureServer(server) {
      const stopBackend = await startLocalBackend();
      server.httpServer?.once('close', stopBackend);
    },
  };
}

export default defineConfig({
  plugins: [localBackend(), vue(), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src-react', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5199, proxy: { '/api': process.env.API_PROXY_TARGET || 'http://127.0.0.1:8080' } },
  build: { rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), legacy: fileURLToPath(new URL('./legacy.html', import.meta.url)) } } },
});
