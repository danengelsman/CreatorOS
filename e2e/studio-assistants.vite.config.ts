import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { join } from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': join(process.cwd(), 'src') }, dedupe: ['react', 'react-dom'] },
  cacheDir: join(
    process.env.STUDIO_TEST_CACHE_DIR || join(process.cwd(), '.hermes', 'cache'),
    'studio-assistants-vite',
  ),
  define: {
    'process.env.FIREBASE_AUTH_EMULATOR_HOST': JSON.stringify('127.0.0.1:9099'),
    'process.env.FIRESTORE_EMULATOR_HOST': JSON.stringify('127.0.0.1:8080'),
  },
});
