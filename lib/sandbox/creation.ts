import { validateEnvironmentVariables, createAuthenticatedRepoUrl, createDaytonaConfiguration } from './config'
import { runCommandInWorkspace } from './commands'
import { generateId } from '@/lib/utils/id'
import { SandboxConfig, SandboxResult } from './types'
import { redactSensitiveInfo } from '@/lib/utils/logging'
import { TaskLogger } from '@/lib/utils/task-logger'
import { getDaytonaClient, DaytonaWorkspace } from './daytona-client'

// Helper function to run command and log it
async function runAndLogCommand(workspace: DaytonaWorkspace, command: string, args: string[], logger: TaskLogger) {
  const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
  const redactedCommand = redactSensitiveInfo(fullCommand)

  await logger.command(redactedCommand)

  const result = await runCommandInWorkspace(workspace.id, command, args)

  if (result && result.output && result.output.trim()) {
    const redactedOutput = redactSensitiveInfo(result.output.trim())
    await logger.info(redactedOutput)
  }

  if (result && !result.success && result.error) {
    const redactedError = redactSensitiveInfo(result.error)
    await logger.error(redactedError)
  }

  return result
}

export async function createSandbox(config: SandboxConfig, logger: TaskLogger): Promise<SandboxResult> {
  const logs: string[] = []

  try {
    await logger.info(`Repository URL: ${redactSensitiveInfo(config.repoUrl)}`)

    // Check for cancellation before starting
    if (config.onCancellationCheck && (await config.onCancellationCheck())) {
      await logger.info('Task was cancelled before workspace creation')
      return { success: false, cancelled: true, logs }
    }

    // Call progress callback if provided
    if (config.onProgress) {
      await config.onProgress(20, 'Validating environment variables...')
    }

    // Validate required environment variables
    const envValidation = validateEnvironmentVariables(config.selectedAgent)
    if (!envValidation.valid) {
      throw new Error(envValidation.error!)
    }
    await logger.info('Environment variables validated')

    // Handle private repository authentication
    const authenticatedRepoUrl = createAuthenticatedRepoUrl(config.repoUrl)
    await logger.info('Added GitHub authentication to repository URL')

    // For initial clone, only use existing branch names, not AI-generated ones
    // AI-generated branch names will be created later inside the workspace
    const branchNameForEnv = config.existingBranchName

    // Create Daytona workspace configuration
    const daytonaConfig = createDaytonaConfiguration({
      repoUrl: authenticatedRepoUrl,
      branchName: branchNameForEnv || 'main',
      timeout: config.timeout,
      ports: config.ports,
      runtime: config.runtime,
      resources: config.resources,
    })

    await logger.info(
      `Daytona config: ${JSON.stringify(
        {
          ...daytonaConfig,
          gitUrl: '[REDACTED]',
        },
        null,
        2,
      )}`,
    )

    // Call progress callback before workspace creation
    if (config.onProgress) {
      await config.onProgress(25, 'Creating Daytona workspace...')
    }

    let workspace: DaytonaWorkspace
    try {
      const daytonaClient = getDaytonaClient()

      workspace = await daytonaClient.createWorkspace({
        name: `coding-task-${config.taskId}`,
        gitUrl: authenticatedRepoUrl,
        branch: branchNameForEnv || 'main',
        language: daytonaConfig.language as 'typescript' | 'python' | 'javascript',
        envVars: daytonaConfig.envVars,
        timeout: daytonaConfig.timeout,
      })

      await logger.info('Daytona workspace created successfully')
      logs.push('Workspace created successfully')

      // Check for cancellation after workspace creation
      if (config.onCancellationCheck && (await config.onCancellationCheck())) {
        await logger.info('Task was cancelled after workspace creation')
        return { success: false, cancelled: true, logs }
      }

      // Call progress callback after workspace creation
      if (config.onProgress) {
        await config.onProgress(30, 'Workspace created, installing dependencies...')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorName = error instanceof Error ? error.name : 'UnknownError'
      const errorCode =
        error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
      const errorResponse =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { status?: number; data?: unknown } }).response
          : undefined

      // Check if this is a timeout error
      if (errorMessage?.includes('timeout') || errorCode === 'ETIMEDOUT' || errorName === 'TimeoutError') {
        await logger.error(`Workspace creation timed out`)
        await logger.error(`This usually happens when the repository is large or has many dependencies`)
        throw new Error('Workspace creation timed out. Try with a smaller repository or fewer dependencies.')
      }

      await logger.error(`Workspace creation failed: ${errorMessage}`)
      if (errorResponse) {
        await logger.error(`HTTP Status: ${errorResponse.status}`)
        await logger.error(`Response: ${JSON.stringify(errorResponse.data)}`)
      }
      throw error
    }

    // Install project dependencies (based on user preference)
    if (config.installDependencies !== false) {
      await logger.info('Detecting project type and installing dependencies...')
    } else {
      await logger.info('Skipping dependency installation as requested by user')
    }

    // Check for project type and install dependencies accordingly
    const packageJsonCheck = await runCommandInWorkspace(workspace.id, 'test', ['-f', 'package.json'])
    const requirementsTxtCheck = await runCommandInWorkspace(workspace.id, 'test', ['-f', 'requirements.txt'])

    if (config.installDependencies !== false) {
      if (packageJsonCheck.success) {
        // JavaScript/Node.js project
        await logger.info('package.json found, installing Node.js dependencies...')

        // Call progress callback before dependency installation
        if (config.onProgress) {
          await config.onProgress(35, 'Installing Node.js dependencies...')
        }

        // Install dependencies using npm (simplest approach for Daytona)
        const installResult = await runCommandInWorkspace(workspace.id, 'npm', ['install'])

        if (installResult.success) {
          await logger.info('Node.js dependencies installed successfully')
          logs.push('Dependencies installed successfully')
        } else {
          await logger.info('Warning: Failed to install Node.js dependencies, but continuing with workspace setup')
          logs.push('Warning: Dependency installation failed')
        }

        // Check for cancellation after dependency installation
        if (config.onCancellationCheck && (await config.onCancellationCheck())) {
          await logger.info('Task was cancelled after dependency installation')
          return { success: false, cancelled: true, logs }
        }
      } else if (requirementsTxtCheck.success) {
        // Python project
        await logger.info('requirements.txt found, installing Python dependencies...')

        // Call progress callback before dependency installation
        if (config.onProgress) {
          await config.onProgress(35, 'Installing Python dependencies...')
        }

        // Install dependencies using pip (simplified for Daytona)
        const pipInstall = await runCommandInWorkspace(workspace.id, 'pip3', ['install', '-r', 'requirements.txt'])

        if (pipInstall.success) {
          await logger.info('Python dependencies installed successfully')
          logs.push('Python dependencies installed successfully')
        } else {
          await logger.info('Warning: Failed to install Python dependencies, but continuing with workspace setup')
          logs.push('Warning: Python dependency installation failed')
        }
      } else {
        await logger.info('No package.json or requirements.txt found, skipping dependency installation')
      }
    } // End of installDependencies check

    // Get the workspace URL
    const domain = workspace.url || `workspace-${workspace.id}.daytona.dev`

    // Log workspace readiness based on project type
    if (packageJsonCheck.success) {
      await logger.info('Node.js project detected, workspace ready for development')
      await logger.info(`Workspace available at: ${domain}`)
      logs.push('Node.js project ready')
    } else if (requirementsTxtCheck.success) {
      await logger.info('Python project detected, workspace ready for development')
      await logger.info(`Workspace available at: ${domain}`)
      logs.push('Python project ready')
    } else {
      await logger.info('Project type not detected, workspace ready for general development')
      await logger.info(`Workspace available at: ${domain}`)
      logs.push('Workspace ready for development')
    }

    // Check for cancellation before Git configuration
    if (config.onCancellationCheck && (await config.onCancellationCheck())) {
      await logger.info('Task was cancelled before Git configuration')
      return { success: false, cancelled: true, logs }
    }

    // Configure Git user
    await runCommandInWorkspace(workspace.id, 'git', ['config', 'user.name', 'Coding Agent'])
    await runCommandInWorkspace(workspace.id, 'git', ['config', 'user.email', 'agent@example.com'])

    // Verify we're in a Git repository
    const gitRepoCheck = await runCommandInWorkspace(workspace.id, 'git', ['rev-parse', '--git-dir'])
    if (!gitRepoCheck.success) {
      await logger.info('Not in a Git repository, initializing...')
      const gitInit = await runCommandInWorkspace(workspace.id, 'git', ['init'])
      if (!gitInit.success) {
        throw new Error('Failed to initialize Git repository')
      }
      await logger.info('Git repository initialized')
    } else {
      await logger.info('Git repository detected')
    }

    // Add debugging information about Git state
    await logger.info('Debugging Git repository state...')
    const gitStatusDebug = await runCommandInWorkspace(workspace.id, 'git', ['status', '--porcelain'])
    await logger.info(`Git status (porcelain): ${gitStatusDebug.output || 'Clean working directory'}`)

    const gitBranchDebug = await runCommandInWorkspace(workspace.id, 'git', ['branch', '-a'])
    await logger.info(`Available branches: ${gitBranchDebug.output || 'No branches listed'}`)

    const gitRemoteDebug = await runCommandInWorkspace(workspace.id, 'git', ['remote', '-v'])
    await logger.info(`Git remotes: ${gitRemoteDebug.output || 'No remotes configured'}`)

    // Configure Git to use GitHub token for authentication
    if (process.env.GITHUB_TOKEN) {
      await logger.info('Configuring Git authentication with GitHub token')
      await runCommandInWorkspace(workspace.id, 'git', ['config', 'credential.helper', 'store'])

      // Create credentials file with GitHub token
      const credentialsContent = `https://${process.env.GITHUB_TOKEN}:x-oauth-basic@github.com`
      await runCommandInWorkspace(workspace.id, 'sh', ['-c', `echo "${credentialsContent}" > ~/.git-credentials`])
    }

    let branchName: string

    if (config.existingBranchName) {
      // Checkout existing branch for continuing work
      await logger.info(`Checking out existing branch: ${config.existingBranchName}`)
      const checkoutResult = await runAndLogCommand(workspace, 'git', ['checkout', config.existingBranchName], logger)

      if (!checkoutResult.success) {
        throw new Error(`Failed to checkout existing branch ${config.existingBranchName}`)
      }

      branchName = config.existingBranchName
    } else if (config.preDeterminedBranchName) {
      // Use the AI-generated branch name
      await logger.info(`Using pre-determined branch name: ${config.preDeterminedBranchName}`)

      // Create new branch (simplified for Daytona)
      await logger.info(`Creating new branch: ${config.preDeterminedBranchName}`)
      const createBranch = await runAndLogCommand(
        workspace,
        'git',
        ['checkout', '-b', config.preDeterminedBranchName],
        logger,
      )

      if (!createBranch.success) {
        await logger.info(`Failed to create branch ${config.preDeterminedBranchName}: ${createBranch.error}`)
        throw new Error(`Failed to create Git branch ${config.preDeterminedBranchName}`)
      }

      await logger.info(`Successfully created branch: ${config.preDeterminedBranchName}`)
      branchName = config.preDeterminedBranchName
    } else {
      // Fallback: Create a timestamp-based branch name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const suffix = generateId()
      branchName = `agent/${timestamp}-${suffix}`

      await logger.info(`No predetermined branch name, using timestamp-based: ${branchName}`)
      const createBranch = await runAndLogCommand(workspace, 'git', ['checkout', '-b', branchName], logger)

      if (!createBranch.success) {
        await logger.info(`Failed to create branch ${branchName}: ${createBranch.error}`)
        throw new Error(`Failed to create Git branch ${branchName}`)
      }

      await logger.info(`Successfully created fallback branch: ${branchName}`)
    }

    return {
      success: true,
      workspace,
      domain,
      branchName,
      logs,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Workspace creation error:', error)
    await logger.error(`Error: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage || 'Failed to create workspace',
      logs,
    }
  }
}
