import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  connectAuthEmulator,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  serverTimestamp,
  getDocFromServer,
  connectFirestoreEmulator,
} from 'firebase/firestore';
// Storage not available
import firebaseConfig from '../firebase-applet-config.json';

// Ensure the authDomain matches the active runtime host:
// In Vercel deployments, use the configured Vercel domain with its /__/auth rewrites.
// In dev preview/localhost, use the official Firebase domain to prevent iframe cross-origin locks.
const resolvedAuthDomain =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname === firebaseConfig.authDomain)
    ? firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`
    : `${firebaseConfig.projectId}.firebaseapp.com`;

// F4.5: Firebase Emulator Suite detection. vite.config.ts inlines the two
// emulator host env vars at dev/build time (see its `define` block), so this
// check is static in the browser bundle and needs no runtime `process` object.
// When the vars are unset — local dev without emulators and every production
// deployment — both are '' and the app talks to real Firebase exactly as before.
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const isEmulatorMode = Boolean(authEmulatorHost || firestoreEmulatorHost);
// `demo-` prefix projects only ever exist inside the emulator suite.
const EMULATOR_PROJECT_ID = 'demo-creatoros';

const app = initializeApp({
  ...firebaseConfig,
  authDomain: resolvedAuthDomain,
  ...(isEmulatorMode ? { projectId: EMULATOR_PROJECT_ID } : {}),
});
export const auth = getAuth(app);
export const db = isEmulatorMode
  ? getFirestore(app) // the emulator only serves the (default) database
  : getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (authEmulatorHost) {
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
}
if (firestoreEmulatorHost) {
  const [fsHost, fsPort] = firestoreEmulatorHost.split(':');
  connectFirestoreEmulator(db, fsHost, Number(fsPort) || 8080);
}

/**
 * Prefer the popup flow because it works reliably on third-party hosts such as
 * Vercel. If the browser blocks the popup, continue in the current tab instead
 * of surfacing Firebase's raw auth/popup-blocked error to the user.
 */
export const loginWithGoogle = async () => {
  try {
    // Redirect-first approach: most reliable for Vercel/Incognito/Mobile
    // We bypass the popup entirely to avoid third-party cookie blocks.
    await signInWithRedirect(auth, googleProvider);
    return null; 
  } catch (error: any) {
    console.error('Google Redirect failed:', error);
    throw error;
  }
};
/** Completes a pending full-page Google redirect after the app reloads with timeout safety. */
export const completeGoogleRedirect = async () => {
  try {
    const redirectPromise = getRedirectResult(auth);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    return await Promise.race([redirectPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Redirect check finished or skipped:', error);
    return null;
  }
};

export const loginWithEmail = (email: string, pass: string) =>
  signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) =>
  createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);

/**
 * Phase A — email-verification nudge (soft, never a hard block). Sent right
 * after email/password signup and re-sendable from the in-app banner.
 */
export const sendVerificationEmail = (user: FirebaseUser) => sendEmailVerification(user);

/**
 * Phase A — password reset. Firebase returns a generic success even for
 * unknown emails (anti-enumeration); callers must still catch
 * auth/user-not-found (older configs) and show the SAME generic copy either
 * way. See Login.tsx.
 */
export const sendResetEmail = (email: string) => sendPasswordResetEmail(auth, email);

/**
 * Compresses a base64 image string to ensure it fits within Firestore's 1MB limit.
 */
export async function compressBase64Image(
  base64Str: string,
  maxWidth = 800,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    // Only perform diagnostic check if auth state confirms user is present
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firestore connection established successfully.');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes('the client is offline') ||
        error.message.includes('unavailable')
      ) {
        // Log info rather than error to avoid false positive error triggers when client is offline/reconnecting
        console.info('Firestore operating in offline cache mode.');
      } else if (
        error.message.toLowerCase().includes('permission') ||
        (error as any).code === 'permission-denied'
      ) {
        console.log('Firestore connection established (Permission Denied as expected).');
      } else {
        console.warn('Firestore connection check notice:', error.message);
      }
    }
  }
}

/**
 * F1.7: Both helpers are now thin compatibility wrappers over the unified
 * authenticated client in src/lib/apiClient.ts (Bearer token, single 401
 * force-refresh retry, auth-expired event, typed 429 RateLimitError).
 * Existing import sites keep working unchanged.
 */
export { apiFetch, AuthExpiredError, RateLimitError, AUTH_EXPIRED_EVENT } from './lib/apiClient';
import { apiFetch as unifiedApiFetch } from './lib/apiClient';

/** Legacy helper: authenticated fetch that parses JSON (throws on non-OK, including 401/429). */
export async function authorizedFetch(url: string, options: RequestInit = {}) {
  const response = await unifiedApiFetch(url, options);
  return response.json();
}

export { onAuthStateChanged, serverTimestamp, updateProfile };
export type { FirebaseUser };