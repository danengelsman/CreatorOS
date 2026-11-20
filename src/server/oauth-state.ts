// F1.3 — OAuth state HMAC. Signed, single-use, 10-minute TTL state values for
// the Google and TikTok connect flows. Replaces the old practice of passing
// the raw Firebase uid through `state`, which let anyone link platform tokens
// to an account they could name.
//
// Format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payload, secret))
// Payload: { uid, iat, exp, jti, aud: 'oauth', platform }
//
// jti single-use is enforced transactionally in Firestore ('oauth_states'
// collection, doc id = jti). The Firestore store can be swapped for an
// in-memory one via setOauthStateStore() (used by the probe/test harness).

import crypto from 'crypto';
import admin from 'firebase-admin';

const STATE_TTL_MS = 10 * 60 * 1000;
const AUD = 'oauth';

interface StatePayload {
  uid: string;
  platform: string;
  iat: number;
  exp: number;
  jti: string;
  aud: string;
}

export interface OauthStateStore {
  consume(jti: string): Promise<boolean>;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function secret(): string {
  const s = process.env.OAUTH_STATE_SECRET;
  if (!s) throw new Error('OAUTH_STATE_SECRET is not set');
  return s;
}

/**
 * Create a signed state string for the given user/platform.
 */
export function createOAuthState(uid: string, platform: string): string {
  const now = Date.now();
  const payload: StatePayload = {
    uid,
    platform,
    iat: now,
    exp: now + STATE_TTL_MS,
    jti: crypto.randomUUID(),
    aud: AUD,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Verify signature + TTL, then transactionally consume the jti.
 * Returns the payload on success; throws Error with a safe message on any
 * failure (bad signature, expired, replayed, malformed).
 */
export async function verifyAndConsumeOAuthState(state: unknown): Promise<StatePayload> {
  const fail = (msg: string) => {
    const err = new Error(msg) as Error & { oauthStateReason?: string };
    err.oauthStateReason = msg;
    throw err;
  };

  if (typeof state !== 'string' || state.length === 0 || state.length > 4096) {
    return fail('invalid state');
  }
  const dot = state.indexOf('.');
  if (dot <= 0 || dot === state.length - 1) return fail('invalid state');

  const body = state.slice(0, dot);
  const givenSig = state.slice(dot + 1);

  const expected = b64url(crypto.createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(givenSig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return fail('invalid state signature');
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8')) as StatePayload;
  } catch {
    return fail('invalid state payload');
  }
  if (!payload || typeof payload.uid !== 'string' || typeof payload.platform !== 'string') {
    return fail('invalid state payload');
  }
  if (payload.aud !== AUD) return fail('invalid state audience');

  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    return fail('state expired');
  }

  // Single-use: transactionally consume the jti.
  const consumed = await getStore().consume(payload.jti);
  if (!consumed) return fail('state already used');

  return payload;
}

// --- Firestore-backed store (production default) ---

let _store: OauthStateStore | null = null;

function getStore(): OauthStateStore {
  if (_store) return _store;
  if (admin.apps.length === 0) {
    throw new Error('Firebase admin not initialized — cannot enforce OAuth state single-use');
  }
  const firestore = admin.firestore();
  const states = firestore.collection('oauth_states');
  _store = {
    async consume(jti: string): Promise<boolean> {
      return firestore.runTransaction(async (tx) => {
        const ref = states.doc(jti);
        const doc = await tx.get(ref);
        if (!doc.exists || doc.data()?.consumed === true) return false;
        tx.set(ref, {
          uid: doc.data()?.uid ?? null,
          createdAt: doc.data()?.createdAt ?? Date.now(),
          consumed: true,
        });
        return true;
      });
    },
  };
  return _store;
}

/** Test/alternate-environment hook: replace the jti store. Pass null to reset. */
export function setOauthStateStore(store: OauthStateStore | null): void {
  _store = store;
}

/** TTL for callers that need to mirror it (e.g. diagnostics). */
export const OAUTH_STATE_TTL_MS = STATE_TTL_MS;
