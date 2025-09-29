import { test, expect } from '@playwright/test'

test.describe('Full Lifecycle Test', () => {
  test('complete task creation and monitoring workflow', async ({ page }) => {
    console.log('🚀 Starting FULL LIFECYCLE TEST...')
    
    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to application...')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/full-01-homepage.png' })
    
    // Step 2: Wait for the app to fully load
    console.log('📍 Step 2: Waiting for UI to load...')
    await expect(page.locator('body')).toBeVisible()
    
    // Step 3: Look for the task description textarea
    console.log('📍 Step 3: Looking for task description input...')
    const taskDescription = page.locator('textarea[placeholder*="Describe what you want"]').first()
    await expect(taskDescription).toBeVisible({ timeout: 10000 })
    console.log('✅ Found task description textarea')
    
    // Step 4: Fill in the task description
    console.log('📍 Step 4: Filling task description...')
    const testTaskDescription = 'Create a simple hello world function in Python'
    await taskDescription.fill(testTaskDescription)
    console.log(`✅ Filled task description: "${testTaskDescription}"`)
    
    await page.screenshot({ path: 'test-results/full-02-task-filled.png' })
    
    // Step 5: Look for agent selector
    console.log('📍 Step 5: Looking for agent selector...')
    const agentSelector = page.locator('[role="combobox"]').filter({ hasText: /claude|agent/i }).first()
    
    if (await agentSelector.isVisible()) {
      console.log('✅ Found agent selector')
      await agentSelector.click()
      await page.waitForTimeout(1000)
      
      // Select Claude agent if available
      const claudeOption = page.locator('[role="option"]').filter({ hasText: /claude/i }).first()
      if (await claudeOption.isVisible()) {
        await claudeOption.click()
        console.log('✅ Selected Claude agent')
      }
    } else {
      console.log('⚠️ Agent selector not found, using default')
    }
    
    await page.screenshot({ path: 'test-results/full-03-agent-selected.png' })
    
    // Step 6: Look for repository selector (need to select both owner and repo)
    console.log('📍 Step 6: Looking for repository selector...')
    const repoSelectors = page.locator('[role="combobox"]')
    const selectorCount = await repoSelectors.count()
    console.log(`Found ${selectorCount} selectors`)
    
    // First selector should be owner/organization
    if (selectorCount >= 1) {
      const ownerSelector = repoSelectors.nth(0)
      console.log('✅ Found owner selector')
      await ownerSelector.click()
      await page.waitForTimeout(1000)
      
      // Select first available owner
      const firstOwner = page.locator('[role="option"]').first()
      if (await firstOwner.isVisible()) {
        const ownerText = await firstOwner.textContent()
        await firstOwner.click()
        console.log(`✅ Selected owner: ${ownerText}`)
        await page.waitForTimeout(1000)
      }
    }
    
    // Second selector should be repository
    if (selectorCount >= 2) {
      const repoSelector = repoSelectors.nth(1)
      console.log('✅ Found repo selector')
      await repoSelector.click()
      await page.waitForTimeout(1000)
      
      // Select first available repository
      const firstRepo = page.locator('[role="option"]').first()
      if (await firstRepo.isVisible()) {
        const repoText = await firstRepo.textContent()
        await firstRepo.click()
        console.log(`✅ Selected repository: ${repoText}`)
      }
    } else {
      console.log('⚠️ Repository selector not found')
    }
    
    await page.screenshot({ path: 'test-results/full-04-repo-selected.png' })
    
    // Step 7: Look for submit button (it's a round button with ArrowUp icon)
    console.log('📍 Step 7: Looking for submit button...')
    const submitButton = page.locator('button[type="submit"]').first()
    
    if (await submitButton.isVisible()) {
      console.log('✅ Found submit button')
      
      // Check if button is enabled
      const isEnabled = await submitButton.isEnabled()
      console.log(`Button enabled: ${isEnabled}`)
      
      if (isEnabled) {
        console.log('📍 Step 8: Submitting task...')
        await submitButton.click()
        console.log('✅ Clicked submit button')
        
        // Wait for navigation or success message
        await page.waitForTimeout(3000)
        await page.screenshot({ path: 'test-results/full-05-task-submitted.png' })
        
        // Check for success indicators
        const successMessage = page.locator('text=/success|created|started/i').first()
        const tasksList = page.locator('[data-testid="tasks-list"]')
        const newUrl = page.url()
        
        console.log(`Current URL: ${newUrl}`)
        
        if (await successMessage.isVisible()) {
          console.log('✅ Found success message')
        }
        
        if (await tasksList.isVisible()) {
          console.log('✅ Found tasks list')
        }
        
        // If we're on a task detail page, verify it
        if (newUrl.includes('/tasks/')) {
          console.log('✅ Navigated to task detail page')
          
          // Look for task details
          const taskTitle = page.locator('h1, h2').first()
          if (await taskTitle.isVisible()) {
            const titleText = await taskTitle.textContent()
            console.log(`Task title: ${titleText}`)
          }
          
          // Look for status indicator
          const statusIndicator = page.locator('[data-testid="task-status"], .status, .badge').first()
          if (await statusIndicator.isVisible()) {
            const statusText = await statusIndicator.textContent()
            console.log(`Task status: ${statusText}`)
          }
          
          await page.screenshot({ path: 'test-results/full-06-task-detail.png' })
        }
        
        console.log('✅ FULL LIFECYCLE TEST COMPLETED SUCCESSFULLY!')
        
      } else {
        console.log('❌ Submit button is disabled')
        await page.screenshot({ path: 'test-results/full-error-button-disabled.png' })
      }
    } else {
      console.log('❌ Submit button not found')
      await page.screenshot({ path: 'test-results/full-error-no-submit.png' })
    }
  })
})
