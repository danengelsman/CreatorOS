import type { Request, Response } from 'express';
import type { Auth } from 'firebase-admin/auth';

/**
 * Phase A — Firebase session-cookie auth (free-tier compatible).
 *
 * POST /api/auth/session  exchanges a fresh Firebase ID token (Bearer) for a
 *   Firebase session cookie (admin.auth().createSessionCookie). No Identity
 *   Platform features involved — createSessionCookie is core Auth.
 * POST /api/auth/revoke-all (requires authenticateUser) revokes every refresh
 *   token for the user (admin.auth().revokeRefreshTokens) and clears the
 *   cookie, killing every signed-in session.
 *
 * Session semantics: the cookie lives SESSION_MAX_AGE_SECONDS (14 days) and is
 * NOT renewed by traffic — that is the deliberate ABSOLUTE session timeout.
 * verifySessionCookie(..., true) on the authenticateUser path makes revocation
 * effective immediately for cookie-based requests.
 * (ID-token Bearer requests keep the SDK default: an ID token already issued
 * stays valid up to its 1h lifetime even after revocation.)
 *
 * Handlers are factories taking the admin Auth instance so unit tests can
 * drive them with a mocked admin (see tests/serverAuth.test.ts).
 */

export const SESSION_COOKIE_NAME = 'creatoros_session';

/** 14 days, expressed in seconds for Set-Cookie Max-Age and in ms for the SDK. */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

export function extractSessionToken(req: Request): string | undefined {
  const raw = (req as any).cookies?.[SESSION_COOKIE_NAME];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
    path: '/',
  } as const;
}

export function setSessionCookie(res: Response, cookieValue: string) {
  res.cookie(SESSION_COOKIE_NAME, cookieValue, sessionCookieOptions());
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    ...sessionCookieOptions(),
    maxAge: undefined,
  });
}

/**
 * POST /api/auth/session — Bearer ID token in, session cookie out.
 * 401 with the same shapes as authenticateUser on any failure (missing token,
 * verification failure, or minting failure) so clients can treat every 401
 * identically.
 */
export function createSessionExchangeHandler(adminAuth: Auth) {
  return async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const idToken = authHeader.slice('Bearer '.length).trim();
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Verify first so a malformed/expired token never reaches minting; the
      // decoded claims are not themselves needed — createSessionCookie
      // re-verifies server-side against the backend.
      await adminAuth.verifyIdToken(idToken);
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
      });
      setSessionCookie(res, sessionCookie);
      return res.status(200).json({ ok: true, expiresIn: SESSION_MAX_AGE_SECONDS });
    } catch (error) {
      console.error('Session exchange failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

/**
 * POST /api/auth/revoke-all — mounted behind authenticateUser, so req.user is
 * always a verified token when reached. Revokes all refresh tokens for the
 * user and clears this device's session cookie.
 */
export function createRevokeAllHandler(adminAuth: Auth) {
  return async (req: Request, res: Response) => {
    const uid = (req as any).user?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await adminAuth.revokeRefreshTokens(uid);
      clearSessionCookie(res);
      return res.status(200).json({
        ok: true,
        message: 'Signed out everywhere. Please sign in again on any device you still trust.',
      });
    } catch (error) {
      console.error('Revoke-all failed:', error);
      return res.status(500).json({ error: 'Could not revoke sessions. Please try again.' });
    }
  };
}
