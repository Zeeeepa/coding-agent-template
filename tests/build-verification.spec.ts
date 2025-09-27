import { test, expect } from '@playwright/test';

test.describe('Build Verification', () => {
  test('application builds successfully and serves content', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/build-verification.png' });
    
    // Verify the page loads and has content
    await expect(page.locator('body')).toBeVisible();
    
    // Check that we have some HTML content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
    
    console.log('✅ Build verification successful!');
    console.log(`📄 Page content length: ${content.length} characters`);
  });
});
