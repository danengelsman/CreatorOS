const KEY = 'creatoros:auth-return';

/** Accept same-origin application paths only; never redirect to an external host. */
export function safeAuthReturn(value: unknown): string | null {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return null;
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'https://creatoros.invalid';
    const isRelative = value.startsWith('/') && !value.startsWith('//');
    const url = isRelative ? new URL(value, 'https://creatoros.invalid') : new URL(value, base);
    if (url.origin !== 'https://creatoros.invalid' && url.origin !== base) return null;
    if (url.pathname === '/login') return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function pendingAuthReturn(): string | null {
  try {
    return safeAuthReturn(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function rememberAuthReturn(value: unknown): void {
  const path = safeAuthReturn(value);
  if (!path) return;
  const current = pendingAuthReturn();
  if (current && (path === '/dashboard' || path === '/_auth/dashboard')) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* Storage may be disabled. */
  }
}

export function clearAuthReturn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Storage may be disabled. */
  }
}

export function clearAuthReturnIfReached(value: unknown): void {
  const pending = pendingAuthReturn();
  if (pending && safeAuthReturn(value) === pending) {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* Storage may be disabled. */
    }
  }
}
