const KEY = 'creatoros:auth-return';

/** Accept same-origin application paths only; never redirect to an external host. */
export function safeAuthReturn(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://creatoros.invalid');
    if (url.origin !== 'https://creatoros.invalid' || url.pathname === '/login') return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function pendingAuthReturn(): string | null {
  try { return safeAuthReturn(sessionStorage.getItem(KEY)); } catch { return null; }
}

export function rememberAuthReturn(value: unknown): void {
  const path = safeAuthReturn(value);
  if (!path || pendingAuthReturn()) return;
  try { sessionStorage.setItem(KEY, path); } catch { /* Storage may be disabled. */ }
}

export function clearAuthReturnIfReached(value: unknown): void {
  const pending = pendingAuthReturn();
  if (pending && safeAuthReturn(value) === pending) {
    try { sessionStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ }
  }
}
