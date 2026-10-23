// F2.3 — One-shot local-dev migration: sqlite user_accounts -> Firestore `integrations`.
//
// Reads the local creator_os.db (if present), migrates every user_accounts row
// into Firestore integrations/{uid}_{platform} with F1.4 envelope encryption
// applied (legacy plaintext is encrypted; already-encrypted envelopes are kept
// as-is), and prints a summary. Production sqlite is ephemeral /tmp — there is
// deliberately NO production migration; only this local-dev utility.
//
// better-sqlite3 is imported ONLY here, dynamically, so the server bundle
// never needs the native module (it was removed from dependencies).
//
// Run once (local dev only; requires a service account via env or ADC):
//   FIREBASE_SERVICE_ACCOUNT=<base64 svc json> \
//   TOKEN_ENCRYPTION_KEY=<32-byte hex/base64> \
//   npx tsx scripts/migrate-sqlite-to-firestore.ts [--dry-run] [--db=path/to/creator_os.db]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dryRun = process.argv.includes('--dry-run');
const dbArg = process.argv.find((a) => a.startsWith('--db='));
const DB_PATH = dbArg
  ? path.resolve(dbArg.slice('--db='.length))
  : path.resolve(__dirname, '..', 'creator_os.db');

if (!process.env.TOKEN_ENCRYPTION_KEY) {
  console.error('FATAL: TOKEN_ENCRYPTION_KEY is not set (32-byte hex or base64). Refusing to run.');
  process.exit(1);
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'FATAL: set FIREBASE_SERVICE_ACCOUNT (base64 service-account JSON) or GOOGLE_APPLICATION_CREDENTIALS.',
  );
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.log(`No local sqlite database found at ${DB_PATH} — nothing to migrate.`);
  process.exit(0);
}

// --- dynamic import: better-sqlite3 only inside this script ---
const { default: Database } = await import('better-sqlite3');
const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const { encryptToken, looksEncrypted } = await import('../src/server/crypto.ts').then((m) => m);

const svc = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'))
  : undefined;

let projectId = 'gen-lang-client-0282443702';
const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    projectId = JSON.parse(fs.readFileSync(configPath, 'utf8')).projectId || projectId;
  } catch {}
}

const app = initializeApp(svc ? { credential: cert(svc), projectId } : { projectId });
// Server-only collections live on the DEFAULT database (admin SDK bypasses
// rules; see firestore.rules integrations/ai_quota sections).
const firestore = getFirestore(app);

const db = new Database(DB_PATH, { readonly: true });

interface Row {
  user_id: string;
  platform: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
  profile_data: string | null;
}

const rows = db
  .prepare(
    'SELECT user_id, platform, access_token, refresh_token, expiry_date, profile_data FROM user_accounts',
  )
  .all() as Row[];

console.log(
  `Found ${rows.length} user_accounts row(s) in ${DB_PATH}.${dryRun ? ' (dry run)' : ''}`,
);
if (rows.length === 0) {
  console.log('Nothing to migrate.');
  process.exit(0);
}

function mask(v: string | null | undefined): string {
  if (!v) return '∅';
  return v.length <= 8 ? '****' : `${v.slice(0, 4)}…${v.slice(-4)}`;
}

let migrated = 0;
let alreadyEncrypted = 0;
let errors = 0;

for (const row of rows) {
  try {
    const access =
      row.access_token && !looksEncrypted(row.access_token)
        ? encryptToken(row.access_token)
        : row.access_token;
    const refresh =
      row.refresh_token && !looksEncrypted(row.refresh_token)
        ? encryptToken(row.refresh_token)
        : row.refresh_token;

    if (row.access_token && !looksEncrypted(row.access_token)) {
      console.log(
        `  ${row.user_id} / ${row.platform}: ${mask(row.access_token)} -> encrypted envelope`,
      );
    }

    if (!dryRun) {
      await firestore
        .collection('integrations')
        .doc(`${row.user_id}_${row.platform}`)
        .set(
          {
            uid: row.user_id,
            platform: row.platform,
            access_token: access ?? null,
            refresh_token: refresh ?? null,
            expiry_date: typeof row.expiry_date === 'number' ? row.expiry_date : null,
            profile_data: row.profile_data ?? null,
            updated_at: new Date().toISOString(),
          },
          { merge: true },
        );
    }
    if (
      row.access_token &&
      looksEncrypted(row.access_token) &&
      (!row.refresh_token || looksEncrypted(row.refresh_token))
    ) {
      alreadyEncrypted++;
    } else {
      migrated++;
    }
  } catch (err: any) {
    errors++;
    console.error(`  FAILED ${row.user_id} / ${row.platform}: ${err?.message || err}`);
  }
}

console.log('');
console.log(
  `Done: ${migrated} row(s) encrypted + written to Firestore integrations, ${alreadyEncrypted} already encrypted, ${errors} error(s).${dryRun ? ' (dry run — nothing written)' : ''}`,
);
process.exit(errors > 0 ? 1 : 0);
