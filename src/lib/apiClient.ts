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

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Request aborted', 'AbortError');
}

/** Settle immediately on abort while still observing a late token rejection. */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(abortError(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
    if (signal.aborted) onAbort();
  });
}

async function currentUserIdToken(forceRefresh = false, assertActive: () => void = () => {}, signal?: AbortSignal | null): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return sanitizeToken(await abortable(user.getIdToken(forceRefresh), signal));
  } catch (error) {
    assertActive();
    console.warn('apiClient: failed to resolve ID token:', error);
    return null;
  }
}

/** Resolves the current ID token, briefly waiting for Firebase auth to finish restoring a session. */
async function requireIdToken(assertOwner: () => void = () => {}, signal?: AbortSignal | null): Promise<string> {
  let token = await currentUserIdToken(false, assertOwner, signal);
  assertOwner();
  if (!token) {
    await new Promise<void>((resolve, reject) => {
      // The auth observer may fire synchronously before it returns its unsubscribe function.
      // eslint-disable-next-line prefer-const
      let unsubscribe: (() => void) | undefined;
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        unsubscribe?.();
      };
      const finish = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(abortError(signal!));
      };
      const timer = setTimeout(finish, 2500);
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) { onAbort(); return; }
      unsubscribe = onAuthStateChanged(auth, finish);
      if (settled) unsubscribe();
    });
    assertOwner();
    token = await currentUserIdToken(false, assertOwner, signal);
    assertOwner();
  }
  if (!token) throw new Error('User not authenticated');
  return token;
}

function buildApiHeaders(input: RequestInfo | URL, init: RequestInit, token: string): Headers {
  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined),
  );
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
async function throwForResponse(response: Response, assertActive: () => void): Promise<never> {
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  assertActive();
  if (response.status === 429) {
    throw new RateLimitError(
      parseRetryAfterSeconds(body, response.headers),
      typeof body?.error === 'string' && body.error ? body.error : undefined,
    );
  }
  throw new Error(body?.error || `Request failed with status ${response.status}`);
}

/**
 * Single authenticated fetch for all same-origin `/api/*` requests.
 * Returns the raw Response (throws on non-OK), so callers keep using
 * `response.json()` / `response.blob()` exactly as before.
 */
export type ApiRequestOwner = { uid: string; isCurrent: () => boolean };

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  owner?: ApiRequestOwner,
  options?: { suppressAuthExpiredEvent?: boolean; retryUnauthorized?: boolean },
): Promise<Response> {
  const signal = init.signal !== undefined ? init.signal : input instanceof Request ? input.signal : undefined;
  const assertOwner = () => {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request aborted', 'AbortError');
    if (owner && (auth.currentUser?.uid !== owner.uid || !owner.isCurrent())) {
      throw new DOMException('Request owner is no longer current', 'AbortError');
    }
  };
  assertOwner();
  const rawUrl = extractRequestUrl(input);

  // Only same-origin /api/* requests are authenticated — everything else passes through untouched.
  if (!isSameOriginApiUrl(rawUrl)) {
    return fetch(input, init);
  }

  // The request may be replayed once after a token refresh, so clone Request bodies up front.
  const request: RequestInfo | URL = input instanceof Request ? input.clone() : input;

  const token = await requireIdToken(assertOwner, signal);
  assertOwner();
  const headers = buildApiHeaders(input, init, token);

  const fetchAttempt = async () => {
    assertOwner();
    try {
      const result = await fetch(request instanceof Request ? request.clone() : request, { ...init, headers });
      assertOwner();
      return result;
    } catch (error) {
      assertOwner();
      throw error;
    }
  };
  let response = await fetchAttempt();
  assertOwner();
  if (response.status === 401) {
    // Owner-bound revocation opts out: a forced SDK refresh can itself initiate
    // an unscoped asynchronous sign-out, and must not replay the destructive request.
    const refreshed = options?.retryUnauthorized === false ? null : await currentUserIdToken(true, assertOwner, signal);
    assertOwner();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed}`);
      response = await fetchAttempt();
      assertOwner();
    }
    if (response.status === 401) {
      if (!options?.suppressAuthExpiredEvent) window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      throw new AuthExpiredError();
    }
  }

  if (!response.ok) {
    return throwForResponse(response, assertOwner);
  }
  return response;
}

/**
 * Phase A — exchange the current ID token for a Firebase session cookie
 * (POST /api/auth/session). Best-effort by design: callers fire-and-forget it
 * after sign-in/registration; the Bearer flow keeps working if it fails.
 * The cookie is an ABSOLUTE 14-day session (never renewed by traffic).
 */
export async function exchangeSessionCookie(): Promise<void> {
  await apiFetch('/api/auth/session', { method: 'POST' });
}

/**
 * Phase A — "Sign out of all devices": revokes every refresh token server-side
 * (POST /api/auth/revoke-all). Owner-bound requests leave the existing cookie
 * in the browser to avoid clearing a newer account's cookie. Does not sign
 * out the client: Firebase signOut is not conditional on the captured user.
 */
export async function revokeAllSessions(owner?: ApiRequestOwner): Promise<void> {
  // A delayed response must not clear a newer account's shared cookie.
  // Firebase may still accept a same-second cookie until expiry; do not promise otherwise.
  // Don't fire the global sign-out event or force-refresh/replay on a 401.
  await apiFetch('/api/auth/revoke-all', { method: 'POST', ...(owner ? { credentials: 'omit' as const } : {}) }, owner, { suppressAuthExpiredEvent: !!owner, retryUnauthorized: !owner });
}
