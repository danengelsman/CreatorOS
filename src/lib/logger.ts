import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface AppLogData {
  userId?: string | null;
  message: string;
  stack?: string | null;
  url?: string;
  userAgent?: string;
  timestamp: any;
  metadata?: any;
}

// Deduplication cache to prevent logging the exact same error repeatedly in a session
const loggedErrorsSet = new Set<string>();

/**
 * Logs a client-side runtime error to the Firestore 'app_logs' collection.
 * Includes automatic deduplication and payload size safety limits.
 */
export async function logErrorToFirestore(
  error: Error | string | unknown,
  metadata?: any
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : null;
    const url = window.location.href;
    const userAgent = navigator.userAgent;
    const userId = auth.currentUser?.uid || null;

    // Create a fingerprint for deduplication
    const fingerprint = `${message}-${stack || ''}-${url}`;
    if (loggedErrorsSet.has(fingerprint)) {
      return;
    }
    loggedErrorsSet.add(fingerprint);

    // Limit cache size to avoid memory leaks
    if (loggedErrorsSet.size > 100) {
      const firstKey = loggedErrorsSet.values().next().value;
      if (firstKey) loggedErrorsSet.delete(firstKey);
    }

    const payload: AppLogData = {
      userId,
      message: message.substring(0, 10000), // Guard against excessively large messages
      stack: stack ? stack.substring(0, 50000) : null,
      url,
      userAgent,
      timestamp: serverTimestamp(),
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
    };

    const logsCollection = collection(db, 'app_logs');
    await addDoc(logsCollection, payload);
  } catch (err) {
    // Fallback to console to prevent infinite error loops
    console.error('Failed to dispatch error to app_logs:', err);
  }
}

let isInitialized = false;

/**
 * Attaches global window listeners to capture unhandled exceptions and promise rejections automatically.
 */
export function initErrorMonitoring(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Catch general unhandled exceptions
  window.addEventListener('error', (event) => {
    // Ignore external cross-origin script error noise
    if (event.message === 'Script error.' && !event.filename) {
      return;
    }
    
    logErrorToFirestore(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'window.onerror'
    });
  });

  // Catch unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logErrorToFirestore(event.reason, {
      source: 'window.onunhandledrejection'
    });
  });

  console.log('CreatorOS Production Error Monitoring Pipeline Enabled.');
}
