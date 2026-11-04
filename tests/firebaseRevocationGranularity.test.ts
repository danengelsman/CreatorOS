// Exercises the installed Admin SDK comparator with a local user-record double.
// No Firebase credentials or network calls are used.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { BaseAuth } = require(resolve(process.cwd(), 'node_modules/firebase-admin/lib/auth/base-auth.js'));

describe('Firebase Admin session revocation granularity', () => {
  it('accepts equal auth and valid-since seconds but rejects an older authentication', async () => {
    const second = 1_700_000_000;
    const fakeAuth = { getUser: async () => ({ disabled: false, tokensValidAfterTime: new Date(second * 1000).toUTCString() }) };
    const check = (authTime: number) => BaseAuth.prototype.verifyDecodedJWTNotRevokedOrDisabled.call(
      fakeAuth, { sub: 'local-user', auth_time: authTime }, { code: 'session-cookie-revoked', message: 'revoked' },
    );
    await expect(check(second)).resolves.toMatchObject({ auth_time: second });
    await expect(check(second - 1)).rejects.toThrow();
  });
});
