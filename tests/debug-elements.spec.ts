import { test, expect } from '@playwright/test';

test.describe('Debug Elements', () => {
  test('debug what elements are actually present', async ({ page }) => {
    console.log('🔍 Starting DEBUG TEST...');
    
    // Listen for console messages
    page.on('console', msg => {
      console.log(`🖥️ Console ${msg.type()}: ${msg.text()}`);
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`❌ Page error: ${error.message}`);
    });
    
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/debug-01-homepage.png' });
    
    // Wait for the page to be fully loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Wait a bit more for JavaScript to execute
    await page.waitForTimeout(5000);
    console.log('⏳ Waited 5 seconds for JavaScript to load');
    
    // Get all interactive elements
    const buttons = await page.locator('button').all();
    console.log(`🔘 Found ${buttons.length} buttons`);
    
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      const role = await buttons[i].getAttribute('role');
      const type = await buttons[i].getAttribute('type');
      console.log(`  Button ${i}: "${text}" (role: ${role}, type: ${type})`);
    }
    
    // Get all inputs
    const inputs = await page.locator('input').all();
    console.log(`📝 Found ${inputs.length} inputs`);
    
    for (let i = 0; i < inputs.length; i++) {
      const placeholder = await inputs[i].getAttribute('placeholder');
      const type = await inputs[i].getAttribute('type');
      const name = await inputs[i].getAttribute('name');
      console.log(`  Input ${i}: placeholder="${placeholder}", type="${type}", name="${name}"`);
    }
    
    // Get all textareas
    const textareas = await page.locator('textarea').all();
    console.log(`📄 Found ${textareas.length} textareas`);
    
    for (let i = 0; i < textareas.length; i++) {
      const placeholder = await textareas[i].getAttribute('placeholder');
      const name = await textareas[i].getAttribute('name');
      console.log(`  Textarea ${i}: placeholder="${placeholder}", name="${name}"`);
    }
    
    // Get all elements with role attributes
    const roleElements = await page.locator('[role]').all();
    console.log(`🎭 Found ${roleElements.length} elements with roles`);
    
    for (let i = 0; i < Math.min(roleElements.length, 10); i++) {
      const role = await roleElements[i].getAttribute('role');
      const text = await roleElements[i].textContent();
      const tagName = await roleElements[i].evaluate(el => el.tagName.toLowerCase());
      console.log(`  Role ${i}: ${role} (${tagName}) - "${text?.slice(0, 50)}..."`);
    }
    
    // Get all select elements (just in case)
    const selects = await page.locator('select').all();
    console.log(`📋 Found ${selects.length} select elements`);
    
    // Get all forms
    const forms = await page.locator('form').all();
    console.log(`📝 Found ${forms.length} forms`);
    
    // Get page content length
    const content = await page.content();
    console.log(`📄 Page content length: ${content.length} characters`);
    
    // Take a final screenshot
    await page.screenshot({ path: 'test-results/debug-02-final.png' });
    
    console.log('🔍 DEBUG TEST COMPLETED!');
    
    // The test passes if we got this far
    expect(content.length).toBeGreaterThan(1000);
  });
});
