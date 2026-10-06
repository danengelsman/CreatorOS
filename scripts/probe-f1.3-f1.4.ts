// F1.3 + F1.4 verification probe.
// Run: npx tsx scripts/probe-f1.3-f1.4.ts
// Uses an in-memory jti store (setOauthStateStore) — no Firestore needed.

import crypto from 'crypto';
import {
  createOAuthState,
  verifyAndConsumeOAuthState,
  setOauthStateStore,
  OAUTH_STATE_TTL_MS,
} from '../src/server/oauth-state.ts';
import { encryptToken, decryptToken, looksEncrypted } from '../src/server/crypto.ts';

process.env.OAUTH_STATE_SECRET = 'probe-secret-0123456789abcdef0123456789abcdef';
process.env.TOKEN_ENCRYPTION_KEY = 'aa'.repeat(32); // 64-char hex -> 32 bytes

const WRONG_KEY = 'bb'.repeat(32);

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
function sign(payloadObj: unknown): string {
  const body = b64url(Buffer.from(JSON.stringify(payloadObj), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', process.env.OAUTH_STATE_SECRET!).update(body).digest());
  return `${body}.${sig}`;
}

// In-memory single-use jti store (mirrors the Firestore transaction semantics)
const consumedJtis = new Set<string>();
setOauthStateStore({
  async consume(jti: string) {
    if (consumedJtis.has(jti)) return false;
    consumedJtis.add(jti);
    return true;
  },
});

const results: Array<{ name: string; pass: boolean; detail: string }> = [];
function record(name: string, pass: boolean, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
async function expectReject(name: string, p: Promise<unknown>, reasonHint: string) {
  try {
    await p;
    record(name, false, 'state was ACCEPTED but should have been rejected');
  } catch (err: any) {
    record(name, true, `rejected: ${err?.oauthStateReason || err?.message}`);
  }
}

async function main() {
  // ---------- F1.3: OAuth state HMAC ----------
  console.log('── F1.3 oauth-state ──');

  const state = createOAuthState('user-abc-123', 'youtube');
  record(
    'sign->verify roundtrip',
    typeof state === 'string' && state.split('.').length === 2,
    `${state.slice(0, 24)}… (${state.length} chars)`
  );
  const payload = await verifyAndConsumeOAuthState(state);
  record(
    'verified payload fields',
    payload.uid === 'user-abc-123' && payload.platform === 'youtube' && payload.aud === 'oauth',
    `uid=${payload.uid} platform=${payload.platform} aud=${payload.aud}`
  );
  record(
    'TTL is 10 minutes',
    OAUTH_STATE_TTL_MS === 10 * 60 * 1000 && payload.exp - payload.iat === OAUTH_STATE_TTL_MS,
    `exp-iat=${payload.exp - payload.iat}ms`
  );

  await expectReject('jti replay rejected', verifyAndConsumeOAuthState(state), 'already used');

  // Tamper: flip one byte inside the payload body, keep the original signature
  const [body, sig] = state.split('.');
  const bodyBuf = fromB64url(body);
  bodyBuf[3] ^= 0x01;
  const tamperedState = `${b64url(bodyBuf)}.${sig}`;
  await expectReject('tampered payload rejected', verifyAndConsumeOAuthState(tamperedState), 'signature');

  // Tamper: flip one char of the signature
  const sigFlipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  await expectReject('tampered signature rejected', verifyAndConsumeOAuthState(`${body}.${sigFlipped}`), 'signature');

  // Expired state (correctly signed, exp in the past)
  const expired = sign({ uid: 'u1', platform: 'youtube', iat: Date.now() - 601000, exp: Date.now() - 1000, jti: 'jti-exp-1', aud: 'oauth' });
  await expectReject('expired state rejected', verifyAndConsumeOAuthState(expired), 'expired');

  // Wrong audience
  const badAud = sign({ uid: 'u1', platform: 'youtube', iat: Date.now(), exp: Date.now() + 60000, jti: 'jti-aud-1', aud: 'something-else' });
  await expectReject('wrong audience rejected', verifyAndConsumeOAuthState(badAud), 'audience');

  // Garbage / missing state
  await expectReject('garbage state rejected', verifyAndConsumeOAuthState('not-a-state'), 'invalid');
  await expectReject('empty state rejected', verifyAndConsumeOAuthState(''), 'invalid');
  await expectReject('non-string state rejected', verifyAndConsumeOAuthState({ evil: true }), 'invalid');

  // Second user cannot reuse a state minted for someone else even before consumption
  const forAlice = createOAuthState('alice', 'tiktok');
  const alicePayload = await verifyAndConsumeOAuthState(forAlice);
  record(
    'platform binding survives roundtrip',
    alicePayload.uid === 'alice' && alicePayload.platform === 'tiktok',
    `uid=${alicePayload.uid} platform=${alicePayload.platform}`
  );

  // ---------- F1.4: token encryption at rest ----------
  console.log('── F1.4 crypto ──');

  const token = 'ya29.a0AfB_super-secret-youtube-token-€-unicode-ok';
  const enc = encryptToken(token);
  const envelope = JSON.parse(enc);
  record(
    'encrypt->decrypt roundtrip',
    decryptToken(enc) === token,
    `keyVersion=${envelope.keyVersion}`
  );
  record(
    'envelope shape (v1, iv/tag/ciphertext present)',
    envelope.v === 1 && envelope.keyVersion === 'v1' && looksEncrypted(enc)
      && fromB64url(envelope.iv).length === 12
      && fromB64url(envelope.tag).length === 16
      && fromB64url(envelope.ciphertext).length > 0
  );
  record('ciphertext does not contain plaintext', !enc.includes('ya29') && !enc.includes('super-secret'));
  record('random IV -> unique ciphertexts', encryptToken(token) !== encryptToken(token));

  // Tamper with ciphertext -> GCM auth must fail (null, not a wrong value)
  const env2 = JSON.parse(encryptToken(token));
  const ct = fromB64url(env2.ciphertext);
  ct[0] ^= 0xff;
  const tamperedEnc = JSON.stringify({ ...env2, ciphertext: b64url(ct) });
  record('flipped ciphertext byte rejected (GCM auth)', decryptToken(tamperedEnc) === null);

  // Wrong key -> auth failure
  process.env.TOKEN_ENCRYPTION_KEY = WRONG_KEY;
  record('wrong key rejected (GCM auth)', decryptToken(enc) === null);
  process.env.TOKEN_ENCRYPTION_KEY = 'aa'.repeat(32);

  // Legacy plaintext passthrough + lazy upgrade hook
  let upgradedTo: string | null = null;
  const legacy = 'ya29.legacy-plaintext-token';
  const out = decryptToken(legacy, { update: (e) => { upgradedTo = e; } });
  record('legacy plaintext passthrough', out === legacy);
  record(
    'legacy row upgrade hook fired with valid envelope',
    !!upgradedTo && looksEncrypted(upgradedTo) && decryptToken(upgradedTo) === legacy
  );

  record('null/empty passthrough', decryptToken(null) === null && decryptToken('') === '');

  // keyVersion field is present for future rotation
  record(
    'keyVersion present for rotation',
    JSON.parse(encryptToken('x')).keyVersion === 'v1'
  );

  // ---------- Summary ----------
  const failed = results.filter((r) => !r.pass);
  console.log('──────────────────────');
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('PROBE CRASHED:', err);
  process.exit(1);
});
