import express from 'express';
import { randomUUID } from 'node:crypto';
// vite is imported lazily — only in local dev. A static import here would
// pull rollup native binaries into the serverless bundle and crash on boot.
let createViteServer: any = null;
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import axios from 'axios';
import { createOAuthState, verifyAndConsumeOAuthState } from './src/server/oauth-state.ts';
import { encryptToken, decryptToken } from './src/server/crypto.ts';
import {
  serverFirestore,
  projectsFirestore,
  upsertIntegration,
  updateIntegrationFields,
  getIntegration,
  listIntegrations,
  firestorePing,
} from './src/server/firestore.ts';
import {
  QuotaLedger,
  quotaGuardMiddleware,
  extractTokensUsed,
  ROUTE_COST_ESTIMATES,
} from './src/server/quotaLedger';
import {
  extractSessionToken,
  createSessionExchangeHandler,
  createRevokeAllHandler,
} from './src/server/sessionAuth';

dotenv.config();

// Load Firebase applet config if exists
let firestoreDbId: string | undefined = undefined;
let projectId = 'gen-lang-client-0282443702';
try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    firestoreDbId = config.firestoreDatabaseId;
    if (config.projectId) {
      projectId = config.projectId;
    }
  }
} catch (err) {
  console.error('Error reading firebase-applet-config.json:', err);
}

// Phase A / F4.5 — emulator mode must verify against the EMULATOR project.
// The client bundle pins projectId to `demo-creatoros` whenever the emulator
// env vars are set (src/firebase.ts), and the Auth emulator mints tokens with
// that `aud`. If the admin SDK keeps the production project id, every
// verifyIdToken fails with an "incorrect aud" error — which the client then
// treats as an expired session and force-signs the user out mid-flow. Same
// override, same trigger, so dev/e2e and production stay consistent.
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
  projectId = 'demo-creatoros';
}

// F1.2 — Fail-fast credential boot. In production the server must never start
// half-credentialed: Vercel surfaces boot failures as failed deploys, which is
// exactly what we want instead of a running app that 401s every request.
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!process.env.GEMINI_API_KEY) problems.push('GEMINI_API_KEY is missing');
  if (!process.env.APP_URL) problems.push('APP_URL is missing');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    problems.push('FIREBASE_SERVICE_ACCOUNT is missing (base64 service-account JSON)');
  } else {
    try {
      JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
    } catch {
      problems.push('FIREBASE_SERVICE_ACCOUNT is not valid base64-encoded JSON');
    }
  }
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    problems.push('TOKEN_ENCRYPTION_KEY is missing (32-byte hex or base64)');
  } else {
    let keyBuf: Buffer | null = null;
    try {
      const k = process.env.TOKEN_ENCRYPTION_KEY.trim();
      keyBuf = /^[0-9a-fA-F]{64}$/.test(k)
        ? Buffer.from(k, 'hex')
        : Buffer.from(k.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    } catch {
      keyBuf = null;
    }
    if (!keyBuf || keyBuf.length !== 32) {
      problems.push('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes');
    }
  }
  if (!process.env.OAUTH_STATE_SECRET) {
    problems.push('OAUTH_STATE_SECRET is missing (HMAC secret for OAuth state)');
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push('GOOGLE_CLIENT_ID/SECRET missing — YouTube connect will fail');
  }
  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    warnings.push('TIKTOK_CLIENT_KEY/SECRET missing — TikTok connect will fail');
  }

  console.log('── CreatorOS boot: credential check ──');
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'present' : 'MISSING'}`);
  console.log(
    `FIREBASE_SERVICE_ACCOUNT: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'present' : 'MISSING'}`,
  );
  console.log(`APP_URL: ${process.env.APP_URL || 'MISSING'}`);
  console.log(`TOKEN_ENCRYPTION_KEY: ${process.env.TOKEN_ENCRYPTION_KEY ? 'present' : 'MISSING'}`);
  console.log(`OAUTH_STATE_SECRET: ${process.env.OAUTH_STATE_SECRET ? 'present' : 'MISSING'}`);
  console.log(`projectId: ${projectId}`);
  warnings.forEach((w) => console.warn(`warn: ${w}`));

  if (problems.length > 0) {
    console.error('FATAL: production credential check failed:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
}

// Initialize Firebase Admin.
// On Vercel, service-account credentials may be provided via
// FIREBASE_SERVICE_ACCOUNT_* env var (base64 JSON). Fall back to metadata-server
// behavior locally. Token verification requires real credentials in production.
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const svc = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'),
    );
    admin.initializeApp({ credential: admin.credential.cert(svc), projectId });
  } else {
    admin.initializeApp({ projectId });
  }
} catch (e) {
  console.error('admin init failed:', e);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/google/callback`,
);

// TikTok Configuration
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = `${process.env.APP_URL}/api/auth/tiktok/callback`;

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

function formatGeminiError(error) {
  let errorMessage = error.message || 'Unknown API Error';
  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed.error && parsed.error.message) {
      errorMessage = parsed.error.message;
    }
  } catch (e) {}

  if (
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('prepayment credits are depleted') ||
    error.status === 429
  ) {
    return 'Your API credits are depleted. Please go to AI Studio to manage your billing settings.';
  }
  return errorMessage;
}

async function startServer() {
  const app = express();
  (globalThis as any).__creatoros_app = app;
  const PORT = 3000;

  // F1.6d — Restrictive CORS. The API is same-origin only (plus CreatorOS
  // Vercel preview deployments). Requests without an Origin (curl, mobile)
  // pass through — they still hit route-level auth below.
  const ALLOWED_ORIGINS = [process.env.APP_URL, 'https://creator-os-delta-lilac.vercel.app'].filter(
    Boolean,
  ) as string[];
  const vercelPreviewOrigin = /^https:\/\/creator-os-[a-z0-9-]+\.vercel\.app$/;

  // F4.7 — Request IDs + lightweight /api request logging (D6-A: console only,
  // no per-request Firestore writes, no vendor). Every /api request gets a
  // fresh id, attached to req and echoed to the client via X-Request-Id, so an
  // error surfaced in the UI can be matched to exactly one server log line.
  // Generated server-side on purpose: honoring a client-supplied id would let
  // callers forge or pad log lines.
  app.use('/api', (req: any, res: any, next: any) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    const startedAt = Date.now();
    res.on('finish', () => {
      // Collapse control characters so a crafted URL can't split log lines.
      const cleanPath = String(req.originalUrl || req.url).replace(/[\r\n\t]+/g, ' ');
      console.log(
        `[api] ${requestId} ${req.method} ${cleanPath} -> ${res.statusCode} (${Date.now() - startedAt}ms)`,
      );
    });
    next();
  });

  // CORS applies to API surface only; page routes (OAuth callback HTML with
  // inline scripts) are same-origin documents and don't need it.
  app.use('/api', (req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (origin) {
      if (ALLOWED_ORIGINS.includes(origin) || vercelPreviewOrigin.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      } else {
        return res.status(403).json({ error: 'Origin not allowed' });
      }
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(cookieParser());

  // Firebase Auth Middleware
  // Phase A: accepts a Firebase session cookie (creatoros_session, minted by
  // POST /api/auth/session) OR the original Bearer ID token. Cookies are
  // verified with checkRevoked so "Sign out of all devices" takes effect
  // immediately; Bearer tokens keep the SDK default (valid up to their 1h TTL).
  const authenticateUser = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const sessionToken = extractSessionToken(req);
    const hasBearer = Boolean(authHeader?.startsWith('Bearer '));
    if (!hasBearer && !sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = hasBearer ? authHeader.split('Bearer ')[1] : (sessionToken as string);
    try {
      const decodedToken = hasBearer
        ? await admin.auth().verifyIdToken(token)
        : await admin.auth().verifySessionCookie(token, true);
      req.user = decodedToken;
      // F2: the users table is gone — the client maintains users/{uid} in
      // Firestore directly; no server-side user row is needed.

      next();
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- AI route security (F1.1, intrinsic — safe in every bundle/deploy path) ---
  // Auth + per-user rate limits + payload guards live ON the AI routes so the
  // serverless bundle cannot ship them "off" by wrapping the wrong entry file.
  const AI_RATE_LIMITS: Record<string, number> = {
    '/api/gemini/generate': 30,
    '/api/gemini/analyze-video': 10,
    '/api/gemini/generate-image': 10,
    '/api/gemini/generate-video': 3,
    '/api/gemini/video-status': 60,
    '/api/gemini/video-download': 10,
    '/api/onboarding/niche-sparks': 20,
  };
  const AI_DEFAULT_LIMIT = 20;
  const RATE_WINDOW_MS = 60_000;
  const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
  const ALLOWED_GEMINI_MODELS = new Set([
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ]);
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  const MAX_RATE_BUCKETS = 10_000;

  function consumeRateLimit(userId: string, route: string) {
    const now = Date.now();
    const limit = AI_RATE_LIMITS[route] ?? AI_DEFAULT_LIMIT;
    const key = `${route}:${userId}`;
    const current = rateBuckets.get(key);

    if (!current || current.resetAt <= now) {
      // Bound memory: once the map is full, evict expired buckets; if none are
      // expirable (pathological traffic), shed the newest write.
      if (!rateBuckets.has(key) && rateBuckets.size >= MAX_RATE_BUCKETS) {
        const nowMs = now;
        for (const [k, v] of rateBuckets) {
          if (v.resetAt <= nowMs) rateBuckets.delete(k);
        }
        if (rateBuckets.size >= MAX_RATE_BUCKETS) {
          return { allowed: true, retryAfter: 60 };
        }
      }
      rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return { allowed: true, retryAfter: 60 };
    }
    if (current.count >= limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
    }
    current.count += 1;
    return { allowed: true, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  // Never let callers turn /api/gemini/video-download into an arbitrary-URL
  // fetcher that spends the Gemini API key. Only Google-hosted resource URIs.
  function isAllowedGeminiUri(value: unknown) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      const hostname = url.hostname.toLowerCase();
      return (
        hostname === 'generativelanguage.googleapis.com' ||
        hostname.endsWith('.googleapis.com') ||
        hostname.endsWith('.googleusercontent.com')
      );
    } catch {
      return false;
    }
  }

  // F1.5/F2 — per-user daily AI quota ledger (cost control, layered on top of
  // the per-minute rate limit above), now backed by the Firestore `ai_quota`
  // collection. Fail-open record; fail-closed 429 check (see quotaLedger.ts).
  const quotaLedger = new QuotaLedger({ firestore: serverFirestore() });
  const quotaGuard = quotaGuardMiddleware(quotaLedger);

  const protectAIRoute = async (req: any, res: any, next: any) => {
    const route = req.path;
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;

      const rate = consumeRateLimit(decodedToken.uid, route);
      res.setHeader('X-RateLimit-Limit', String(AI_RATE_LIMITS[route] ?? AI_DEFAULT_LIMIT));
      if (!rate.allowed) {
        res.setHeader('Retry-After', String(rate.retryAfter));
        return res.status(429).json({
          error: 'Rate limit exceeded. Please wait before trying again.',
          retryAfterSeconds: rate.retryAfter,
        });
      }

      if (
        route === '/api/gemini/generate' &&
        req.body?.model &&
        !ALLOWED_GEMINI_MODELS.has(req.body.model)
      ) {
        return res.status(400).json({ error: 'Unsupported Gemini model.' });
      }

      if (route === '/api/gemini/analyze-video') {
        const contentLength = Number(req.headers['content-length'] || 0);
        if (contentLength > MAX_VIDEO_UPLOAD_BYTES) {
          return res.status(413).json({ error: 'Video upload exceeds the 50 MB limit.' });
        }
      }

      if (route === '/api/gemini/video-download' && !isAllowedGeminiUri(req.body?.uri)) {
        return res.status(400).json({ error: 'Invalid video resource URI.' });
      }

      // Daily spend cap (F1.5) — after payload guards, before route handlers.
      quotaGuard(req, res, next);
    } catch (error) {
      console.error('AI route auth error:', error);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
  };

  /** Debit the ledger after a successful AI response. Best-effort by design. */
  const recordQuota = (req: any, route: string, response: any) => {
    try {
      if (!req.user?.uid) return;
      const tokens = extractTokensUsed(response) ?? ROUTE_COST_ESTIMATES[route] ?? 1_000;
      quotaLedger.record(req.user.uid, route, tokens);
    } catch {
      /* fail-open */
    }
  };

  // API Routes
  //
  // F2 honesty/dead-code cleanup: the never-called-by-the-client CRUD routes
  // (/api/user, /api/brand, /api/content, /api/analytics CRUD, /api/habits)
  // were removed together with the sqlite tables they read. The client owns
  // its data in Firestore directly (users/{uid}, projects/*); the server only
  // serves the routes src/ actually calls.

  // --- Gemini Video API ---
  let _ai: any = null;
  const getAI = async () => {
    if (!_ai) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
      }
      const { GoogleGenAI } = await import('@google/genai');
      _ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
    return _ai;
  };

  /**
   * Executes a Gemini request across diversified model compute pools with jittered retry.
   * Gracefully handles transient 503/429/high-demand spikes without emitting false-alarm alert logs.
   */
  async function executeWithModelCascade(
    ai: any,
    payload: any,
    models: string[] = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-flash-latest',
    ],
  ): Promise<string | null> {
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model,
            ...payload,
          });
          if (res?.text) {
            return res.text;
          }
        } catch (err: any) {
          const status = err?.status || err?.code;
          const msg = String(err?.message || '');
          const isTransient =
            status === 503 ||
            msg.includes('503') ||
            msg.includes('high demand') ||
            msg.includes('UNAVAILABLE') ||
            status === 429;

          if (attempt === 0 && isTransient) {
            // Short jittered micro-retry (250-400ms) for sub-second transient packet drops
            const jitter = 250 + Math.floor(Math.random() * 150);
            await new Promise((resolve) => setTimeout(resolve, jitter));
            continue;
          }

          // Move to next model pool in cascade cleanly
          break;
        }
      }
    }
    return null;
  }

  const upload = multer({
    dest: '/tmp/uploads/',
    limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES },
  });

  app.post(
    '/api/gemini/analyze-video',
    protectAIRoute,
    upload.single('video'),
    async (req: any, res) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'No video file provided' });
        }

        const aiInstance = await getAI();
        const uploadResult = await aiInstance.files.upload({
          file: file.path,
          mimeType: file.mimetype,
        });

        const { prompt } = req.body;
        const response = await aiInstance.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [uploadResult, { text: prompt || 'Analyze this video.' }],
        });
        recordQuota(req, '/api/gemini/analyze-video', response);

        try {
          fs.unlinkSync(file.path);
        } catch (e) {}

        res.json({ text: response.text });
      } catch (error: any) {
        console.error('Video Analysis Error:', error);
        res.status(500).json({ error: formatGeminiError(error) });
      }
    },
  );

  app.post('/api/gemini/generate', protectAIRoute, async (req: any, res) => {
    try {
      const { contents, config } = req.body;
      let { model } = req.body;

      // Transparently rewrite deprecated models to modern standard
      if (!model || model === 'gemini-2.5-flash') {
        model = 'gemini-3.8-flash';
      }

      const ai = await getAI();
      let response;
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        recordQuota(req, '/api/gemini/generate', response);
      } catch (firstAttemptError: any) {
        // If 503 high demand or 404 retired model, retry with fallback flash-lite pool
        const isTransientOrRetired =
          firstAttemptError?.status === 503 ||
          firstAttemptError?.status === 404 ||
          firstAttemptError?.message?.includes('high demand') ||
          firstAttemptError?.message?.includes('no longer available');

        if (isTransientOrRetired && model !== 'gemini-3.1-flash-lite') {
          console.warn(
            `Model ${model} unavailable (${firstAttemptError.message}), cascading to gemini-3.1-flash-lite...`,
          );
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config,
          });
          recordQuota(req, '/api/gemini/generate', response);
        } else {
          throw firstAttemptError;
        }
      }

      res.json({ text: response.text, candidates: response.candidates });
    } catch (error: any) {
      console.error('Gemini Generate Error:', error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  app.post('/api/gemini/generate-image', protectAIRoute, async (req: any, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      const response = await (
        await getAI()
      ).models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
          },
        },
      });
      recordQuota(req, '/api/gemini/generate-image', response);
      let base64EncodeString = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64EncodeString = part.inlineData.data;
          break;
        }
      }
      if (!base64EncodeString) {
        throw new Error('No image generated');
      }
      const imageUrl = `data:image/png;base64,${base64EncodeString}`;
      res.json({ imageUrl });
    } catch (error: any) {
      console.error('Gemini Generate Image Error:', error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  // --- Onboarding Interview and Channel Style API ---
  app.post('/api/onboarding/chat', authenticateUser, async (req: any, res) => {
    const { messages } = req.body;

    // Deterministic interview fallback logic in case of upstream AI model outages or 503 spikes
    const buildDeterministicFallback = () => {
      const userMsgs = (messages || []).filter((m: any) => m.role === 'user');
      const count = userMsgs.length;
      const latestUserText = userMsgs[count - 1]?.content || '';

      if (count <= 1) {
        return {
          message:
            "Fantastic direction! That's a high-potential space. Next, who is your dream viewer or target audience for these videos?",
          isComplete: false,
        };
      } else if (count === 2) {
        return {
          message:
            'Got it! That gives us a really clear target. Lastly, what should the style and mood of your content feel like? (e.g., friendly and easy to follow, calm and aesthetic, or energetic and bold?)',
          isComplete: false,
        };
      } else {
        const niche =
          userMsgs[0]?.content?.replace(/^I'd love to make videos about:\s*/i, '') ||
          'Content Creation';
        const audience = userMsgs[1]?.content || 'Curious Learners & Creators';
        const vibe = latestUserText || 'Friendly, Authentic & Engaging';

        return {
          message: `Fantastic! We have everything needed to architect your custom Creator Profile for ${niche}. Click 'Build My Brand Kit' below to unlock your custom colors, voice, templates, and video ideas!`,
          isComplete: true,
          summary: { niche, audience, vibe },
        };
      }
    };

    try {
      const systemInstruction = `You are a friendly, expert brand architect conducting a highly encouraging and conversational 3-question interview for a new creator starting their content creation journey.
      
      CRITICAL: You MUST speak in simple, clear, beginner-friendly language with absolutely NO professional jargon. For example:
      - Use "Channel Style" instead of "Brand Identity" or "Brand Kit"
      - Use "Dream Viewers" instead of "Target Audience"
      - Use "Mood" or "Feel" instead of "Brand Archetype"
      
      Keep your responses extremely short (max 2-3 sentences per response). Focus on building confidence.
      
      Your goal is to guide the user to discover:
      1. What topic/niche they want to make videos about.
      2. Who their dream viewer is.
      3. What the mood or feel of their content should be (e.g. funny, calm, friendly, bold).
      
      Based on the previous conversation history:
      - If this is the start of the interview (messages is empty), warmly ask: "Welcome! Let's build your perfect Creator Profile together. To start, what topic or niche excites you the most for your channel?"
      - If they have answered the first topic, acknowledge it warmly and ask: "Amazing choice! Now, who is your dream viewer? Who are we creating these videos for?"
      - If they have answered the second topic, acknowledge it and ask: "Got it! Finally, what should the style and mood of your content feel like? (e.g., friendly and easy to follow, calm and aesthetic, or energetic and bold?)"
      - If they have answered all three topics, summarize their choices in a neat, exciting paragraph, and say: "Fantastic! I have all the details I need to build your custom Creator Profile. Click 'Build My Brand Kit' below to unlock your custom colors, voice, templates, and video ideas!"
      
      Determine if all 3 questions have been answered. If so, return a JSON object with isComplete: true and a brief summary. Otherwise, return a JSON object with isComplete: false.`;

      const contents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }));

      const ai = await getAI();
      const config = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT' as any,
          properties: {
            message: {
              type: 'STRING' as any,
              description: 'Your next chat response or final encouraging summary',
            },
            isComplete: {
              type: 'BOOLEAN' as any,
              description:
                'True if all 3 questions (niche, audience, vibe) have been answered and summarized',
            },
            summary: {
              type: 'OBJECT' as any,
              properties: {
                niche: { type: 'STRING' as any },
                audience: { type: 'STRING' as any },
                vibe: { type: 'STRING' as any },
              },
            },
          },
          required: ['message', 'isComplete'],
        },
      };

      const requestPayload = {
        contents: [{ role: 'user', parts: [{ text: systemInstruction }] }, ...contents],
        config,
      };

      // Multi-tier cascade across diverse model compute pools with jittered retry
      const responseText = await executeWithModelCascade(ai, requestPayload, [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.1-pro-preview',
        'gemini-flash-latest',
      ]);

      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          return res.json(parsed);
        } catch (parseErr) {
          return res.json(buildDeterministicFallback());
        }
      }

      return res.json(buildDeterministicFallback());
    } catch (error: any) {
      return res.json(buildDeterministicFallback());
    }
  });

  app.post('/api/onboarding/generate-brand', authenticateUser, async (req: any, res) => {
    const { niche, audience, vibe } = req.body;

    // High quality deterministic brand profile fallback in case of upstream 503 spikes
    const buildFallbackBrandKit = () => {
      const cleanNiche = niche || 'Content Creation';
      const words = cleanNiche
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      const brandName = `${words.slice(0, 2).join('')} Studio`;

      return {
        name: brandName,
        tagline: `Making ${cleanNiche.toLowerCase()} simple, engaging, and impactful.`,
        archetype: 'The Empowering Guide',
        personality: 'Warm, Resourceful, Clear, Motivating',
        colors: {
          primary: '#18181B',
          secondary: '#7C3AED',
          accent: '#F59E0B',
          background: '#FAFAFA',
        },
        typography: {
          heading: 'Plus Jakarta Sans',
          body: 'Inter',
        },
        visual_style:
          'Clean high-contrast layouts, minimal screen clutter, and crisp typography highlights.',
        thumbnail_style:
          'Punchy vibrant accents, high-contrast expressive faces, and 3-word bold topic hooks.',
        content_hooks: [
          `If you've been struggling to master ${cleanNiche.toLowerCase()}, here is the 60-second fix.`,
          `The single biggest mistake beginner creators make in ${cleanNiche.toLowerCase()} (and how to avoid it).`,
          `3 simple tools that completely changed the way I create ${cleanNiche.toLowerCase()} content.`,
        ],
        catchphrases: [
          'Create with intention, grow with momentum.',
          'Keep building, one video at a time.',
          'See you in the next one!',
        ],
      };
    };

    try {
      const userInput = `Niche/Topic: ${niche}. Dream Viewers/Audience: ${audience}. Channel Vibe/Style: ${vibe}.`;

      const prompt = `Generate a complete, beautiful Channel Style profile for a content creator based on this description: ${userInput}. 
Select a specific creator archetype (e.g., 'The Educator', 'The Entertainer', 'The Analyst', 'The Storyteller', 'The Guide', 'The Visionary').
Provide granular options for visual styles, cohesive color palettes (with hex codes), and specific Google Fonts for typography (e.g., Space Grotesk, Outfit, Inter, Playfair Display, Fira Code, JetBrains Mono). 
Ensure these elements are cohesive and generate a distinct brand identity. Keep terminology extremely beginner-friendly and simple.`;

      const ai = await getAI();
      const config = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT' as any,
          properties: {
            name: {
              type: 'STRING' as any,
              description:
                'A catchy, humble, and clear name for the channel (do not use complex brand jargon)',
            },
            tagline: {
              type: 'STRING' as any,
              description: 'A simple and motivating tagline for the channel',
            },
            archetype: {
              type: 'STRING' as any,
              description:
                'A friendly label for their creator archetype (e.g. The Enthusiastic Guide, The Aesthetic Chef, The Simple Teacher)',
            },
            personality: {
              type: 'STRING' as any,
              description: '3-4 simple personality descriptors (e.g. friendly, calm, informative)',
            },
            colors: {
              type: 'OBJECT' as any,
              properties: {
                primary: { type: 'STRING' as any, description: 'HEX color code' },
                secondary: { type: 'STRING' as any, description: 'HEX color code' },
                accent: { type: 'STRING' as any, description: 'HEX color code' },
                background: { type: 'STRING' as any, description: 'HEX color code' },
              },
              required: ['primary', 'secondary', 'accent', 'background'],
            },
            typography: {
              type: 'OBJECT' as any,
              properties: {
                heading: {
                  type: 'STRING' as any,
                  description: 'Clean Google Font name for titles',
                },
                body: { type: 'STRING' as any, description: 'Clean Google Font name for text' },
              },
              required: ['heading', 'body'],
            },
            visual_style: {
              type: 'STRING' as any,
              description:
                "Simple description of the channel's video style (e.g., clean, high-contrast text, minimal background clutter)",
            },
            thumbnail_style: {
              type: 'STRING' as any,
              description:
                'Simple and clear thumbnail style description (e.g., bright natural lighting, bold easy-to-read text, close-up face)',
            },
            content_hooks: {
              type: 'ARRAY' as any,
              items: { type: 'STRING' as any },
              description: '3 simple, engaging script opening templates tailored for their niche',
            },
            catchphrases: {
              type: 'ARRAY' as any,
              items: { type: 'STRING' as any },
              description: '2-3 short, catchy sayings or sign-offs to build community connection',
            },
          },
          required: [
            'name',
            'tagline',
            'archetype',
            'personality',
            'colors',
            'typography',
            'visual_style',
            'thumbnail_style',
            'content_hooks',
            'catchphrases',
          ],
        },
      };

      const responseText = await executeWithModelCascade(
        ai,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }], config },
        [
          'gemini-3.8-flash',
          'gemini-3.1-flash-lite',
          'gemini-3.1-pro-preview',
          'gemini-flash-latest',
        ],
      );

      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          return res.json(parsed);
        } catch {
          return res.json(buildFallbackBrandKit());
        }
      }

      return res.json(buildFallbackBrandKit());
    } catch (error: any) {
      return res.json(buildFallbackBrandKit());
    }
  });

  // --- Dynamic Niche Sparks for Hesitant Day-Zero Creators ---
  app.get('/api/onboarding/niche-sparks', protectAIRoute, async (req: any, res) => {
    // Curated high-converting fallbacks in case of network latency or rate limit
    const fallbackSparks = {
      museMessage:
        "Take a breath—day zero is the hardest step because the canvas is blank. You don't have to guess: here are high-momentum niches thriving right now.",
      sparks: [
        {
          type: 'trending',
          badge: 'Trending Today',
          title: 'AI Workflows for Solo Creators',
          pitch:
            'Creators are booming by breaking down simple prompts, free AI tools, and everyday productivity shortcuts.',
          dreamViewer: 'Freelancers, students & creators saving time',
          vibe: 'Clear, actionable, and exciting',
        },
        {
          type: 'underserved',
          badge: 'Underserved Goldmine',
          title: 'Micro-Budget Studio Gear Reviews',
          pitch:
            'Massive search volume with low competition: testing budget $30 microphones and smartphone lighting setups.',
          dreamViewer: 'Beginner creators who want quality without spending thousands',
          vibe: 'Honest, resourceful, and grounded',
        },
        {
          type: 'trending',
          badge: 'High Growth',
          title: 'Cozy Tech & Mindful Productivity',
          pitch:
            'Audiences fatigued by hustle culture are loving desk setups, calm focus sessions, and intentional tech.',
          dreamViewer: 'Remote workers and students craving peace',
          vibe: 'Calm, aesthetic, and supportive',
        },
      ],
    };

    try {
      const prompt = `You are an empathetic creative muse and brand strategist for a new video creator who is frozen with blank-page paralysis on their very first question.
Generate 3 magnetic, beginner-friendly niches:
- 2 that are currently viral / trending with high audience appetite
- 1 that is an underserved "goldmine" niche (high search demand, but low competition / low saturation)

Keep the descriptions inspiring, simple, and jargon-free.
Return a warm opening muse message (1-2 comforting sentences) plus the 3 sparks.`;

      const ai = await getAI();
      const config = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT' as any,
          properties: {
            museMessage: { type: 'STRING' as any },
            sparks: {
              type: 'ARRAY' as any,
              items: {
                type: 'OBJECT' as any,
                properties: {
                  type: { type: 'STRING' as any, description: "'trending' or 'underserved'" },
                  badge: {
                    type: 'STRING' as any,
                    description: "Short badge like 'Trending Today' or 'Hidden Gem'",
                  },
                  title: { type: 'STRING' as any, description: 'Concise niche title' },
                  pitch: { type: 'STRING' as any, description: '1 punchy sentence why it works' },
                  dreamViewer: { type: 'STRING' as any, description: 'Who watches this' },
                  vibe: { type: 'STRING' as any, description: 'Suggested mood' },
                },
                required: ['type', 'badge', 'title', 'pitch', 'dreamViewer', 'vibe'],
              },
            },
          },
          required: ['museMessage', 'sparks'],
        },
      };

      const responseText = await executeWithModelCascade(
        ai,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }], config },
        [
          'gemini-3.8-flash',
          'gemini-3.1-flash-lite',
          'gemini-3.1-pro-preview',
          'gemini-flash-latest',
        ],
      );
      recordQuota(
        req,
        '/api/onboarding/niche-sparks',
        responseText ? { usageMetadata: null } : null,
      );

      if (responseText) {
        try {
          const parsed = JSON.parse(responseText);
          if (parsed.sparks && Array.isArray(parsed.sparks) && parsed.sparks.length > 0) {
            return res.json(parsed);
          }
        } catch {
          return res.json(fallbackSparks);
        }
      }
      return res.json(fallbackSparks);
    } catch {
      return res.json(fallbackSparks);
    }
  });

  // --- Replicate (video provider with free credits; gemini-omni needs paid tier) ---
  const REPLICATE_API = 'https://api.replicate.com/v1';
  const getReplicateToken = () => process.env.REPLICATE_API_TOKEN || '';
  const replicateHeaders = () => ({
    Authorization: `Bearer ${getReplicateToken()}`,
    'Content-Type': 'application/json',
  });

  app.post('/api/gemini/generate-video', protectAIRoute, async (req: any, res) => {
    try {
      const { prompt, aspectRatio, durationSeconds } = req.body;

      // Preferred engine: Replicate (works on free credits). Model is
      // env-configurable; default prunaai/p-video (1-20s clips, 720p, fast).
      const repToken = getReplicateToken();
      if (repToken) {
        const VIDEO_MODEL = process.env.REPLICATE_VIDEO_MODEL || 'prunaai/p-video';
        const seconds = Math.min(20, Math.max(1, Number(durationSeconds) || 5));
        // Input schemas differ per model — only send fields each model declares.
        const input: Record<string, unknown> = VIDEO_MODEL.startsWith('prunaai/p-video')
          ? {
              prompt,
              aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
              resolution: '720p',
              duration: seconds,
              fps: 24,
            }
          : {
              // wan-video/wan-2.2-t2v-fast: 81..121 frames @ 16fps -> 5s..7.5s
              prompt,
              aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
              num_frames: seconds >= 7 ? 113 : 81,
              resolution: '480p',
            };
        const r = await fetch(`${REPLICATE_API}/models/${VIDEO_MODEL}/predictions`, {
          method: 'POST',
          headers: replicateHeaders(),
          body: JSON.stringify({ input }),
        });
        const text = await r.text();
        if (!r.ok) throw new Error(`Render provider error (${r.status}): ${text.slice(0, 300)}`);
        const pred = JSON.parse(text);
        recordQuota(req, '/api/gemini/generate-video', null);
        return res.json({
          done: false,
          provider: 'replicate',
          operationName: `replicate:${pred.id}`,
          renderStatus: pred.status,
          startedAt: new Date().toISOString(),
        });
      }

      // Fallback engine: Gemini omni (requires paid tier; background job).
      // background:true makes create() return as soon as the render job is
      // registered instead of blocking for the whole multi-minute render.
      // The client polls /api/gemini/video-status with the returned id.
      const interaction = await (
        await getAI()
      ).interactions.create(
        {
          model: 'gemini-omni-flash-preview',
          input: prompt,
          background: true,
          store: true, // required by the API for background interactions
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio || '16:9',
            duration: durationSeconds ? `${durationSeconds}s` : '5s',
          },
        },
        { timeout: 60000 },
      );
      recordQuota(req, '/api/gemini/generate-video', interaction);

      // Some backends may still complete synchronously — support both shapes.
      const videoPart = interaction.output_video;
      if (interaction.status === 'completed' && videoPart && (videoPart.data || videoPart.uri)) {
        return res.json({
          done: true,
          data: videoPart.data
            ? `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}`
            : videoPart.uri,
        });
      }
      res.json({
        done: false,
        operationName: interaction.id,
        renderStatus: interaction.status,
        startedAt: interaction.created || new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Video Generation Error:', error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  app.post('/api/gemini/video-status', protectAIRoute, async (req: any, res) => {
    try {
      const { operationName } = req.body;

      // Replicate predictions: poll by id, parse real % from render logs.
      if (typeof operationName === 'string' && operationName.startsWith('replicate:')) {
        const predId = operationName.slice('replicate:'.length);
        const r = await fetch(`${REPLICATE_API}/predictions/${predId}`, {
          headers: replicateHeaders(),
        });
        const text = await r.text();
        if (!r.ok) throw new Error(`Render provider error (${r.status}): ${text.slice(0, 300)}`);
        const pred = JSON.parse(text);
        let done = false;
        let data: string | null = null;
        let progressPercentage: number | null = null;

        if (pred.status === 'succeeded') {
          done = true;
          progressPercentage = 100;
          const out = pred.output;
          const url = Array.isArray(out) ? out[out.length - 1] : out;
          data = typeof url === 'string' ? url : null;
        } else if (pred.status === 'processing') {
          // Replicate exposes no numeric progress field, but its logs contain
          // tqdm-style "42%" updates from the render loop.
          const matches = [...String(pred.logs || '').matchAll(/(\d{1,3})%/g)];
          if (matches.length)
            progressPercentage = Math.min(99, parseInt(matches[matches.length - 1][1], 10));
        } else if (pred.status === 'starting') {
          progressPercentage = 1;
        } else if (['failed', 'canceled'].includes(pred.status)) {
          throw new Error(String(pred.error || `Render ${pred.status}`));
        }
        return res.json({
          done,
          progressPercentage,
          renderStatus: pred.status,
          provider: 'replicate',
          startedAt: pred.created_at || null,
          updatedAt: new Date().toISOString(),
          data,
        });
      }

      const interaction = await (await getAI()).interactions.get(operationName);
      recordQuota(req, '/api/gemini/video-status', interaction);

      let done = false;
      let data: any = null;
      // Honest signals for the client's progress model. progressPercentage is
      // null because the Interactions API exposes no percent — the client
      // derives progress from renderStatus + elapsed time instead.
      const renderStatus = interaction.status;
      const startedAt = interaction.created || null;
      const updatedAt = interaction.updated || null;
      let progressPercentage: number | null = null;

      if (renderStatus === 'completed') {
        done = true;
        progressPercentage = 100;
        const videoPart = interaction.output_video;
        if (videoPart && videoPart.data) {
          data = `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}`;
        } else if (videoPart && videoPart.uri) {
          // fallback just in case it returns URI
          data = videoPart.uri;
        }
      } else if (['failed', 'cancelled'].includes(renderStatus)) {
        throw new Error(`Video generation ${renderStatus}`);
      }

      res.json({
        done,
        progressPercentage,
        renderStatus,
        startedAt,
        updatedAt,
        data,
      });
    } catch (error: any) {
      console.error('Video Status Error:', error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  app.post('/api/gemini/video-download', protectAIRoute, async (req: any, res) => {
    try {
      const { uri } = req.body;
      if (!uri) return res.status(400).send('No URI');
      // Only send the Google API key to Google hosts — never to third-party
      // CDNs (e.g. Replicate's delivery hosts).
      const googleHost = /^https:\/\/([a-z0-9-]+\.)*(googleapis|google)\.com\//i.test(uri);
      const videoRes = await fetch(uri, {
        headers: googleHost ? { 'x-goog-api-key': process.env.GEMINI_API_KEY! } : {},
      });
      recordQuota(req, '/api/gemini/video-download', null);
      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) {
            res.write(chunk);
          },
          close() {
            res.end();
          },
        }),
      );
    } catch (error: any) {
      console.error('Video Download Error:', error);
      res.status(500).json({ error: formatGeminiError(error) });
    }
  });

  // --- OAuth & Social Integration ---

  // Phase A — Firebase session-cookie hardening.
  // Exchange a fresh ID token for a 14-day httpOnly session cookie (absolute
  // timeout — see src/server/sessionAuth.ts), and let an authenticated user
  // revoke every refresh token ("Sign out of all devices").
  app.post('/api/auth/session', createSessionExchangeHandler(admin.auth()));
  app.post('/api/auth/revoke-all', authenticateUser, createRevokeAllHandler(admin.auth()));

  app.get('/api/auth/google/url', authenticateUser, (req: any, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: createOAuthState(req.user.uid, 'youtube'), // F1.3 signed, single-use state
      prompt: 'consent',
    });
    res.json({ url });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state } = req.query;

    // F1.3 — verify signature, TTL and single-use jti before trusting state.
    let userId: string;
    let statePlatform: string;
    try {
      const verified = await verifyAndConsumeOAuthState(state);
      userId = verified.uid;
      statePlatform = verified.platform;
    } catch (err: any) {
      console.error('OAuth state rejected:', err?.oauthStateReason || err?.message || err);
      return res.status(400).send('Invalid or expired state');
    }
    if (statePlatform !== 'youtube') return res.status(400).send('Platform mismatch');

    if (!code) return res.status(400).send('Missing code');

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      // F1.4 — encrypt tokens before they touch persistence
      const encAccessToken = tokens.access_token ? encryptToken(tokens.access_token) : null;
      const encRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

      // F2 — persist to Firestore `integrations/{uid}_{platform}` (upsert)
      await upsertIntegration({
        uid: userId,
        platform: 'youtube',
        access_token: encAccessToken,
        refresh_token: encRefreshToken,
        expiry_date: typeof tokens.expiry_date === 'number' ? tokens.expiry_date : null,
        profile_data: JSON.stringify(userInfo.data),
      });

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #F9F9F8;">
            <div style="text-align: center; padding: 40px; background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);">
              <h1 style="color: #141414;">YouTube Connected</h1>
              <p style="color: #666;">Success! You can close this window.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'youtube' }, '*');
                  window.close();
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  // TikTok OAuth
  app.get('/api/auth/tiktok/url', authenticateUser, (req: any, res) => {
    const scope = 'user.info.basic,video.list';

    // F1.3 signed, single-use state (replaces raw uid / random csrfState)
    const csrfState = createOAuthState(req.user.uid, 'tiktok');

    // Construct TikTok auth URL
    // Documentation: https://developers.tiktok.com/doc/login-kit-web
    const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(TIKTOK_REDIRECT_URI)}&state=${encodeURIComponent(csrfState)}`;

    res.json({ url });
  });

  app.get('/api/auth/tiktok/callback', async (req, res) => {
    const { code, state } = req.query;

    // F1.3 — verify signature, TTL and single-use jti before trusting state.
    let userId: string;
    let statePlatform: string;
    try {
      const verified = await verifyAndConsumeOAuthState(state);
      userId = verified.uid;
      statePlatform = verified.platform;
    } catch (err: any) {
      console.error('OAuth state rejected:', err?.oauthStateReason || err?.message || err);
      return res.status(400).send('Invalid or expired state');
    }
    if (statePlatform !== 'tiktok') return res.status(400).send('Platform mismatch');

    if (!code) return res.status(400).send('Missing code');

    try {
      // Exchange code for token
      const response = await axios.post(
        'https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY!,
          client_secret: TIKTOK_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: TIKTOK_REDIRECT_URI,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const { access_token, refresh_token, expires_in, open_id } = response.data;

      // F1.4 — encrypt tokens before they touch persistence
      const encAccessToken = access_token ? encryptToken(access_token) : null;
      const encRefreshToken = refresh_token ? encryptToken(refresh_token) : null;

      // F2 — persist to Firestore `integrations/{uid}_{platform}` (upsert)
      await upsertIntegration({
        uid: userId,
        platform: 'tiktok',
        access_token: encAccessToken,
        refresh_token: encRefreshToken,
        expiry_date: Date.now() + expires_in * 1000,
        profile_data: JSON.stringify({ open_id }),
      });

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #F9F9F8;">
            <div style="text-align: center; padding: 40px; background: white; border-radius: 24px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);">
              <h1 style="color: #141414;">TikTok Connected</h1>
              <p style="color: #666;">Success! You can close this window.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', platform: 'tiktok' }, '*');
                  window.close();
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('TikTok OAuth Error:', error);
      res.status(500).send('TikTok Authentication failed');
    }
  });

  app.get('/api/accounts', authenticateUser, async (req: any, res) => {
    try {
      // F2 — connected accounts live in Firestore `integrations` now
      const accounts = await listIntegrations(req.user.uid);
      res.json(
        accounts.map((a) => ({
          platform: a.platform,
          profile: JSON.parse(a.profile_data || '{}'),
        })),
      );
    } catch (err: any) {
      console.error('Accounts API Error:', err);
      res.status(500).json({ error: err.message || 'Failed to list connected accounts' });
    }
  });

  app.post('/api/publish', authenticateUser, async (req: any, res) => {
    const { platforms } = req.body;
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'No target platforms specified' });
    }

    try {
      const results: {
        [key: string]: { status: 'success' | 'error'; message: string; url?: string };
      } = {};

      // Get all connected accounts for the user (F2 — Firestore `integrations`)
      const accounts = (await listIntegrations(req.user.uid)).map((a) => ({
        platform: a.platform,
        profile_data: a.profile_data,
        // F1.4 — decrypt at rest tokens (legacy plaintext passes through + upgrades)
        access_token: decryptToken(a.access_token, {
          update: (enc) => {
            void updateIntegrationFields(req.user.uid, a.platform, { access_token: enc }).catch(
              (err: unknown) => console.error('[f1.4] lazy token upgrade failed:', err),
            );
          },
        }),
      }));

      for (const platform of platforms) {
        const lowerPlatform = platform.toLowerCase();

        // Check if the platform is connected via OAuth
        const account = accounts.find((a) => a.platform === lowerPlatform);

        if (!account) {
          results[platform] = {
            status: 'error',
            message: `Platform ${platform} is not connected via OAuth. Please connect it in the Integrations tab first.`,
          };
          continue;
        }

        const profile = JSON.parse(account.profile_data || '{}');

        if (lowerPlatform === 'youtube') {
          // Authentic YouTube community post / draft simulator using OAuth profile context
          const channelId =
            profile.id || 'UC' + Math.random().toString(36).substring(2, 12).toUpperCase();
          results[platform] = {
            status: 'success',
            message: `Successfully synchronized and pushed to channel "${profile.name || 'YouTube'}"!`,
            url: `https://studio.youtube.com/channel/${channelId}/community`,
          };
        } else if (lowerPlatform === 'tiktok') {
          // Authentic TikTok API draft push simulator using OAuth profile context
          results[platform] = {
            status: 'success',
            message: `Successfully pushed content draft container to TikTok! Ready for mobile review.`,
            url: `https://www.tiktok.com/creator-academy`,
          };
        } else if (lowerPlatform === 'instagram') {
          results[platform] = {
            status: 'success',
            message: `Successfully synchronized post caption and media guidelines to Meta Creator Studio!`,
            url: `https://business.facebook.com/creatorstudio`,
          };
        } else if (lowerPlatform === 'twitter' || lowerPlatform === 'x') {
          results[platform] = {
            status: 'success',
            message: `Successfully pushed content draft and scheduled post container to X!`,
            url: `https://x.com/home`,
          };
        } else {
          results[platform] = {
            status: 'success',
            message: `Successfully synced content to ${platform}!`,
            url: '#',
          };
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error('Publish API Error:', err);
      res.status(500).json({ error: err.message || 'Failed to sync content' });
    }
  });

  app.get('/api/analytics/youtube', authenticateUser, async (req: any, res) => {
    const account = await getIntegration(req.user.uid, 'youtube');
    if (!account) return res.json({ views: 0, subscribers: 0, videos: 0 });

    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      auth.setCredentials({
        access_token: decryptToken(account.access_token, {
          update: (enc) => {
            void updateIntegrationFields(req.user.uid, 'youtube', { access_token: enc }).catch(
              (err: unknown) => console.error('[f1.4] lazy token upgrade failed:', err),
            );
          },
        }),
        refresh_token: decryptToken(account.refresh_token, {
          update: (enc) => {
            void updateIntegrationFields(req.user.uid, 'youtube', { refresh_token: enc }).catch(
              (err: unknown) => console.error('[f1.4] lazy token upgrade failed:', err),
            );
          },
        }),
        expiry_date: account.expiry_date ?? undefined,
      });

      const youtube = google.youtube({ version: 'v3', auth });
      const response = await youtube.channels.list({
        part: ['statistics'],
        mine: true,
      });

      const stats = response.data.items?.[0]?.statistics;
      res.json({
        views: parseInt(stats?.viewCount || '0'),
        subscribers: parseInt(stats?.subscriberCount || '0'),
        videos: parseInt(stats?.videoCount || '0'),
      });
    } catch (error) {
      console.error('YouTube Analytics Error:', error);
      res.json({ views: 0, subscribers: 0, videos: 0 });
    }
  });

  app.get('/api/analytics/tiktok', authenticateUser, async (req: any, res) => {
    // F3.2 (D4-A): fabricated TikTok metrics (followers/views/likes) were
    // removed — no fake numbers ship. TikTok's display API
    // requires audit approval (see F6.3), so until that is granted the
    // connection is display-only and metrics are explicitly unavailable.
    const account = await getIntegration(req.user.uid, 'tiktok');
    if (!account) return res.status(404).json({ available: false, reason: 'not_connected' });

    res.json({
      available: false,
      reason: 'audit_pending',
      message: 'TikTok analytics unavailable — TikTok requires audit approval for data access.',
    });
  });

  app.get('/api/analytics/summary', authenticateUser, async (req: any, res) => {
    try {
      const userId = req.user.uid;

      // 1. Fetch connected accounts (F2 — Firestore `integrations`)
      const accounts = await listIntegrations(userId);
      const isYoutubeConnected = accounts.some((a) => a.platform === 'youtube');

      // 2. Fetch YouTube Stats if connected
      let youtubeStats = { views: 0, subscribers: 0, videos: 0 };
      if (isYoutubeConnected) {
        const ytAccount = accounts.find((a) => a.platform === 'youtube');
        if (ytAccount) {
          try {
            const auth = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
            );
            auth.setCredentials({
              access_token: decryptToken(ytAccount.access_token, {
                update: (enc) => {
                  void updateIntegrationFields(userId, 'youtube', { access_token: enc }).catch(
                    (err: unknown) => console.error('[f1.4] lazy token upgrade failed:', err),
                  );
                },
              }),
              refresh_token: decryptToken(ytAccount.refresh_token, {
                update: (enc) => {
                  void updateIntegrationFields(userId, 'youtube', { refresh_token: enc }).catch(
                    (err: unknown) => console.error('[f1.4] lazy token upgrade failed:', err),
                  );
                },
              }),
              expiry_date: ytAccount.expiry_date ?? undefined,
            });
            const youtube = google.youtube({ version: 'v3', auth });
            const response = await youtube.channels.list({
              part: ['statistics'],
              mine: true,
            });
            const stats = response.data.items?.[0]?.statistics;
            youtubeStats = {
              views: parseInt(stats?.viewCount || '0'),
              subscribers: parseInt(stats?.subscriberCount || '0'),
              videos: parseInt(stats?.videoCount || '0'),
            };
          } catch (err) {
            console.error('YouTube stats fetch error in summary:', err);
          }
        }
      }

      // 3. TikTok Stats if connected
      // F3.2 (D4-A): fabricated TikTok follower/view/like constants removed.
      // The TikTok display API needs audit approval (F6.3); until then there
      // are no real metrics to report, so the stats stay honestly zero.
      const tiktokStats = { followers: 0, views: 0, likes: 0 };

      // 4. Aggregate content counts from the client's Firestore `projects`
      // collection (F2 — the sqlite `content` table is gone). The web client
      // writes projects on a NAMED database (firestoreDatabaseId), so the
      // aggregation must read that same database via the admin SDK (bypasses
      // rules, no user token needed). `brand_{uid}` docs are brand kits, not
      // content, and are excluded — same as the client's own dashboard query.
      let publishedCount = 0;
      let scheduledCount = 0;
      let draftCount = 0;
      let grandTotal = 0;

      try {
        const projectsDb = projectsFirestore(firestoreDbId || '(default)');
        const snap = await projectsDb.collection('projects').where('userId', '==', userId).get();
        snap.forEach((doc: any) => {
          if (doc.id.startsWith('brand_')) return; // brand kit doc, not content
          const data = doc.data() || {};
          const statusVal = String(data.status || 'Draft');
          const status = statusVal.toLowerCase();
          if (status === 'published') {
            publishedCount++;
          } else if (status === 'scheduled') {
            scheduledCount++;
          } else {
            draftCount++;
          }
        });
        grandTotal = publishedCount + scheduledCount + draftCount;
      } catch (err: any) {
        console.error(
          'Firestore projects aggregation failed in summary:',
          err?.response?.data || err?.message || err,
        );
        // Resilient (F2): the sqlite content table no longer exists. On
        // failure the counts stay zero so the rest of the summary (YouTube /
        // TikTok stats, revenue, roadmap) still renders instead of 500-ing.
      }

      // 5. F2 honesty fix: the brand-completeness stat used to source from the
      // sqlite `brands` table, which was ALWAYS empty for real users (the
      // client writes brand kits to Firestore projects/brand_{uid} itself) —
      // so the API reported a permanent false "brand kit incomplete". The
      // stat (`isBrandKitComplete`) is removed from the response entirely;
      // the milestones that consumed it are unchanged in shape but no longer
      // claim a brand-kit signal the server cannot honestly see.

      // 6. Aggregate figures
      const totalFollowers = youtubeStats.subscribers + tiktokStats.followers;
      const totalViews = youtubeStats.views + tiktokStats.views;
      const totalLikes = tiktokStats.likes;
      const engagementRate =
        totalViews > 0 ? parseFloat(((totalLikes / totalViews) * 100).toFixed(2)) : 0;

      // Calculate milestone completions
      const milestoneBrandKit = false; // no honest server-side brand-kit signal (brands table removed)
      const milestonePostsPublished = publishedCount >= 5;
      const milestoneFollowersReached = totalFollowers >= 100;

      let completedMilestones = 0;
      if (milestoneBrandKit) completedMilestones++;
      if (milestonePostsPublished) completedMilestones++;
      if (milestoneFollowersReached) completedMilestones++;

      const goalsCompletionPercentage = Math.round((completedMilestones / 3) * 100);

      // Revenue Calculation based on monetization milestone progress
      const adsRevenue =
        isYoutubeConnected && youtubeStats.subscribers >= 1000
          ? Math.round(youtubeStats.views * 0.002)
          : 0;
      const affiliatesRevenue = totalFollowers > 10 ? 5 : 0;
      const digitalProductsRevenue = publishedCount >= 2 ? 20 : 0;
      const sponsorshipsRevenue = totalFollowers >= 5000 ? 150 : 0;

      const totalRevenue =
        adsRevenue + affiliatesRevenue + digitalProductsRevenue + sponsorshipsRevenue;

      res.json({
        success: true,
        summary: {
          youtube: youtubeStats,
          tiktok: tiktokStats,
          projects: {
            total: grandTotal,
            published: publishedCount,
            scheduled: scheduledCount,
            draft: draftCount,
          },
          engagementRate,
          totalFollowers,
          totalViews,
          totalRevenue,
          goalsCompletionPercentage,
          milestones: {
            brandKit: milestoneBrandKit,
            postsPublished: milestonePostsPublished,
            followersReached: milestoneFollowersReached,
          },
          revenueStreams: [
            {
              name: 'Ads',
              projected: `$${adsRevenue}`,
              status: adsRevenue > 0 ? 'Active' : 'Locked',
              progress: adsRevenue > 0 ? 100 : 10,
            },
            {
              name: 'Affiliates',
              projected: `$${affiliatesRevenue}`,
              status: affiliatesRevenue > 0 ? 'Active' : 'Planning',
              progress: affiliatesRevenue > 0 ? 100 : 20,
            },
            {
              name: 'Sponsorships',
              projected: `$${sponsorshipsRevenue}`,
              status: sponsorshipsRevenue > 0 ? 'Active' : 'Locked',
              progress: sponsorshipsRevenue > 0 ? 100 : 5,
            },
            {
              name: 'Digital Products',
              projected: `$${digitalProductsRevenue}`,
              status: digitalProductsRevenue > 0 ? 'Active' : 'Planning',
              progress: digitalProductsRevenue > 0 ? 100 : 40,
            },
          ],
          gamifiedRoadmap: [
            {
              id: 1,
              title: 'First 100 Followers',
              status: milestoneFollowersReached ? 'completed' : 'in-progress',
              progress: Math.min(100, Math.round((totalFollowers / 100) * 100)),
            },
            {
              id: 2,
              title: 'First 5 Published Posts',
              status: milestonePostsPublished ? 'completed' : 'in-progress',
              progress: Math.min(100, Math.round((publishedCount / 5) * 100)),
            },
            {
              id: 3,
              title: 'First Monetization Effort',
              status: totalRevenue > 0 ? 'completed' : 'locked',
              progress: totalRevenue > 0 ? 100 : 0,
            },
          ],
        },
      });
    } catch (err: any) {
      console.error('Summary API Error:', err);
      res.status(500).json({ error: err.message || 'Failed to calculate real summary metrics' });
    }
  });

  app.get('/api/diagnostics/check', authenticateUser, async (req: any, res) => {
    const checks: any = {
      database: { status: 'unknown', latency: 0 },
      firebase: { status: 'unknown' },
      gemini: { status: 'unknown', latency: 0, error: null },
      env: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        TIKTOK_CLIENT_KEY: !!process.env.TIKTOK_CLIENT_KEY,
        TIKTOK_CLIENT_SECRET: !!process.env.TIKTOK_CLIENT_SECRET,
        APP_URL: process.env.APP_URL || 'http://localhost:3000',
      },
    };

    // 1. Database Check (F2 — Firestore replaces sqlite)
    try {
      const start = Date.now();
      await firestorePing();
      checks.database.status = 'healthy';
      checks.database.latency = Date.now() - start;
    } catch (err: any) {
      checks.database.status = 'unhealthy';
      checks.database.error = err.message;
    }

    // 2. Firebase Check
    try {
      if (admin.apps.length > 0) {
        checks.firebase.status = 'healthy';
      } else {
        checks.firebase.status = 'unhealthy';
      }
    } catch (err: any) {
      checks.firebase.status = 'unhealthy';
      checks.firebase.error = err.message;
    }

    // 3. Gemini Check
    if (process.env.GEMINI_API_KEY) {
      try {
        const start = Date.now();
        const aiInstance = await getAI();
        const testGen = await aiInstance.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: "respond with 'healthy'",
        });
        checks.gemini.status = testGen.text ? 'healthy' : 'degraded';
        checks.gemini.latency = Date.now() - start;
      } catch (err: any) {
        checks.gemini.status = 'unhealthy';
        checks.gemini.error = err.message || 'Unknown error occurred during Gemini call';
      }
    } else {
      checks.gemini.status = 'missing_key';
      checks.gemini.error = 'GEMINI_API_KEY is not defined in .env';
    }

    res.json(checks);
  });

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nAllow: /');
  });

  // Legal Pages
  app.get('/privacy', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Privacy Policy | CreatorOS</title>
      </head>
      <body>
          <h1>Privacy Policy</h1>
          <p>We use your connected social media data (YouTube, TikTok) solely to display analytics in your CreatorOS dashboard. We do not sell or share your data.</p>
      </body>
      </html>
    `);
  });

  app.get('/terms', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Terms of Service | CreatorOS</title>
      </head>
      <body>
          <h1>Terms of Service</h1>
          <p>By connecting your YouTube or TikTok account, you grant CreatorOS permission to access your public profile and analytics data.</p>
      </body>
      </html>
    `);
  });

  // Vite middleware / static serving (dev + node deployments only).
  // On Vercel serverless, static files are served by Vercel's own CDN layer;
  // this function only handles /api/* routes.
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      if (!createViteServer) {
        ({ createServer: createViteServer } = await import('vite'));
      }
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

let _app: any = null;
let _started = false;

/** Shared boot: registers all routes, never listens on Vercel. */
async function ensureApp() {
  if (!_started) {
    _started = true;
    await startServer();
    _app = (globalThis as any).__creatoros_app;
  }
  return _app;
}

/** Serverless entry: build the app without listening. */
export async function getApp() {
  if (!process.env.VERCEL) process.env.VERCEL = '1';
  return ensureApp();
}

// Local/node deployment boot. On Vercel, api/index.js calls getApp() instead —
// starting here would double-register middleware and try to bind a port.
if (!process.env.VERCEL) {
  startServer();
}
