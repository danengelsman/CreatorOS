/**
 * Vercel serverless entry for /api/*.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let ready = null;

function getApp() {
  if (!ready) {
    ready = import(path.join(__dirname, '..', 'dist', 'server.js')).then(async (mod) => {
      if (typeof mod.getApp === 'function') return mod.getApp();
      return mod.default ?? mod.app;
    });
  }
  return ready;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('BOOT ERROR:', err?.stack || err);
    const detail = (req.query && req.query.debug) ? String(err?.stack || err).slice(0, 1200) : undefined;
    res.status(500).json({ error: 'Server failed to start. Please try again.', detail });
  }
}
