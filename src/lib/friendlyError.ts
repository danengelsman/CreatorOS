/**
 * friendlyError.ts
 * Converts raw Firebase / network / Firestore errors into plain-English messages
 * a normal user can understand and act on.
 */

// ---------- Firebase Auth error map ----------
const AUTH_ERRORS: Record<string, string> = {
  // Credential problems
  'auth/invalid-credential':
    "That email or password doesn't match an account. Double-check both and try again, or reset your password.",
  'auth/wrong-password':
    "That password isn't right for this account. Try again, or reset your password if you've forgotten it.",
  'auth/user-not-found':
    "We couldn't find an account with that email. Check for typos, or create a new account.",
  'auth/invalid-email':
    "That email address doesn't look right. Check for typos and try again.",
  'auth/missing-password': 'Please enter your password.',
  'auth/weak-password':
    'That password is too short. Please use at least 6 characters.',
  'auth/email-already-in-use':
    'An account already exists with that email. Try signing in instead of creating an account.',
  'auth/too-many-requests':
    'Too many attempts in a short time. For security, please wait a few minutes and try again.',
  'auth/user-disabled':
    'This account has been disabled. Contact support if you believe this is a mistake.',
  'auth/operation-not-allowed':
    'Email sign-in is currently unavailable. Please use "Continue with Google" or contact support.',
  'auth/network-request-failed':
    "We can't reach the server right now. Check your internet connection and try again.",
  'auth/popup-closed-by-user':
    'The Google sign-in window was closed before finishing. Give it another try when ready.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
  'auth/popup-blocked':
    "Your browser blocked the sign-in window. Allow pop-ups for this site and try again — or use email sign-in below.",
  'auth/unauthorized-domain':
    "This site isn't authorized for sign-in yet. We're on it — please try again later.",
  'auth/admin-restricted-operation':
    'This action is restricted. Contact support if you need help.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email but uses a different sign-in method. Try the other sign-in option.',
  'auth/invalid-verification-code': 'That verification code is incorrect. Please check and re-enter it.',
  'auth/missing-verification-code': 'Please enter the verification code.',
  'auth/credential-already-in-use':
    'This account is already linked to another user. Sign in with it first.',
  'auth/requires-recent-login':
    'For security, please sign out and sign back in, then try that again.',
  'auth/invalid-api-key':
    'Sign-in is temporarily unavailable due to a service configuration issue. We are on it — please try again soon.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    'Sign-in is temporarily unavailable due to a service configuration issue. We are on it — please try again soon.',
  'auth/app-not-authorized':
    'Sign-in is temporarily unavailable due to a service configuration issue. We are on it — please try again soon.',
  'auth/project-not-found':
    'Sign-in is temporarily unavailable due to a service configuration issue. We are on it — please try again soon.',
};

// ---------- Firestore / backend error map ----------
const FIRESTORE_ERRORS: Record<string, string> = {
  'permission-denied':
    "You don't have permission to do that with your current plan. If you think this is a mistake, contact support.",
  'unauthenticated': 'Your session expired. Please sign in again to continue.',
  'unavailable': "The service is temporarily unavailable. We're working on it — try again in a moment.",
  'deadline-exceeded': 'That took too long and timed out. Please try again.',
  'resource-exhausted': "You've hit a usage limit for now. Please try again later.",
  'failed-precondition':
    "This action can't be completed right now. Refresh the page and try again.",
  'aborted': 'The operation was interrupted. Please try again.',
  'not-found': "We couldn't find what you were looking for. It may have been deleted.",
  'already-exists': 'That already exists — try a different name.',
  'internal': 'Something went wrong on our end. Please try again.',
};

// ---------- HTTP status map (for fetch/axios failures) ----------
const HTTP_ERRORS: Record<number, string> = {
  400: 'That request was invalid. Please check what you entered and try again.',
  401: 'Your session expired. Please sign in again.',
  402: 'This feature requires an upgrade. Check your plan for details.',
  403: "You don't have access to that. Your plan may not include this feature.",
  404: "We couldn't find what you were looking for.",
  408: 'That took too long and timed out. Please try again.',
  429: "You're doing that too fast. Please wait a moment and try again.",
  500: 'Something went wrong on our end. Please try again.',
  502: 'Our servers are having a moment. Please try again shortly.',
  503: "We're briefly down for maintenance. Please try again in a few minutes.",
  504: 'That took too long and timed out. Please try again.',
};

// ---------- Gemini / AI-specific error map ----------
const AI_ERRORS: Record<string, string> = {
  'API key': "Our AI service is temporarily misconfigured. We're on it — please try again soon.",
  'quota': "The AI is in high demand right now. Please try again in a few minutes.",
  'safety': "The AI couldn't complete that request. Try rephrasing your prompt.",
  'recitation': "The AI response was too similar to existing content. Try rephrasing your prompt.",
};

/**
 * Convert any thrown error into a customer-friendly message.
 * Usage:  setError(getFriendlyError(err));
 */
export function getFriendlyError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.';

  // Normalized shape
  const e = err as { code?: string; message?: string; status?: number; name?: string };

  // 1) Firebase auth: error.code like "auth/invalid-credential"
  if (e.code && typeof e.code === 'string' && e.code.startsWith('auth/')) {
    return AUTH_ERRORS[e.code] ||
      'Sign-in failed. Please check your details and try again.';
  }

  // 2) Firestore: error.code like "permission-denied"
  if (e.code && typeof e.code === 'string' && FIRESTORE_ERRORS[e.code]) {
    return FIRESTORE_ERRORS[e.code];
  // 3) HTTP status number
  } else if (typeof e.status === 'number' && HTTP_ERRORS[e.status]) {
    return HTTP_ERRORS[e.status];
  }

  // 4) Gemini/AI errors (message sniffing)
  const msg = e.message || String(err);
  if (msg) {
    for (const [needle, friendly] of Object.entries(AI_ERRORS)) {
      if (msg.toLowerCase().includes(needle.toLowerCase())) return friendly;
    }
  }

  // 5) Browser/network failures (fetch TypeError, offline)
  if (e.name === 'TypeError' && msg.toLowerCase().includes('fetch')) {
    return "We can't reach the server. Check your internet connection and try again.";
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return "You're offline. Reconnect and try again.";
  }

  // 6) Firebase raw message fallback: "Firebase: Error (auth/xxx)." — extract code
  const codeMatch = msg.match(/auth\/([a-z-]+)/);
  if (codeMatch) {
    return AUTH_ERRORS['auth/' + codeMatch[1]] ||
      'Sign-in failed. Please check your details and try again.';
  }

  // 7) Never show raw Firebase junk to users — generic friendly close-out
  return 'Something went wrong on our end. Please try again, or contact support if it keeps happening.';
}

/** Helper: log the real error for debugging, get friendly message for the user */
export function logAndFriendlyError(err: unknown, context?: string): string {
  if (context) console.error(`[${context}]`, err);
  else console.error(err);
  return getFriendlyError(err);
}
