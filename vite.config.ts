import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import childProcess from 'child_process';
import { createRequire } from 'module';
import {defineConfig, loadEnv} from 'vite';

const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

export default defineConfig(({mode}) => {
  loadEnv(mode, '.', '');
  // F3.4: real build metadata injected at compile time so SupportHub can show
  // the actual package version and git commit instead of scripted output.
  // Both are '' when unavailable (e.g. shallow CI checkout) and the UI omits
  // them in that case.
  let commitSha = '';
  try {
    commitSha = childProcess.execSync('git rev-parse --short=9 HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    commitSha = '';
  }
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __GIT_COMMIT__: JSON.stringify(commitSha),
    },
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor';
              }
              if (id.includes('firebase')) {
                return 'firebase';
              }
              if (id.includes('recharts') || id.includes('lucide-react') || id.includes('motion')) {
                return 'ui';
              }
              if (id.includes('@google/genai')) {
                return 'genai';
              }
            }
          },
        },
      },
    },
  };
});
