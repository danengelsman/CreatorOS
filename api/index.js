/**
 * Vercel serverless entry for /api/*.
 * Delegates to the esbuild-bundled Express app (dist/server.js).
 * The bundle exports getApp(); it does not listen when VERCEL=1.
 */
let ready = null;

function getApp() {
  if (!ready) {
    ready = import('../dist/server.js').then(async (mod) => {
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
    console.error('Serverless bootstrap error:', err);
    res.status(500).json({ error: 'Server failed to start. Please try again.' });
  }
}
