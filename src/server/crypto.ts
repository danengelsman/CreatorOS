// F1.4 — Token encryption at rest (AES-256-GCM envelope encryption).
//
// Tokens stored in user_accounts are encrypted with a key from the
// TOKEN_ENCRYPTION_KEY env var. Stored value is a JSON envelope:
//   {"v":1,"ciphertext":"<b64u>","iv":"<b64u>","tag":"<b64u>","keyVersion":"v1"}
// Legacy plaintext rows (pre-F1.4) are passed through and lazily upgraded on
// read; scripts/migrate-tokens.ts can upgrade the whole table in one shot.

import crypto from 'crypto';

const CURRENT_KEY_VERSION = 'v1';
/** Marker in the JSON envelope — used to tell ciphertext apart from legacy plaintext. */
const ENVELOPE_MARKER = '"v":1';

function loadKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not set — cannot encrypt/decrypt tokens');
  }
  const buffer = decodeKey(raw);
  if (buffer.length !== 32) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${buffer.length})`
    );
  }
  return buffer;
}

/** Accepts 64-char hex or base64/base64url; must decode to 32 bytes. */
function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  const b64 = trimmed.includes('-') || trimmed.includes('_')
    ? trimmed.replace(/-/g, '+').replace(/_/g, '/')
    : trimmed;
  return Buffer.from(b64, 'base64');
}

export interface TokenEnvelope {
  v: number;
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: string;
}

/** True if the value looks like one of our JSON envelopes. */
export function looksEncrypted(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    value.startsWith('{') &&
    value.includes(ENVELOPE_MARKER) &&
    value.includes('"ciphertext"')
  );
}

function b64u(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64u(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Encrypt a token; returns the JSON envelope string for storage. */
export function encryptToken(plaintext: string): string {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext as string;
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return JSON.stringify({
    v: 1,
    ciphertext: b64u(ciphertext),
    iv: b64u(iv),
    tag: b64u(cipher.getAuthTag()),
    keyVersion: CURRENT_KEY_VERSION,
  } satisfies TokenEnvelope);
}

/**
 * Decrypt a stored value. Legacy plaintext is returned as-is; when
 * `legacy` info is provided, the row is lazily upgraded to an envelope.
 */
export function decryptToken(
  serialized: string | null | undefined,
  legacy?: { update: (encrypted: string) => void }
): string | null {
  if (serialized === null || serialized === undefined || serialized === '') {
    return (serialized ?? null) as string | null;
  }
  if (typeof serialized !== 'string') return null;

  if (!looksEncrypted(serialized)) {
    // Legacy plaintext — upgrade the row if the caller gave us a hook.
    if (legacy && !process.env.VERCEL) {
      try {
        legacy.update(encryptToken(serialized));
      } catch (err) {
        console.error('token re-encryption failed:', err);
      }
    }
    return serialized;
  }

  try {
    const envelope = JSON.parse(serialized) as TokenEnvelope;
    const key = loadKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      fromB64u(envelope.iv)
    );
    decipher.setAuthTag(fromB64u(envelope.tag));
    const plaintext = Buffer.concat([
      decipher.update(fromB64u(envelope.ciphertext)),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch (err) {
    console.error('token decryption failed:', err);
    return null;
  }
}
