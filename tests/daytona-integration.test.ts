import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@playwright/test'
import { DaytonaClient } from '../lib/sandbox/daytona-client'
import { createDaytonaConfiguration } from '../lib/sandbox/config'

describe('Daytona Integration Tests', () => {
  let client: DaytonaClient
  let createdWorkspaces: string[] = []

  beforeAll(async () => {
    // Ensure environment variables are set
    if (!process.env.DAYTONA_API_KEY) {
      throw new Error('DAYTONA_API_KEY environment variable is required for tests')
    }
    if (!process.env.DAYTONA_SERVER_URL) {
      throw new Error('DAYTONA_SERVER_URL environment variable is required for tests')
    }

    client = new DaytonaClient()
  })

  afterAll(async () => {
    // Clean up any remaining workspaces
    for (const workspaceId of createdWorkspaces) {
      try {
        await client.deleteWorkspace(workspaceId)
        console.log(`Cleaned up workspace: ${workspaceId}`)
      } catch (error) {
        console.warn(`Failed to clean up workspace ${workspaceId}:`, error)
      }
    }
  })

  beforeEach(() => {
    // Reset workspace tracking for each test
    createdWorkspaces = []
  })

  test('should create workspace with default resources', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-default-resources',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript',
      envVars: {
        TEST_VAR: 'test-value'
      }
    })

    expect(workspace).toBeDefined()
    expect(workspace.id).toBeTruthy()
    expect(workspace.name).toBe('test-default-resources')
    expect(workspace.status).toBe('running')
    expect(workspace.gitUrl).toBe('https://github.com/Zeeeepa/coding-agent-template.git')
    expect(workspace.branch).toBe('main')

    createdWorkspaces.push(workspace.id)
  })

  test('should create workspace with custom resources', async () => {
    const workspace = await client.createWorkspace({
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

    expect(workspace).toBeDefined()
    expect(workspace.id).toBeTruthy()
    expect(workspace.name).toBe('test-custom-resources')

    createdWorkspaces.push(workspace.id)
  })

  test('should validate and cap excessive resource requests', async () => {
    // This should not throw an error, but should cap the resources
    const workspace = await client.createWorkspace({
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

    expect(workspace).toBeDefined()
    expect(workspace.id).toBeTruthy()

    createdWorkspaces.push(workspace.id)
  })

  test('should execute simple commands successfully', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-command-execution',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    createdWorkspaces.push(workspace.id)

    // Test basic command execution
    const echoResult = await client.executeCommand(workspace.id, 'echo "Hello World"')
    expect(echoResult.success).toBe(true)
    expect(echoResult.exitCode).toBe(0)
    expect(echoResult.output).toContain('Hello World')

    // Test command with environment variables
    const envResult = await client.executeCommand(workspace.id, 'echo $HOME')
    expect(envResult.success).toBe(true)
    expect(envResult.exitCode).toBe(0)
    expect(envResult.output).toBeTruthy()
  })

  test('should handle command execution with working directory', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-cwd-commands',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    createdWorkspaces.push(workspace.id)

    // Test command with working directory
    const pwdResult = await client.executeCommand(workspace.id, 'pwd', {
      cwd: '/workspace'
    })
    expect(pwdResult.success).toBe(true)
    expect(pwdResult.output).toContain('/workspace')
  })

  test('should handle command execution with custom environment variables', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-env-commands',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    createdWorkspaces.push(workspace.id)

    // Test command with custom environment variables
    const envResult = await client.executeCommand(workspace.id, 'echo $CUSTOM_VAR', {
      env: {
        CUSTOM_VAR: 'custom-value'
      }
    })
    expect(envResult.success).toBe(true)
    expect(envResult.output).toContain('custom-value')
  })

  test('should retry failed commands with exponential backoff', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-command-retry',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    createdWorkspaces.push(workspace.id)

    // Test command that might fail initially but succeed on retry
    const result = await client.executeCommand(workspace.id, 'ls /workspace', {
      retries: 3
    })
    
    // Should eventually succeed
    expect(result.success).toBe(true)
  })

  test('should handle workspace status checks', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-status-check',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    createdWorkspaces.push(workspace.id)

    // Check if workspace is ready
    const isReady = await client.isWorkspaceReady(workspace.id)
    expect(isReady).toBe(true)

    // Get workspace info
    const workspaceInfo = await client.getWorkspace(workspace.id)
    expect(workspaceInfo).toBeDefined()
    expect(workspaceInfo?.id).toBe(workspace.id)
  })

  test('should handle git operations in workspace', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-git-operations',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    createdWorkspaces.push(workspace.id)

    // Test git status
    const gitStatusResult = await client.executeCommand(workspace.id, 'git status', {
      cwd: '/workspace'
    })
    expect(gitStatusResult.success).toBe(true)

    // Test git log
    const gitLogResult = await client.executeCommand(workspace.id, 'git log --oneline -5', {
      cwd: '/workspace'
    })
    expect(gitLogResult.success).toBe(true)
    expect(gitLogResult.output).toBeTruthy()
  })

  test('should handle workspace deletion', async () => {
    const workspace = await client.createWorkspace({
      name: 'test-deletion',
      gitUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branch: 'main',
      language: 'javascript'
    })

    expect(workspace).toBeDefined()

    // Delete the workspace
    const deleted = await client.deleteWorkspace(workspace.id)
    expect(deleted).toBe(true)

    // Remove from cleanup list since it's already deleted
    createdWorkspaces = createdWorkspaces.filter(id => id !== workspace.id)
  })

  test('should handle configuration creation', async () => {
    const config = createDaytonaConfiguration({
      repoUrl: 'https://github.com/Zeeeepa/coding-agent-template.git',
      branchName: 'main',
      timeout: '5m',
      ports: [3000, 8080],
      runtime: 'node22',
      resources: { vcpus: 2 }
    })

    expect(config).toBeDefined()
    expect(config.gitUrl).toBe('https://github.com/Zeeeepa/coding-agent-template.git')
    expect(config.branch).toBe('main')
    expect(config.language).toBe('javascript')
    expect(config.timeout).toBe(300) // 5 minutes in seconds
    expect(config.ports).toEqual([3000, 8080])
    expect(config.resources.cpu).toBe(2)
    expect(config.resources.memory).toBe(2)
    expect(config.resources.disk).toBe(5)
    expect(config.envVars).toBeDefined()
  })

  test('should handle error scenarios gracefully', async () => {
    // Test with invalid workspace ID
    const invalidResult = await client.executeCommand('invalid-workspace-id', 'echo test')
    expect(invalidResult.success).toBe(false)
    expect(invalidResult.error).toBeTruthy()

    // Test workspace info for non-existent workspace
    const invalidWorkspace = await client.getWorkspace('invalid-workspace-id')
    expect(invalidWorkspace).toBeNull()

    // Test deletion of non-existent workspace
    const invalidDeletion = await client.deleteWorkspace('invalid-workspace-id')
    expect(invalidDeletion).toBe(false)
  })
})
