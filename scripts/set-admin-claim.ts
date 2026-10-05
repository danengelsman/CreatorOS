/**
 * F1.6b — Grant (or revoke) the Firebase admin custom claim.
 *
 * Usage:
 *   npx tsx scripts/set-admin-claim.ts <uid> [true|false]
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS (or FIREBASE_SERVICE_ACCOUNT env var)
 * pointing at a service account with Firebase Admin privileges.
 *
 * After granting, the user must refresh their ID token (sign out/in) before
 * firestore.rules isAdmin() sees the claim.
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const [uid, flagArg] = process.argv.slice(2);
if (!uid) {
  console.error('Usage: npx tsx scripts/set-admin-claim.ts <uid> [true|false]');
  process.exit(1);
}
const adminFlag = flagArg === undefined || flagArg === 'true';

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const svc = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
  );
  admin.initializeApp({ credential: admin.credential.cert(svc) });
} else {
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS / metadata server.
  admin.initializeApp();
}

try {
  await admin.auth().setCustomUserClaims(uid, { admin: adminFlag });
  const user = await admin.auth().getUser(uid);
  console.log(`OK: ${user.email} (${uid}) admin=${adminFlag}`);
  console.log('Note: the user must sign out/in to mint a token carrying the claim.');
  process.exit(0);
} catch (err: any) {
  console.error('FAILED to set admin claim:', err?.message || err);
  process.exit(1);
}
