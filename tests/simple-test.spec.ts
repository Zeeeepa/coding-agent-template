import { test, expect } from '@playwright/test'

test.describe('Simple Application Test', () => {
  test('basic functionality test', async ({ page }) => {
    console.log('🚀 Starting simple test...')
    
    // Navigate to the application
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/simple-01-loaded.png' })
    
    // Verify page loads
    await expect(page.locator('body')).toBeVisible()
    
    // Check for basic content
    const content = await page.content()
    expect(content.length).toBeGreaterThan(1000)
    
    console.log('✅ Page loaded successfully')
    console.log(`📄 Content length: ${content.length} characters`)
    
    // Look for any interactive elements
    const buttons = await page.locator('button').count()
    const inputs = await page.locator('input').count()
    const selects = await page.locator('select').count()
    const comboboxes = await page.locator('[role="combobox"]').count()
    
    console.log(`🔘 Found ${buttons} buttons`)
    console.log(`📝 Found ${inputs} inputs`)
    console.log(`📋 Found ${selects} selects`)
    console.log(`🎛️ Found ${comboboxes} comboboxes`)
    
    // Try to interact with the first combobox if available
    if (comboboxes > 0) {
      console.log('🎯 Attempting to interact with combobox...')
      const combobox = page.locator('[role="combobox"]').first()
      await combobox.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/simple-02-combobox-clicked.png' })
      
      // Check for options
      const options = await page.locator('[role="option"]').count()
      console.log(`📋 Found ${options} options in dropdown`)
    }
    
    console.log('✅ Simple test completed successfully!')
  })
})
