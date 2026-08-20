import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, User as FirebaseUser } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp, getDocFromServer
} from 'firebase/firestore';
// Storage not available
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
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
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection established successfully.');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        console.error('Firestore connection failed: The client is offline or the service is unavailable. Please check your Firebase configuration and internet connection.');
      } else if (error.message.toLowerCase().includes('permission') || (error as any).code === 'permission-denied') {
        console.log('Firestore connection established (Permission Denied as expected).');
      } else {
        console.error('Firestore connection error:', error.message);
      }
    }
  }
}
testConnection();

/** Helper for authenticated API calls. */
export async function authorizedFetch(url: string, options: RequestInit = {}) {
  let user = auth.currentUser;
  if (!user) {
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
    user = auth.currentUser;
  }
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  const cleanToken = token.replace(/[\r\n\t]/g, '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => { headers[key] = value; });
  } else if (Array.isArray(options.headers)) {
    options.headers.forEach(([key, value]) => { headers[key] = value; });
  } else if (options.headers && typeof options.headers === 'object') {
    Object.assign(headers, options.headers);
  }
  headers.Authorization = `Bearer ${cleanToken}`;

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Gemini routes are authenticated server-side. Existing CreatorOS service
 * functions use fetch() directly, so install a narrow browser interceptor that
 * attaches the current Firebase ID token only to /api/gemini/* requests.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (!requestUrl.startsWith('/api/gemini/')) {
    return fetch(input, init);
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = (await user.getIdToken()).replace(/[\r\n\t]/g, '').trim();
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}

export { onAuthStateChanged, serverTimestamp, updateProfile };
export type { FirebaseUser };
