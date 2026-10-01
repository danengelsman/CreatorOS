/**
 * Vercel serverless entry for /api/*.
 * Delegates to the esbuild-bundled Express app (dist/server.js).
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let ready = null;

function getAppPromise() {
  if (!ready) {
    ready = import(path.join(__dirname, '..', 'dist', 'server.js')).then(async (mod) => {
      const app = await mod.getApp();
      if (typeof app !== 'function') {
        throw new Error('getApp() returned ' + typeof app + ', expected express app');
      }
      return app;
    });
    ready.catch(() => { ready = null; }); // allow retry on next request
  }
  return ready;
}

export default async function handler(req, res) {
  try {
    const app = await getAppPromise();
    return app(req, res);
  } catch (err) {
    console.error('BOOT ERROR:', err?.stack || err);
    const detail = (req.query && req.query.debug) ? String(err?.stack || err).slice(0, 1200) : undefined;
    res.status(500).json({ error: 'Server failed to start. Please try again.', detail });
  }
}
