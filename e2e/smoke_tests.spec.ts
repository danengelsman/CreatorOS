import { test, expect } from '@playwright/test';

test.describe('CreatorOS End-to-End System Smoke Tests', () => {

  test('should simulate user authentication, onboarding, and full video generation flow', async ({ page }) => {
    // 1. Intercept Gemini video generation API requests to mock polling state transitions
    await page.route('**/api/gemini/generate-video', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ operationName: 'mock-operation-e2e-123' })
      });
    });

    let statusCheckCount = 0;
    await page.route('**/api/gemini/video-status', async route => {
      statusCheckCount++;
      if (statusCheckCount < 3) {
        // First two polls simulate progress
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            done: false, 
            progressPercentage: statusCheckCount * 40, 
            data: null 
          })
        });
      } else {
        // Final poll returns complete with a sample video URL
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            done: true, 
            progressPercentage: 100, 
            data: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' 
          })
        });
      }
    });

    // 2. Load the landing page
    await page.goto('/');
    await expect(page).toHaveTitle(/CreatorOS/i);

    // Verify presence of primary headers
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();

    // 3. Initiate authentication flow
    const getStartedButton = page.locator('button:has-text("Get Started")');
    if (await getStartedButton.count() > 0) {
      await getStartedButton.first().click();
    } else {
      await page.goto('/login');
    }

    // Confirm we are on the Auth screen
    await expect(page).toHaveURL(/\/login/);

    // 4. Fill in user authentication fields
    const testEmail = `smoke-test-${Date.now()}@creatoros.co`;
    const testPassword = 'SmokePassword123!';

    const emailInput = page.locator('input[placeholder="Email Address"]');
    const passwordInput = page.locator('input[placeholder="Password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);

    // Toggle registration if it's currently on Sign In
    const submitButton = page.locator('button[type="submit"]');
    const toggleButton = page.locator('button:has-text("Sign Up")');
    
    if (await toggleButton.count() > 0) {
      await toggleButton.first().click();
    }

    // Submit form (Sign Up)
    await submitButton.click();

    // In case registration fails because user exists or standard test flows run, fallback to Sign In
    try {
      const errorDiv = page.locator('div:has-text("auth/")');
      if (await errorDiv.count() > 0) {
        console.log('Register failed, attempting Sign In fallback...');
        const signInToggle = page.locator('button:has-text("Sign In")');
        if (await signInToggle.count() > 0) {
          await signInToggle.first().click();
          await emailInput.fill(testEmail);
          await passwordInput.fill(testPassword);
          await submitButton.click();
        }
      }
    } catch (err) {
      // Ignore if no errors occurred
    }

    // 5. Check and skip Onboarding if it mounts
    const skipOnboarding = page.locator('button:has-text("Set up manually later")');
    try {
      // Give onboarding 5 seconds to load if it's a new account
      await skipOnboarding.waitFor({ state: 'visible', timeout: 5000 });
      await skipOnboarding.click();
      console.log('Onboarding skipped successfully');
    } catch (e) {
      console.log('Onboarding step did not block or was not displayed, continuing.');
    }

    // 6. Navigation to the "Create" Page via mobile menu drawer (desktop & mobile compatible)
    const menuButton = page.locator('button:has-text("CreatorOS")').or(page.locator('header button').first());
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Select the "Create" navigation item inside drawer
    const createNavItem = page.locator('button:has-text("Create")');
    await expect(createNavItem).toBeVisible();
    await createNavItem.click();

    // 7. Verify the Create Workspace loaded successfully
    const scriptEditor = page.locator('textarea[placeholder*="narrative? AI will score your brand voice"]');
    await expect(scriptEditor).toBeVisible();

    // Fill in a sample video script
    await scriptEditor.fill('This is an automated E2E system check verifying Gemini Video generation, layout boundaries, and reactive workflows.');

    // 8. Toggling Gemini Advanced video configuration settings
    const advancedSettingsButton = page.locator('button[title="Advanced Settings"]');
    await expect(advancedSettingsButton).toBeVisible();
    await advancedSettingsButton.click();

    // Check that video properties expanded
    const videoStyleLabel = page.locator('label:has-text("Video Style")');
    await expect(videoStyleLabel).toBeVisible();

    // Configure style details in expanded settings
    const avatarStyleBtn = page.locator('button:has-text("AI Avatar")');
    if (await avatarStyleBtn.count() > 0) {
      await avatarStyleBtn.first().click();
    }

    const overlayInput = page.locator('input[placeholder*="flying text or captions"]');
    if (await overlayInput.count() > 0) {
      await overlayInput.fill('CreatorOS E2E Test Suite');
    }

    const backgroundInput = page.locator('input[placeholder*="Modern office, Cyberpunk city"]');
    if (await backgroundInput.count() > 0) {
      await backgroundInput.fill('Ultra-minimalist digital agency setup');
    }

    // 9. Trigger Video Generation
    const generateBtn = page.locator('button:has-text("Generate Gemini")');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify polling loader transitions are active
    const previewHeader = page.locator('span:has-text("Gemini Preview")');
    await expect(previewHeader).toBeVisible();

    // Verify the simulated custom video player has rendered the completed video
    const videoContainer = page.locator('video');
    await expect(videoContainer).toBeVisible();
    console.log('E2E video generation completed and tested successfully!');
  });
});
