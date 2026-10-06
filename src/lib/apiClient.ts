import { auth, onAuthStateChanged } from '../firebase';

/**
 * F1.7 — Unified authenticated API client.
 *
 * Every same-origin `/api/*` request goes through `apiFetch`, which:
 *  - attaches `Authorization: Bearer <idToken>` from the current Firebase user,
 *  - on 401, force-refreshes the ID token ONCE (`getIdToken(true)`) and retries once,
 *  - on a second 401, dispatches the `creatoros:auth-expired` window event and
 *    throws AuthExpiredError (App.tsx listens and signs the user out),
 *  - on 429, throws RateLimitError with the server-provided retry hint
 *    (body.retryAfter / body.retryAfterSeconds, falling back to the Retry-After header),
 *  - on any other non-OK response, throws Error(body.error || status).
 *
 * Non-API URLs (blob:, data:, external hosts) pass through untouched.
 */

export const AUTH_EXPIRED_EVENT = 'creatoros:auth-expired';

/** Thrown when a 401 persists after one forced token refresh — the session is unrecoverable. */
export class AuthExpiredError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'AuthExpiredError';
    Object.setPrototypeOf(this, AuthExpiredError.prototype);
  }
}

/** Thrown on HTTP 429. `retryAfterSeconds` comes from body.retryAfter or the Retry-After header. */
export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(message || `Rate limit exceeded. Retry after ${retryAfterSeconds}s.`);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

function extractRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isSameOriginApiUrl(rawUrl: string): boolean {
  if (rawUrl.startsWith('/api/')) return true;
  try {
    const resolved = new URL(rawUrl, window.location.origin);
    return resolved.origin === window.location.origin && resolved.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

function sanitizeToken(token: string): string {
  return token.replace(/[\r\n\t]/g, '').trim();
}

async function currentUserIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return sanitizeToken(await user.getIdToken(forceRefresh));
  } catch (error) {
    console.warn('apiClient: failed to resolve ID token:', error);
    return null;
  }
}

/** Resolves the current ID token, briefly waiting for Firebase auth to finish restoring a session. */
async function requireIdToken(): Promise<string> {
  let token = await currentUserIdToken();
  if (!token) {
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 2500);
    });
    token = await currentUserIdToken();
  }
  if (!token) throw new Error('User not authenticated');
  return token;
}

function buildApiHeaders(input: RequestInfo | URL, init: RequestInit, token: string): Headers {
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (!headers.has('Content-Type')) {
    // Legacy authorizedFetch defaulted to JSON request bodies; preserve that.
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function parseRetryAfterSeconds(body: any, headers: Headers): number {
  const raw = body?.retryAfter ?? body?.retryAfterSeconds ?? headers.get('Retry-After');
  const seconds = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

/** Throws a typed error for any non-OK /api response. Never returns. */
async function throwForResponse(response: Response): Promise<never> {
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (response.status === 429) {
    throw new RateLimitError(
      parseRetryAfterSeconds(body, response.headers),
      typeof body?.error === 'string' && body.error ? body.error : undefined
    );
  }
  throw new Error(body?.error || `Request failed with status ${response.status}`);
}

/**
 * Single authenticated fetch for all same-origin `/api/*` requests.
 * Returns the raw Response (throws on non-OK), so callers keep using
 * `response.json()` / `response.blob()` exactly as before.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const rawUrl = extractRequestUrl(input);

  // Only same-origin /api/* requests are authenticated — everything else passes through untouched.
  if (!isSameOriginApiUrl(rawUrl)) {
    return fetch(input, init);
  }

  // The request may be replayed once after a token refresh, so clone Request bodies up front.
  const request: RequestInfo | URL = input instanceof Request ? input.clone() : input;

  const token = await requireIdToken();
  const headers = buildApiHeaders(input, init, token);

  let response = await fetch(request, { ...init, headers });
  if (response.status === 401) {
    // Force-refresh the ID token exactly once, then replay the original request.
    const refreshed = await currentUserIdToken(true);
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed}`);
      response = await fetch(request, { ...init, headers });
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      throw new AuthExpiredError();
    }
  }

  if (!response.ok) {
    return throwForResponse(response);
  }
  return response;
}
