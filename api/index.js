/**
 * Vercel serverless entry for /api/*.
 * Delegates to the esbuild bundle co-located in api/_server.js
 * (same directory = always included in the function trace).
 */
let ready = null;

function getAppPromise() {
  if (!ready) {
    ready = import('./_server.js').then(async (mod) => {
      const app = await mod.getApp();
      if (typeof app !== 'function') {
        throw new Error('getApp() returned ' + typeof app + ', expected express app');
      }
      return app;
    });
    ready.catch(() => { ready = null; });
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
