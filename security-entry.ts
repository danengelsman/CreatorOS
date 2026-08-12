import express from 'express';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

/** Security bootstrap for CreatorOS Gemini API routes. */
let projectId = 'gen-lang-client-0282443702';
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId) projectId = config.projectId;
  }
} catch (error) {
  console.error('Security bootstrap: failed to read Firebase config:', error);
}

const securityApp = admin.apps.find((app) => app?.name === 'creatoros-security')
  ?? admin.initializeApp({ projectId }, 'creatoros-security');
const securityAuth = admin.auth(securityApp);

const WINDOW_MS = 60_000;
const limits: Record<string, number> = {
  '/api/gemini/generate': 30,
  '/api/gemini/analyze-video': 10,
  '/api/gemini/generate-video': 3,
  '/api/gemini/video-status': 60,
  '/api/gemini/video-download': 10,
};
const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
const buckets = new Map<string, { count: number; resetAt: number }>();

function consumeRateLimit(userId: string, route: string) {
  const now = Date.now();
  const limit = limits[route] ?? 30;
  const key = `${route}:${userId}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 60 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

function isAllowedGeminiUri(value: unknown) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === 'generativelanguage.googleapis.com'
      || hostname.endsWith('.googleapis.com')
      || hostname.endsWith('.googleusercontent.com');
  } catch {
    return false;
  }
}

async function protectGeminiRoute(req: any, res: any, next: any) {
  const route = req.path;
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decodedToken = await securityAuth.verifyIdToken(token);
    req.user = req.user || decodedToken;

    const rate = consumeRateLimit(decodedToken.uid, route);
    res.setHeader('X-RateLimit-Route', route);
    res.setHeader('X-RateLimit-Reset', String(rate.retryAfter));
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfter));
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before trying again.',
        retryAfterSeconds: rate.retryAfter,
      });
    }

    if (route === '/api/gemini/generate') {
      const requestedModel = req.body?.model;
      if (requestedModel && requestedModel !== 'gemini-2.5-flash') {
        return res.status(400).json({ error: 'Unsupported Gemini model.' });
      }
    }

    if (route === '/api/gemini/analyze-video') {
      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > MAX_VIDEO_UPLOAD_BYTES) {
        return res.status(413).json({ error: 'Video upload exceeds the 50 MB limit.' });
      }
    }

    // Never allow callers to make the server fetch arbitrary URLs with the
    // Gemini API key. Only Google-hosted Gemini resource URLs are accepted.
    if (route === '/api/gemini/video-download' && !isAllowedGeminiUri(req.body?.uri)) {
      return res.status(400).json({ error: 'Invalid video resource URI.' });
    }

    next();
  } catch (error) {
    console.error('Gemini security auth error:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function protectGeminiRegistration() {
  const originalPost = express.application.post;
  express.application.post = function patchedPost(pathOrPaths: any, ...handlers: any[]) {
    const paths = Array.isArray(pathOrPaths) ? pathOrPaths : [pathOrPaths];
    const hasGeminiRoute = paths.some((value) => typeof value === 'string' && limits[value] !== undefined);
    if (hasGeminiRoute) {
      return originalPost.call(this, pathOrPaths, protectGeminiRoute, ...handlers);
    }
    return originalPost.call(this, pathOrPaths, ...handlers);
  } as typeof express.application.post;
}

protectGeminiRegistration();
await import('./server.ts');
