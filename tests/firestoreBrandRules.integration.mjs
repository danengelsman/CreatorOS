// Run with: firebase emulators:exec --project demo-brand-rules --config firebase.rules-test.json --only firestore "node --test tests/firestoreBrandRules.integration.mjs"
// The config loads the repository's actual firestore.rules; every request is local.
/* global fetch */
import { test } from 'node:test';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import assert from 'node:assert/strict';

const project = 'demo-brand-rules';
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.equal(host, '127.0.0.1:8787', 'Refusing to run outside the isolated Firestore emulator');
const root = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const token = (uid, claims = {}) => {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${project}`,
    aud: project,
    sub: uid,
    user_id: uid,
    iat: 1,
    exp: 4102444800,
    auth_time: 1,
    firebase: { sign_in_provider: 'custom' },
    ...claims,
  })}.`;
};
const fields = (uid, type = 'brand_kit', name = 'Test') => ({
  userId: { stringValue: uid }, name: { stringValue: name },
  type: { stringValue: type }, createdAt: { timestampValue: '2025-01-01T00:00:00Z' },
});
async function request(method, id, credential, body, query = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (credential) headers.Authorization = `Bearer ${credential}`;
  const response = await fetch(`${root}/projects/${encodeURIComponent(id)}${query}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.text() };
}
async function expectStatus(expected, promise) {
  const result = await promise;
  assert.equal(result.status, expected, result.body);
}
const create = (uid, id, type = 'brand_kit', claims = {}, dataUid = uid) =>
  request('PATCH', id, uid === null ? null : token(uid, claims), { fields: fields(dataUid, type) }, '?currentDocument.exists=false');

test('project create reserves every brand_ prefix regardless of type or newline', async () => {
  await expectStatus(200, create('alice', 'brand_alice'));
  await expectStatus(403, create('alice', 'brand_bob'));
  await expectStatus(200, create('bob', 'brand_bob'));
  await expectStatus(403, create('alice', 'brand_victim-content', 'content'));
  await expectStatus(403, create('alice', 'brand_victim\nmore', 'content'));
  await expectStatus(403, create('alice', 'brand_'));
  await expectStatus(200, create('alice', 'project-random', 'content'));
  await expectStatus(200, create('alice', 'xbrand_bob', 'workflow'));
  await expectStatus(200, create('alice', 'Brand_bob', 'tutorial'));
  await expectStatus(200, create('alice', 'ordinary\nproject', 'content'));
  await expectStatus(403, request('PATCH', 'invalid-name', token('alice'), { fields: fields('alice', 'content', '') }, '?currentDocument.exists=false'));
  const badTime = fields('alice', 'content');
  badTime.createdAt = { stringValue: 'not a timestamp' };
  await expectStatus(403, request('PATCH', 'invalid-time', token('alice'), { fields: badTime }, '?currentDocument.exists=false'));
  await expectStatus(403, create('alice', 'invalid-type', 'invalid'));
  await expectStatus(403, create('alice', 'invalid-owner', 'content', {}, 'bob'));
  await expectStatus(403, create(null, 'anonymous-project', 'content', {}, 'anonymous'));
  await expectStatus(403, create(null, 'brand_anonymous', 'brand_kit', {}, 'anonymous'));
});

test('custom UID characters compare literally, not as regex', async () => {
  for (const uid of ['a.b+[]()', 'unicode-雪', 'line\nbreak', 'carriage\rreturn', 'x'.repeat(128)]) {
    await expectStatus(403, create('attacker', `brand_${uid}`));
    await expectStatus(200, create(uid, `brand_${uid}`));
  }
  await expectStatus(403, create('a.*', 'brand_axxx'));
});

test('admin creates obey validation and the new reservation (no create bypass)', async () => {
  const admin = { admin: true };
  await expectStatus(200, create('admin-user', 'brand_admin-user', 'content', admin));
  await expectStatus(200, create('admin-user', 'admin-random', 'content', admin));
  await expectStatus(403, create('admin-user', 'brand_other', 'brand_kit', admin));
  await expectStatus(403, create('admin-user', 'admin-spoof', 'content', admin, 'other'));
});

test('legacy reserved IDs retain owner update and admin read/update/delete behavior', async () => {
  // Emulator-only administrative seed recreates a legacy pre-fix occupied ID.
  await expectStatus(200, request('PATCH', 'brand_legacy-victim', 'owner', { fields: fields('legacy-owner') }));
  await expectStatus(200, request('GET', 'brand_legacy-victim', token('legacy-owner')));
  await expectStatus(403, request('GET', 'brand_legacy-victim', token('legacy-victim')));
  await expectStatus(200, request('PATCH', 'brand_legacy-victim', token('legacy-owner'), { fields: fields('legacy-owner', 'content', 'Updated') }));
  await expectStatus(403, request('PATCH', 'brand_legacy-victim', token('legacy-owner'), { fields: fields('legacy-victim') }));
  await expectStatus(200, request('GET', 'brand_legacy-victim', token('admin-user', { admin: true })));
  await expectStatus(200, request('PATCH', 'brand_legacy-victim', token('admin-user', { admin: true }), { fields: fields('legacy-owner', 'content', 'Admin edit') }));
  await expectStatus(403, request('DELETE', 'brand_legacy-victim', token('legacy-victim')));
  await expectStatus(200, request('DELETE', 'brand_legacy-victim', token('admin-user', { admin: true })));
});
