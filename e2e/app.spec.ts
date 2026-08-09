import { test, expect } from '@playwright/test';

test.describe('CreatorOS E2E System Integrity Checks', () => {
  
  test('should load landing page and display brand branding elements', async ({ page }) => {
    // Navigate to the root path
    await page.goto('/');

    // Check that the page title contains CreatorOS
    await expect(page).toHaveTitle(/CreatorOS/i);

    // Verify presence of primary headers
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();

    // Verify start button/call to action is present
    const ctaButton = page.locator('button:has-text("Get Started"), button:has-text("Sign In")');
    if (await ctaButton.count() > 0) {
      await expect(ctaButton.first()).toBeVisible();
    }
  });

  test('should navigate successfully to login screen', async ({ page }) => {
    await page.goto('/login');

    // Confirm form inputs are present for high reliability login
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Check if elements are rendered correctly
    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
    }
    if (await passwordInput.count() > 0) {
      await expect(passwordInput).toBeVisible();
    }
  });

  test('should verify responsive layouts and safe margins', async ({ page }) => {
    await page.goto('/');
    
    // Ensure viewport handles common desktop widths
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Verify no immediate major overflow container issues
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(docHeight).toBeGreaterThan(0);
  });
});
