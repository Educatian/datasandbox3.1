import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcss()],
    define: {
      // The Gemini key is injected ONLY into dev builds. Production must use the
      // Worker proxy (VITE_GEMINI_PROXY_URL) so the key never ships to clients.
      'process.env.API_KEY': JSON.stringify(mode === 'development' ? env.GEMINI_API_KEY : ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
