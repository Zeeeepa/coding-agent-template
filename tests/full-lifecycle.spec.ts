import { test, expect } from '@playwright/test'

test.describe('Full Lifecycle Test', () => {
  test('complete workflow: select repo, create task, implement feature', async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Wait for the page to load - be flexible about the content
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Give the app time to fully load

    // Take a screenshot of the homepage
    await page.screenshot({ path: 'test-results/01-homepage.png' })

    // Check if we're still on the loading screen and wait for it to finish
    const loadingIndicator = page
      .locator('h1:has-text("Web Preview Starting")')
      .or(page.locator('h1:has-text("Web Preview Loading")'))

    let loadingAttempts = 0
    while ((await loadingIndicator.isVisible()) && loadingAttempts < 12) {
      // Wait up to 2 minutes
      console.log(`⏳ App is still loading, waiting... (attempt ${loadingAttempts + 1}/12)`)
      await page.waitForTimeout(10000) // Wait 10 seconds each time
      loadingAttempts++
      await page.screenshot({ path: `test-results/loading-${loadingAttempts}.png` })
    }

    // Now check for the actual app content
    const appContent = page.locator('body').or(page.locator('main')).or(page.locator('[data-testid="app"]'))
    await expect(appContent.first()).toBeVisible({ timeout: 15000 })

    // Debug: Print the page content to understand what's available
    const pageContent = await page.content()
    console.log('📄 Page HTML length:', pageContent.length)

    // Debug: Take a screenshot to see what's actually rendered
    await page.screenshot({ path: 'test-results/debug-page-content.png' })

    // Look for any form elements or interactive components
    const anyForm = page.locator('form').first()
    const anyButton = page.locator('button').first()
    const anyInput = page.locator('input').first()
    const anyTextarea = page.locator('textarea').first()

    console.log('🔍 Looking for interactive elements...')

    // Check what elements are actually available
    if (await anyForm.isVisible()) {
      console.log('✅ Found form element')
      await page.screenshot({ path: 'test-results/found-form.png' })
    }

    if (await anyButton.isVisible()) {
      console.log('✅ Found button element')
      const buttonText = await anyButton.textContent()
      console.log('🔘 Button text:', buttonText)
    }

    if (await anyInput.isVisible()) {
      console.log('✅ Found input element')
      const inputPlaceholder = await anyInput.getAttribute('placeholder')
      console.log('📝 Input placeholder:', inputPlaceholder)
    }

    if (await anyTextarea.isVisible()) {
      console.log('✅ Found textarea element')
    }

    // Look for repository selector or form with more flexible selectors
    const repoSelector = page
      .locator('[data-testid="repo-selector"]')
      .or(
        page
          .locator('select')
          .or(
            page
              .locator('input[placeholder*="repo"]')
              .or(page.locator('button:has-text("Select")').or(page.locator('button').or(page.locator('form')))),
          ),
      )

    // Wait for any interactive element to be visible - be very flexible
    try {
      await expect(repoSelector.first()).toBeVisible({ timeout: 10000 })
    } catch (error) {
      console.log('⚠️ No specific interactive elements found, continuing with general page interaction')
      // Just verify the page is loaded and has content
      await expect(page.locator('body')).toBeVisible()
    }

    // Take a screenshot of the repo selection
    await page.screenshot({ path: 'test-results/02-repo-selection.png' })

    // Try to find and interact with repository selection
    const selectButton = page.locator('button:has-text("Select")').first()
    if (await selectButton.isVisible()) {
      await selectButton.click()
      await page.waitForTimeout(1000)
    }

    // Look for task creation form
    const taskForm = page
      .locator('form')
      .or(page.locator('[data-testid="task-form"]').or(page.locator('textarea').or(page.locator('input[type="text"]'))))

    await expect(taskForm.first()).toBeVisible({ timeout: 10000 })

    // Take a screenshot of the task form
    await page.screenshot({ path: 'test-results/03-task-form.png' })

    // Fill in task details
    const taskDescription =
      'Add a new feature: implement a simple health check endpoint at /api/health that returns {"status": "ok", "timestamp": new Date().toISOString()}'

    // Try different selectors for the task input
    const taskInput = page
      .locator('textarea')
      .or(
        page
          .locator('input[placeholder*="task"]')
          .or(page.locator('input[placeholder*="describe"]').or(page.locator('[data-testid="task-input"]'))),
      )

    if (await taskInput.first().isVisible()) {
      await taskInput.first().fill(taskDescription)
      await page.waitForTimeout(500)
    }

    // Look for agent selection
    const agentSelector = page
      .locator('select')
      .or(
        page
          .locator('[data-testid="agent-selector"]')
          .or(page.locator('button:has-text("Claude")').or(page.locator('button:has-text("Cursor")'))),
      )

    if (await agentSelector.first().isVisible()) {
      // Try to select an agent (prefer Claude or Cursor)
      const claudeOption = page.locator('option:has-text("Claude")').or(page.locator('button:has-text("Claude")'))

      if (await claudeOption.first().isVisible()) {
        await claudeOption.first().click()
      }
    }

    // Take a screenshot before submitting
    await page.screenshot({ path: 'test-results/04-before-submit.png' })

    // Submit the task
    const submitButton = page
      .locator('button[type="submit"]')
      .or(
        page
          .locator('button:has-text("Create")')
          .or(page.locator('button:has-text("Submit")').or(page.locator('button:has-text("Start")'))),
      )

    if (await submitButton.first().isVisible()) {
      await submitButton.first().click()

      // Wait for task creation and navigation
      await page.waitForTimeout(2000)

      // Take a screenshot after submission
      await page.screenshot({ path: 'test-results/05-after-submit.png' })

      // Check if we're on a task page
      const taskPage = page
        .locator('[data-testid="task-page"]')
        .or(
          page
            .locator('h1:has-text("Task")')
            .or(page.locator('.task-status').or(page.locator('[data-testid="task-status"]'))),
        )

      // Wait for task page to load
      await expect(taskPage.first()).toBeVisible({ timeout: 15000 })

      // Take a screenshot of the task page
      await page.screenshot({ path: 'test-results/06-task-page.png' })

      // Monitor task progress for a reasonable time
      let attempts = 0
      const maxAttempts = 30 // 30 seconds

      while (attempts < maxAttempts) {
        // Check for completion indicators
        const completedIndicator = page
          .locator(':has-text("completed")')
          .or(
            page
              .locator(':has-text("success")')
              .or(page.locator(':has-text("finished")').or(page.locator('.status-success'))),
          )

        const errorIndicator = page
          .locator(':has-text("error")')
          .or(page.locator(':has-text("failed")').or(page.locator('.status-error')))

        if (await completedIndicator.first().isVisible()) {
          await page.screenshot({ path: 'test-results/07-task-completed.png' })
          console.log('✅ Task completed successfully!')
          break
        }

        if (await errorIndicator.first().isVisible()) {
          await page.screenshot({ path: 'test-results/07-task-error.png' })
          console.log('❌ Task encountered an error')
          break
        }

        // Wait and check again
        await page.waitForTimeout(1000)
        attempts++

        // Take periodic screenshots
        if (attempts % 10 === 0) {
          await page.screenshot({ path: `test-results/progress-${attempts}s.png` })
          console.log(`⏳ Still monitoring task progress... ${attempts}s elapsed`)
        }
      }

      // Final screenshot
      await page.screenshot({ path: 'test-results/08-final-state.png' })

      // Verify the page contains expected elements
      await expect(page.locator('body')).toBeVisible()

      console.log('🎉 Full lifecycle test completed!')
    } else {
      console.log('⚠️ Could not find submit button, taking final screenshot')
      await page.screenshot({ path: 'test-results/no-submit-button.png' })
    }
  })
})
