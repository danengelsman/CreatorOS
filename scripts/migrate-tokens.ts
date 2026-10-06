// F1.4 — One-shot token encryption migration.
//
// Iterates every user_accounts row and replaces legacy plaintext
// access_token / refresh_token values with AES-256-GCM envelopes.
// Run once after TOKEN_ENCRYPTION_KEY is set:
//   TOKEN_ENCRYPTION_KEY=<32-byte hex> npx tsx scripts/migrate-tokens.ts [--dry-run]

import '../src/db.ts';
import { encryptToken, looksEncrypted } from '../src/server/crypto.ts';

const dryRun = process.argv.includes('--dry-run');

function mask(v: string | null | undefined): string {
  if (!v) return '∅';
  return v.length <= 8 ? '****' : `${v.slice(0, 4)}…${v.slice(-4)}`;
}

const rows = db
  .prepare('SELECT user_id, platform, access_token, refresh_token FROM user_accounts')
  .all() as Array<{
  user_id: string;
  platform: string;
  access_token: string | null;
  refresh_token: string | null;
}>;

console.log(`Found ${rows.length} user_accounts row(s).${dryRun ? ' (dry run)' : ''}`);

const update = db.prepare(
  'UPDATE user_accounts SET access_token = ?, refresh_token = ? WHERE user_id = ? AND platform = ?'
);

let upgradedAccess = 0;
let upgradedRefresh = 0;
let alreadyEncrypted = 0;

const migrate = db.transaction((rows: typeof rows) => {
  for (const row of rows) {
    const nextAccess = row.access_token && !looksEncrypted(row.access_token)
      ? encryptToken(row.access_token)
      : row.access_token;
    const nextRefresh = row.refresh_token && !looksEncrypted(row.refresh_token)
      ? encryptToken(row.refresh_token)
      : row.refresh_token;

    if (nextAccess !== row.access_token) upgradedAccess++;
    if (nextRefresh !== row.refresh_token) upgradedRefresh++;
    if (nextAccess === row.access_token && nextRefresh === row.refresh_token) {
      alreadyEncrypted++;
      continue;
    }

    if (!dryRun) {
      update.run(nextAccess, nextRefresh, row.user_id, row.platform);
    }
    console.log(
      `  ${row.user_id} / ${row.platform}: ${mask(row.access_token)} -> ${mask(nextAccess)}`
    );
  }
});

if (rows.length === 0) {
  console.log('Nothing to migrate.');
  process.exit(0);
}

if (!process.env.TOKEN_ENCRYPTION_KEY) {
  console.error('FATAL: TOKEN_ENCRYPTION_KEY is not set. Refusing to run.');
  process.exit(1);
}

migrate(rows);
console.log(
  `Done: ${upgradedAccess} access_token(s) and ${upgradedRefresh} refresh_token(s) encrypted, ${alreadyEncrypted} row(s) already encrypted.`
);
