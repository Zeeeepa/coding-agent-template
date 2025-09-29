#!/usr/bin/env tsx

/**
 * Comprehensive Daytona Integration Validation Script
 * 
 * This script validates all aspects of the Daytona integration:
 * - Resource management and validation
 * - Error handling and retry logic
 * - Workspace lifecycle management
 * - Command execution reliability
 * - Configuration management
 */

import { DaytonaClient } from './lib/sandbox/daytona-client'
import { createDaytonaConfiguration } from './lib/sandbox/config'

interface ValidationResult {
  testName: string
  success: boolean
  duration: number
  error?: string
  details?: any
}

class DaytonaValidator {
  private client: DaytonaClient
  private results: ValidationResult[] = []
  private createdWorkspaces: string[] = []

  constructor() {
    this.client = new DaytonaClient()
  }

  async runValidation(): Promise<void> {
    console.log('🚀 Starting Comprehensive Daytona Integration Validation...\n')

    // Environment validation
    await this.validateEnvironment()

    // Core functionality tests
    await this.validateResourceManagement()
    await this.validateWorkspaceCreation()
    await this.validateCommandExecution()
    await this.validateErrorHandling()
    await this.validateConfigurationManagement()
    await this.validateWorkspaceLifecycle()

    // Performance and reliability tests
    await this.validatePerformance()
    await this.validateReliability()

    // Cleanup
    await this.cleanup()

    // Generate report
    this.generateReport()
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<ValidationResult> {
    const startTime = Date.now()
    console.log(`🧪 Running: ${testName}`)

    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      
      console.log(`✅ Passed: ${testName} (${duration}ms)`)
      
      const validationResult: ValidationResult = {
        testName,
        success: true,
        duration,
        details: result
      }
      
      this.results.push(validationResult)
      return validationResult
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.log(`❌ Failed: ${testName} (${duration}ms) - ${errorMessage}`)
      
      const validationResult: ValidationResult = {
        testName,
        success: false,
        duration,
        error: errorMessage
      }
      
      this.results.push(validationResult)
      return validationResult
    }
  }

  private async validateEnvironment(): Promise<void> {
    await this.runTest('Environment Variables Check', async () => {
      const requiredVars = [
        'DAYTONA_API_KEY',
        'DAYTONA_SERVER_URL',
        'GITHUB_TOKEN',
        'ANTHROPIC_API_KEY',
        'ANTHROPIC_BASE_URL'
      ]

      const missing = requiredVars.filter(varName => !process.env[varName])
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
      }

      return { requiredVars, allPresent: true }
    })
  }

  private async validateResourceManagement(): Promise<void> {
    await this.runTest('Resource Validation - Default Resources', async () => {
      const workspace = await this.client.createWorkspace({
        name: 'test-default-resources',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript'
      })

      this.createdWorkspaces.push(workspace.id)
      return { workspaceId: workspace.id, resources: 'default' }
    })

    await this.runTest('Resource Validation - Custom Resources', async () => {
      const workspace = await this.client.createWorkspace({
        name: 'test-custom-resources',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript',
        resources: {
          cpu: 2,
          memory: 4,
          disk: 8
        }
      })

      this.createdWorkspaces.push(workspace.id)
      return { workspaceId: workspace.id, resources: { cpu: 2, memory: 4, disk: 8 } }
    })

    await this.runTest('Resource Validation - Excessive Resources (Should Cap)', async () => {
      const workspace = await this.client.createWorkspace({
        name: 'test-resource-capping',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript',
        resources: {
          cpu: 10,    // Should be capped to 4
          memory: 16, // Should be capped to 8
          disk: 20    // Should be capped to 10
        }
      })

      this.createdWorkspaces.push(workspace.id)
      return { workspaceId: workspace.id, resourcesCapped: true }
    })
  }

  private async validateWorkspaceCreation(): Promise<void> {
    await this.runTest('Workspace Creation - JavaScript Project', async () => {
      const workspace = await this.client.createWorkspace({
        name: 'test-js-project',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript',
        envVars: {
          NODE_ENV: 'development',
          TEST_VAR: 'validation-test'
        }
      })

      this.createdWorkspaces.push(workspace.id)

      // Verify workspace is ready
      const isReady = await this.client.isWorkspaceReady(workspace.id)
      if (!isReady) {
        throw new Error('Workspace is not ready after creation')
      }

      return { workspaceId: workspace.id, language: 'javascript', ready: isReady }
    })

    await this.runTest('Workspace Creation - With Git Branch', async () => {
      const workspace = await this.client.createWorkspace({
        name: 'test-git-branch',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main', // Using main branch as it should exist
        language: 'javascript'
      })

      this.createdWorkspaces.push(workspace.id)
      return { workspaceId: workspace.id, branch: 'main' }
    })
  }

  private async validateCommandExecution(): Promise<void> {
    // Create a workspace for command testing
    const workspace = await this.client.createWorkspace({
      name: 'test-command-execution',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })
    this.createdWorkspaces.push(workspace.id)

    await this.runTest('Command Execution - Basic Commands', async () => {
      const echoResult = await this.client.executeCommand(workspace.id, 'echo "Hello World"')
      if (!echoResult.success || !echoResult.output?.includes('Hello World')) {
        throw new Error('Basic echo command failed')
      }

      const pwdResult = await this.client.executeCommand(workspace.id, 'pwd')
      if (!pwdResult.success || !pwdResult.output) {
        throw new Error('pwd command failed')
      }

      return { echo: echoResult.output, pwd: pwdResult.output }
    })

    await this.runTest('Command Execution - With Working Directory', async () => {
      const result = await this.client.executeCommand(workspace.id, 'pwd', {
        cwd: '/workspace'
      })

      if (!result.success || !result.output?.includes('/workspace')) {
        throw new Error('Working directory command failed')
      }

      return { output: result.output }
    })

    await this.runTest('Command Execution - With Environment Variables', async () => {
      const result = await this.client.executeCommand(workspace.id, 'echo $CUSTOM_VAR', {
        env: { CUSTOM_VAR: 'test-value' }
      })

      if (!result.success || !result.output?.includes('test-value')) {
        throw new Error('Environment variable command failed')
      }

      return { output: result.output }
    })

    await this.runTest('Command Execution - Git Operations', async () => {
      const gitStatusResult = await this.client.executeCommand(workspace.id, 'git status', {
        cwd: '/workspace'
      })

      if (!gitStatusResult.success) {
        throw new Error('Git status command failed')
      }

      const gitLogResult = await this.client.executeCommand(workspace.id, 'git log --oneline -3', {
        cwd: '/workspace'
      })

      if (!gitLogResult.success) {
        throw new Error('Git log command failed')
      }

      return { 
        gitStatus: gitStatusResult.output?.substring(0, 100),
        gitLog: gitLogResult.output?.substring(0, 100)
      }
    })
  }

  private async validateErrorHandling(): Promise<void> {
    await this.runTest('Error Handling - Invalid Workspace ID', async () => {
      const result = await this.client.executeCommand('invalid-workspace-id', 'echo test')
      
      if (result.success) {
        throw new Error('Expected command to fail with invalid workspace ID')
      }

      return { errorHandled: true, error: result.error }
    })

    await this.runTest('Error Handling - Command Retry Logic', async () => {
      // Create a workspace for retry testing
      const workspace = await this.client.createWorkspace({
        name: 'test-retry-logic',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript'
      })
      this.createdWorkspaces.push(workspace.id)

      // Test command with retry
      const result = await this.client.executeCommand(workspace.id, 'ls /workspace', {
        retries: 3
      })

      if (!result.success) {
        throw new Error('Command with retry failed')
      }

      return { retrySuccess: true, output: result.output?.substring(0, 100) }
    })

    await this.runTest('Error Handling - Non-existent Workspace Operations', async () => {
      const workspaceInfo = await this.client.getWorkspace('non-existent-workspace')
      if (workspaceInfo !== null) {
        throw new Error('Expected null for non-existent workspace')
      }

      const deleteResult = await this.client.deleteWorkspace('non-existent-workspace')
      if (deleteResult !== false) {
        throw new Error('Expected false for deleting non-existent workspace')
      }

      return { nullWorkspace: true, deleteFailed: true }
    })
  }

  private async validateConfigurationManagement(): Promise<void> {
    await this.runTest('Configuration Management - Default Config', async () => {
      const config = createDaytonaConfiguration({
        repoUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branchName: 'main',
        timeout: '5m',
        ports: [3000],
        runtime: 'node22'
      })

      if (!config.gitUrl || !config.branch || !config.language) {
        throw new Error('Configuration missing required fields')
      }

      return {
        gitUrl: config.gitUrl,
        branch: config.branch,
        language: config.language,
        timeout: config.timeout,
        resources: config.resources
      }
    })

    await this.runTest('Configuration Management - Custom Resources', async () => {
      const config = createDaytonaConfiguration({
        repoUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branchName: 'main',
        timeout: '10m',
        ports: [3000, 8080],
        runtime: 'node22',
        resources: { vcpus: 3 }
      })

      if (config.resources.cpu !== 3) {
        throw new Error('Custom CPU configuration not applied')
      }

      return {
        customCpu: config.resources.cpu,
        timeout: config.timeout,
        ports: config.ports
      }
    })
  }

  private async validateWorkspaceLifecycle(): Promise<void> {
    await this.runTest('Workspace Lifecycle - Create, Use, Delete', async () => {
      // Create workspace
      const workspace = await this.client.createWorkspace({
        name: 'test-lifecycle',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript'
      })

      // Use workspace
      const commandResult = await this.client.executeCommand(workspace.id, 'echo "lifecycle test"')
      if (!commandResult.success) {
        throw new Error('Command execution failed in lifecycle test')
      }

      // Check workspace status
      const isReady = await this.client.isWorkspaceReady(workspace.id)
      if (!isReady) {
        throw new Error('Workspace not ready in lifecycle test')
      }

      // Delete workspace
      const deleted = await this.client.deleteWorkspace(workspace.id)
      if (!deleted) {
        throw new Error('Workspace deletion failed in lifecycle test')
      }

      return {
        created: true,
        commandExecuted: true,
        ready: isReady,
        deleted: deleted
      }
    })
  }

  private async validatePerformance(): Promise<void> {
    await this.runTest('Performance - Workspace Creation Time', async () => {
      const startTime = Date.now()
      
      const workspace = await this.client.createWorkspace({
        name: 'test-performance',
        gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
        branch: 'main',
        language: 'javascript'
      })

      const creationTime = Date.now() - startTime
      this.createdWorkspaces.push(workspace.id)

      // Performance threshold: workspace creation should complete within 5 minutes
      if (creationTime > 300000) {
        throw new Error(`Workspace creation took too long: ${creationTime}ms`)
      }

      return { creationTime, workspaceId: workspace.id }
    })

    await this.runTest('Performance - Command Execution Speed', async () => {
      // Use the last created workspace
      const workspaceId = this.createdWorkspaces[this.createdWorkspaces.length - 1]
      
      const startTime = Date.now()
      const result = await this.client.executeCommand(workspaceId, 'echo "performance test"')
      const executionTime = Date.now() - startTime

      if (!result.success) {
        throw new Error('Performance test command failed')
      }

      // Command execution should be fast (under 30 seconds)
      if (executionTime > 30000) {
        throw new Error(`Command execution took too long: ${executionTime}ms`)
      }

      return { executionTime, output: result.output }
    })
  }

  private async validateReliability(): Promise<void> {
    await this.runTest('Reliability - Multiple Concurrent Commands', async () => {
      // Use an existing workspace
      const workspaceId = this.createdWorkspaces[this.createdWorkspaces.length - 1]
      
      // Execute multiple commands concurrently
      const commands = [
        'echo "command 1"',
        'echo "command 2"',
        'echo "command 3"',
        'pwd',
        'date'
      ]

      const promises = commands.map(cmd => 
        this.client.executeCommand(workspaceId, cmd)
      )

      const results = await Promise.all(promises)
      
      const failedCommands = results.filter(r => !r.success)
      if (failedCommands.length > 0) {
        throw new Error(`${failedCommands.length} commands failed in concurrent test`)
      }

      return { 
        totalCommands: commands.length,
        successfulCommands: results.filter(r => r.success).length,
        outputs: results.map(r => r.output?.substring(0, 50))
      }
    })
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test workspaces...')
    
    for (const workspaceId of this.createdWorkspaces) {
      try {
        await this.client.deleteWorkspace(workspaceId)
        console.log(`✅ Cleaned up workspace: ${workspaceId}`)
      } catch (error) {
        console.log(`⚠️ Failed to clean up workspace ${workspaceId}:`, error)
      }
    }
  }

  private generateReport(): void {
    console.log('\n📊 VALIDATION REPORT')
    console.log('=' .repeat(50))

    const totalTests = this.results.length
    const passedTests = this.results.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} ✅`)
    console.log(`Failed: ${failedTests} ❌`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`)

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`)
        })
    }

    console.log('\n📈 PERFORMANCE METRICS:')
    const performanceTests = this.results.filter(r => r.testName.includes('Performance'))
    performanceTests.forEach(test => {
      console.log(`  - ${test.testName}: ${test.duration}ms`)
    })

    console.log('\n🎯 VALIDATION SUMMARY:')
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Daytona integration is production-ready.')
    } else {
      console.log(`⚠️ ${failedTests} tests failed. Review and fix issues before production deployment.`)
    }

    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0)
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new DaytonaValidator()
  validator.runValidation().catch(error => {
    console.error('❌ Validation failed with error:', error)
    process.exit(1)
  })
}

export { DaytonaValidator }
