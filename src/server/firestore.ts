// F2 (firestore-convergence) — Server-side Firestore persistence.
//
// With sqlite (src/db.ts) removed, the server's own persistence converges on
// Firestore via the firebase-admin SDK, which bypasses security rules
// (firestore.rules hard-denies client access to these server-only
// collections — the rules are NOT the authorization mechanism).
//
// Doc ID conventions:
//   integrations/{uid}_{platform}   — OAuth-connected platform accounts
//   ai_quota/{uid}_{YYYYMMDD}       — daily AI quota ledger (see quotaLedger.ts)
//
// Tokens stored in integrations are ALWAYS AES-256-GCM envelopes produced by
// src/server/crypto.ts (encryptToken). Legacy plaintext passthrough remains
// supported on read; lazy upgrades now write the envelope back to Firestore.

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const INTEGRATIONS_COLLECTION = 'integrations';

/** The Firestore instance backed by the default database (server-only data). */
export function serverFirestore(): FirebaseFirestore.Firestore {
  if (admin.apps.length === 0) {
    throw new Error('Firebase admin not initialized — cannot access Firestore');
  }
  return admin.firestore();
}

// The web client reads/writes its `projects` collection on a NAMED database
// (firebase-applet-config.json -> firestoreDatabaseId). Server-side
// aggregation for /api/analytics/summary must read the same database or the
// counts silently diverge from what users see in the dashboard.
const _projectsDbs = new Map<string, FirebaseFirestore.Firestore>();

export function projectsFirestore(databaseId: string): FirebaseFirestore.Firestore {
  let instance = _projectsDbs.get(databaseId);
  if (!instance) {
    if (admin.apps.length === 0) {
      throw new Error('Firebase admin not initialized — cannot access Firestore');
    }
    instance = getFirestore(admin.app(), databaseId);
    _projectsDbs.set(databaseId, instance);
  }
  return instance;
}

export interface IntegrationRecord {
  platform: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  /** JSON string, exactly as sqlite user_accounts.profile_data stored it. */
  profile_data: string | null;
  updated_at: string;
}

export interface IntegrationInput {
  uid: string;
  platform: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  profile_data: string | null;
}

function integrationDocId(uid: string, platform: string): string {
  return `${uid}_${platform}`;
}

function integrationCol() {
  return serverFirestore().collection(INTEGRATIONS_COLLECTION);
}

function rowFromDoc(id: string, data: any): IntegrationRecord {
  return {
    platform: typeof data?.platform === 'string' ? data.platform : id.slice(id.lastIndexOf('_') + 1),
    access_token: typeof data?.access_token === 'string' ? data.access_token : null,
    refresh_token: typeof data?.refresh_token === 'string' ? data.refresh_token : null,
    expiry_date: typeof data?.expiry_date === 'number' ? data.expiry_date : null,
    profile_data: typeof data?.profile_data === 'string' ? data.profile_data : null,
    updated_at: typeof data?.updated_at === 'string' ? data.updated_at : '',
  };
}

/** Insert-or-update a connected account (tokens must already be encrypted). */
export async function upsertIntegration(input: IntegrationInput): Promise<void> {
  const ref = integrationCol().doc(integrationDocId(input.uid, input.platform));
  await ref.set({
    uid: input.uid,
    platform: input.platform,
    access_token: input.access_token ?? null,
    refresh_token: input.refresh_token ?? null,
    expiry_date: typeof input.expiry_date === 'number' ? input.expiry_date : null,
    profile_data: input.profile_data ?? null,
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

/** Patch selected fields (used by the F1.4 lazy legacy-token upgrade). */
export async function updateIntegrationFields(
  uid: string,
  platform: string,
  patch: Partial<Pick<IntegrationRecord, 'access_token' | 'refresh_token' | 'expiry_date' | 'profile_data'>>
): Promise<void> {
  const ref = integrationCol().doc(integrationDocId(uid, platform));
  await ref.set({ ...patch, updated_at: new Date().toISOString() }, { merge: true });
}

export async function getIntegration(uid: string, platform: string): Promise<IntegrationRecord | null> {
  const snap = await integrationCol().doc(integrationDocId(uid, platform)).get();
  if (!snap.exists) return null;
  return rowFromDoc(snap.id, snap.data());
}

export async function listIntegrations(uid: string): Promise<IntegrationRecord[]> {
  const snap = await integrationCol().where('uid', '==', uid).get();
  const rows: IntegrationRecord[] = [];
  snap.forEach((doc) => rows.push(rowFromDoc(doc.id, doc.data())));
  return rows;
}

/**
 * Trivial connectivity/credentials ping used by /api/diagnostics/check.
 * A read of a doc that is never written costs at most one read and proves
 * the Firestore channel actually works (auth + network + project access).
 */
export async function firestorePing(): Promise<void> {
  await integrationCol().doc('_health_ping').get();
}
