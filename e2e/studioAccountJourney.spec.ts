import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-user';

// Real app routes, Firebase Auth/Firestore emulators, and mocked API calls only.
test('account switch isolates a saved project and restores it for its owner', async ({ page, request }) => {
  test.setTimeout(180_000);
  const secondEmail = 'studio-isolation@demo-creatoros.test';
  const authBase = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:';
  const credentials = { email: secondEmail, password: TEST_USER_PASSWORD, returnSecureToken: true };
  let response = await request.post(`${authBase}signUp?key=local-test`, { data: credentials });
  if (!response.ok()) response = await request.post(`${authBase}signInWithPassword?key=local-test`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  const second = await response.json();
  const profile = await request.patch(`http://127.0.0.1:8080/v1/projects/demo-creatoros/databases/(default)/documents/users/${second.localId}`, {
    headers: { Authorization: `Bearer ${second.idToken}` },
    data: { fields: { email: { stringValue: secondEmail }, accountProvider: { stringValue: 'password' }, createdAt: { timestampValue: '2026-01-01T00:00:00.000Z' } } },
  });
  expect(profile.ok()).toBeTruthy();

  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
    return route.abort();
  });
  await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  const login = async (email: string) => {
    await page.goto('/login');
    await page.locator('input[placeholder="Email Address"]').fill(email);
    await page.locator('input[placeholder="Password"]').fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('header button').first()).toBeVisible();
  };
  const logout = async () => {
    await page.getByRole('button', { name: 'Logout', exact: true }).last().click();
    await expect(page).toHaveURL(/\/login/);
  };

  await login(TEST_USER_EMAIL);
  await page.goto('/studio');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByRole('button', { name: 'Create blank project', exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/[^/?]+/);
  const projectUrl = page.url();
  const script = page.getByLabel('Project script');
  await script.fill('Private project owned by account A');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('No unsaved changes.');

  await logout();
  await login(secondEmail);
  await page.goto(projectUrl);
  await expect(page.getByRole('heading', { name: /(Project not found|Unable to load project)/i })).toBeVisible();
  await expect(page.getByText('Private project owned by account A')).toHaveCount(0);
  await page.goto('/studio');
  await expect(page.getByText('Private project owned by account A')).toHaveCount(0);

  await logout();
  await page.goto(`${projectUrl}?inspector=planner`);
  await expect(page).toHaveURL(/\/login/);
  await page.locator('input[placeholder="Email Address"]').fill(TEST_USER_EMAIL);
  await page.locator('input[placeholder="Password"]').fill(TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/studio\/[^/?]+\?inspector=planner/);
  await expect(page.getByLabel('Project script')).toHaveValue('Private project owned by account A');
});
