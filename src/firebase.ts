import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, User as FirebaseUser } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp, getDocFromServer
} from 'firebase/firestore';
// Storage not available
import firebaseConfig from '../firebase-applet-config.json';

// Ensure the authDomain matches the active runtime host:
// In Vercel deployments, use the configured Vercel domain with its /__/auth rewrites.
// In dev preview/localhost, use the official Firebase domain to prevent iframe cross-origin locks.
const resolvedAuthDomain = (typeof window !== 'undefined' && (
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname === firebaseConfig.authDomain
)) ? (firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`)
   : `${firebaseConfig.projectId}.firebaseapp.com`;

const app = initializeApp({
  ...firebaseConfig,
  authDomain: resolvedAuthDomain
});
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Prefer the popup flow because it works reliably on third-party hosts such as
 * Vercel. If the browser blocks the popup, continue in the current tab instead
 * of surfacing Firebase's raw auth/popup-blocked error to the user.
 */
export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      // Vercel serves this SPA from `/`; returning directly to a client-side
      // route such as `/login` would otherwise produce a platform 404.
      if (window.location.pathname !== '/') {
        window.history.replaceState(window.history.state, '', '/');
      }

      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
};
/** Completes a pending full-page Google redirect after the app reloads with timeout safety. */
export const completeGoogleRedirect = async () => {
  try {
    const redirectPromise = getRedirectResult(auth);
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), 2500)
    );
    return await Promise.race([redirectPromise, timeoutPromise]);
  } catch (error) {
    console.warn('Redirect check finished or skipped:', error);
    return null;
  }
};

export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);

/**
 * Compresses a base64 image string to ensure it fits within Firestore's 1MB limit.
 */
export async function compressBase64Image(base64Str: string, maxWidth = 800, quality = 0.8): Promise<string> {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    // Only perform diagnostic check if auth state confirms user is present
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('Firestore connection established successfully.');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        // Log info rather than error to avoid false positive error triggers when client is offline/reconnecting
        console.info('Firestore operating in offline cache mode.');
      } else if (error.message.toLowerCase().includes('permission') || (error as any).code === 'permission-denied') {
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
