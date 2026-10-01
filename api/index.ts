import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless catch-all for /api/*.
 * Delegates to the existing Express app defined in server.ts
 * (auth middleware, Gemini routes, OAuth, analytics — all preserved).
 * Static SPA files are served by Vercel's static build; only /api/* lands here.
 */

let ready: Promise<any> | null = null;

async function getApp() {
  if (!ready) {
    ready = import('../server.ts').then(async (mod: any) => {
      if (typeof mod.getApp === 'function') return mod.getApp();
      return mod.default ?? mod.app;
    });
  }
  return ready;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('Serverless bootstrap error:', err);
    res.status(500).json({ error: 'Server failed to start. Please try again.' });
  }
}
