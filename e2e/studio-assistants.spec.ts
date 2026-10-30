import { test, expect } from '@playwright/test';

const fixture = '/e2e/fixtures/studio-assistants.html';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost' ? route.continue() : route.abort();
  });
});

test('opens the analyzer as a modal and restores focus on Escape', async ({ page }) => {
  await page.goto(fixture, { waitUntil: 'domcontentloaded' });
  const trigger = page.getByRole('button', { name: 'Video Analyzer', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Studio assistants' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Video Analyzer' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close assistants' })).toBeFocused();
  expect(await page.evaluate(() => document.querySelector('dialog')?.matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

for (const key of ['Enter', 'Space']) {
  test(`keyboard users can browse for a video with ${key}`, async ({ page }) => {
    // Register interception before navigation; the browser enables it asynchronously.
    page.on('filechooser', () => {});
    await page.goto(`${fixture}?assistant=analyzer`, { waitUntil: 'domcontentloaded' });
    const dialog = page.getByRole('dialog', { name: 'Studio assistants' });
    const upload = dialog.getByRole('button', { name: 'Upload Video Content' });
    await expect(upload).toHaveAccessibleDescription(/Drag and drop.*Max size 1GB.*MP4, MOV, or WEBM/s);
    await dialog.getByRole('button', { name: 'Close assistants' }).focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    await expect(upload).toBeFocused();
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 10_000 });
    await page.keyboard.press(key);
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: `${key}.mp4`, mimeType: 'video/mp4', buffer: Buffer.from('video') });
    await expect(dialog.getByText(`${key}.mp4`)).toBeVisible();
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(upload).toBeFocused();
  });
}

test('dragging a video to the upload target still selects it', async ({ page }) => {
  await page.goto(`${fixture}?assistant=analyzer`, { waitUntil: 'domcontentloaded' });
  const dialog = page.getByRole('dialog', { name: 'Studio assistants' });
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['video'], 'dropped.mp4', { type: 'video/mp4' }));
    return transfer;
  });
  await dialog.getByRole('button', { name: 'Upload Video Content' }).dispatchEvent('drop', { dataTransfer });
  await expect(dialog.getByText('dropped.mp4')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
});

for (const key of ['Enter', 'Space']) {
  test(`template detail is a focus-contained dialog opened with ${key}`, async ({ page }) => {
    await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
    const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
    await drawer.getByRole('button', { name: 'templates', exact: true }).click();
    const title = "The 'Why Everyone Is Wrong About X' Video Essay";
    const opener = drawer.getByRole('button', { name: title, exact: true });
    await opener.focus();
    await page.keyboard.press(key);
    const detail = drawer.getByRole('dialog', { name: title });
    await expect(detail).toBeVisible();
    await expect(detail).toHaveAttribute('aria-modal', 'true');
    const close = detail.getByRole('button', { name: 'Close template details' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(detail.getByRole('button', { name: 'Load into Generator' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await drawer.getByRole('button', { name: 'Close assistants' }).focus();
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
    await expect(drawer).toBeVisible();
    await expect(opener).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}

test('template detail close button restores focus and load action preserves generator behavior', async ({ page }) => {
  await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  await drawer.getByRole('button', { name: 'templates', exact: true }).click();
  const title = "The 'Why Everyone Is Wrong About X' Video Essay";
  const opener = drawer.getByRole('button', { name: title, exact: true });
  await opener.click();
  const detail = drawer.getByRole('dialog', { name: title });
  await detail.getByRole('button', { name: 'Close template details' }).click();
  await expect(opener).toBeFocused();
  await opener.click();
  await detail.getByRole('button', { name: 'Load into Generator' }).click();
  await expect(drawer.locator('textarea').first()).toHaveValue(new RegExp('Why Everyone Is Wrong About X'));
});

test('backdrop dismisses template detail and restores the opener', async ({ page }) => {
  await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  await drawer.getByRole('button', { name: 'templates', exact: true }).click();
  const opener = drawer.getByRole('button', { name: "The 'Why Everyone Is Wrong About X' Video Essay", exact: true });
  await opener.click();
  const detail = drawer.getByRole('dialog', { name: "The 'Why Everyone Is Wrong About X' Video Essay" });
  await detail.locator('..').click({ position: { x: 3, y: 3 } });
  await expect(detail).toBeHidden();
  await expect(opener).toBeFocused();
});

test('a hidden template detail does not intercept Escape in another assistant', async ({ page }) => {
  await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  await drawer.getByRole('button', { name: 'templates', exact: true }).click();
  await drawer.getByText("The 'Why Everyone Is Wrong About X' Video Essay", { exact: true }).click();
  await expect(drawer.getByText('Structure & Directions')).toBeVisible();
  // Switch programmatically to exercise the retained but hidden assistant state.
  await drawer.getByRole('button', { name: 'Video Analyzer', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(drawer.getByRole('heading', { name: 'Video Analyzer' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('Escape dismisses template details before closing the drawer', async ({ page }) => {
  await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  const input = drawer.locator('textarea').first();
  await input.fill('Keep this draft');
  await drawer.getByRole('button', { name: 'templates', exact: true }).click();
  await drawer.getByText("The 'Why Everyone Is Wrong About X' Video Essay", { exact: true }).click();
  await expect(drawer.getByText('Structure & Directions')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Structure & Directions')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await page.getByRole('button', { name: 'Co-Pilot', exact: true }).click();
  await expect(drawer.getByText('Structure & Directions')).toBeHidden();
  await drawer.getByRole('button', { name: 'generator', exact: true }).click();
  await expect(input).toHaveValue('Keep this draft');
});

test('opens initial legacy assistant and retains drafts across switching and close', async ({ page }) => {
  await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
  const dialog = page.getByRole('dialog', { name: 'Studio assistants' });
  await expect(dialog.getByRole('heading', { name: 'Perfect Prompt' })).toBeVisible();
  const input = dialog.locator('textarea').first();
  await input.fill('A reusable draft');
  await dialog.getByRole('button', { name: 'Video Analyzer', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Video Analyzer' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Perfect Prompt', exact: true }).click();
  await expect(input).toHaveValue('A reusable draft');
  await dialog.getByRole('button', { name: 'Close assistants' }).click();
  await page.getByRole('button', { name: 'Co-Pilot', exact: true }).click();
  await expect(input).toHaveValue('A reusable draft');
});

test('scoped shortcuts do not intercept typing or browser modifier shortcuts', async ({ page }) => {
  await page.goto(fixture, { waitUntil: 'domcontentloaded' });
  const notes = page.getByLabel('Studio notes');
  await notes.fill('vp');
  await expect(page.getByRole('dialog')).toBeHidden();
  const trigger = page.getByRole('button', { name: 'Video Analyzer', exact: true });
  await trigger.focus();
  const prevented = await trigger.evaluate((element) => !element.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true, cancelable: true })));
  expect(prevented).toBe(false);
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('p');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Perfect Prompt' })).toBeVisible();
  const input = page.getByRole('dialog').locator('textarea').first();
  await input.fill('vp');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Perfect Prompt' })).toBeVisible();
});

for (const source of ['card', 'detail']) {
  test(`loading a template from the ${source} focuses the generator input`, async ({ page }) => {
    await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
    const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
    await drawer.getByRole('button', { name: 'templates', exact: true }).click();
    const title = "The 'Why Everyone Is Wrong About X' Video Essay";
    if (source === 'detail') {
      await drawer.getByRole('button', { name: title, exact: true }).click();
      await drawer.getByRole('dialog', { name: title }).getByRole('button', { name: 'Load into Generator' }).focus();
    } else {
      await drawer.getByRole('button', { name: `Use ${title} in Generator`, exact: true }).focus();
    }
    await page.keyboard.press('Enter');
    const input = drawer.getByRole('textbox', { name: 'Rough Idea' });
    await expect(input).toHaveValue(/Why Everyone Is Wrong About X/);
    await expect(input).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}

test('template details scroll within a short landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 280 });
  await page.goto(`${fixture}?assistant=copilot`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  await drawer.getByRole('button', { name: 'templates', exact: true }).click();
  const title = "The 'Why Everyone Is Wrong About X' Video Essay";
  await drawer.getByRole('button', { name: title, exact: true }).click();
  const detail = drawer.getByRole('dialog', { name: title });
  const geometry = await detail.evaluate((el) => ({ top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, scroll: el.scrollHeight, client: el.clientHeight, overflow: getComputedStyle(el).overflowY }));
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(281);
  expect(geometry.scroll).toBeGreaterThan(geometry.client);
  expect(geometry.overflow).toMatch(/auto|scroll/);
  await page.keyboard.press('Shift+Tab');
  const load = detail.getByRole('button', { name: 'Load into Generator' });
  await expect(load).toBeFocused();
  const box = await load.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(281);
  await page.keyboard.press('Escape');
  await expect(drawer.getByRole('button', { name: title, exact: true })).toBeFocused();
});

for (const outcome of ['success', 'error']) {
  test(`video analysis announces and retains meaningful focus on ${outcome}`, async ({ page }) => {
    // Replace only the network-facing service, retaining the real component state machine.
    await page.route('**/src/services/gemini.ts', (route) => route.fulfill({ contentType: 'application/javascript', body: `export async function analyzeVideo() { const response = await fetch('/analysis-test'); if (!response.ok) throw new Error('failure'); return (await response.json()).text; }` }));
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/analysis-test', async (route) => {
      await pending;
      await route.fulfill(outcome === 'success' ? { json: { text: 'A useful summary' } } : { status: 500, body: 'failure' });
    });
    await page.goto(`${fixture}?assistant=analyzer`, { waitUntil: 'domcontentloaded' });
    const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
    await drawer.locator('input[type=file]').setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') });
    const extract = drawer.getByRole('button', { name: 'Extract Insights' });
    await extract.focus();
    await page.keyboard.press('Enter');
    const status = drawer.getByRole('status');
    await expect(status).toContainText('Analyzing video');
    await expect(drawer.getByRole('heading', { name: 'Analyzing Video' })).toBeFocused();
    release();
    if (outcome === 'success') {
      await expect(status).toContainText('Analysis complete');
      await expect(drawer.getByRole('heading', { name: 'Analysis results' })).toBeFocused();
      await expect(drawer.getByText('A useful summary')).toBeVisible();
    } else {
      await expect(status).toContainText('Analysis failed');
      await expect(drawer.getByRole('button', { name: 'Extract Insights' })).toBeFocused();
      await expect(drawer.getByText('Analysis Failed', { exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}

test('analysis completion does not steal focus after the user moves it', async ({ page }) => {
  await page.route('**/src/services/gemini.ts', (route) => route.fulfill({ contentType: 'application/javascript', body: `export async function analyzeVideo() { const response = await fetch('/analysis-test'); return (await response.json()).text; }` }));
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/analysis-test', async (route) => {
    await pending;
    await route.fulfill({ json: { text: 'A useful summary' } });
  });
  await page.goto(`${fixture}?assistant=analyzer`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  await drawer.locator('input[type=file]').setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') });
  await drawer.getByRole('button', { name: 'Extract Insights' }).focus();
  await page.keyboard.press('Enter');
  await expect(drawer.getByRole('heading', { name: 'Analyzing Video' })).toBeFocused();
  const other = drawer.getByRole('button', { name: 'Perfect Prompt', exact: true });
  await other.focus();
  release();
  await expect(drawer.getByRole('status')).toContainText('Analysis complete');
  await expect(other).toBeFocused();
});

test('immediately completed analysis preserves focus', async ({ page }) => {
  await page.route('**/src/services/gemini.ts', (route) => route.fulfill({ contentType: 'application/javascript', body: `export async function analyzeVideo() { return 'Immediate summary'; }` }));
  await page.goto(`${fixture}?assistant=analyzer`, { waitUntil: 'domcontentloaded' });
  const drawer = page.getByRole('dialog', { name: 'Studio assistants' });
  await drawer.locator('input[type=file]').setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') });
  await drawer.getByRole('button', { name: 'Extract Insights' }).focus();
  await page.keyboard.press('Enter');
  await expect(drawer.getByRole('heading', { name: 'Analysis results' })).toBeFocused();
});

test('dialog fits the viewport and keeps focus inside', async ({ page }) => {
  await page.goto(fixture, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Video Analyzer', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  // CSS animation can produce subpixel rounding in the browser's bounding box.
  expect(box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.height).toBeLessThanOrEqual(viewport.height + 1);
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => document.querySelector('dialog')?.contains(document.activeElement));
    expect(inside || await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  }
});
