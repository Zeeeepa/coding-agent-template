import { Daytona, Workspace } from '@daytonaio/sdk'

export interface DaytonaWorkspace {
  id: string
  name: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  url?: string
  gitUrl?: string
  branch?: string
  workspace?: Workspace
}

export interface DaytonaCommandResult {
  success: boolean
  output?: string
  error?: string
  exitCode?: number
}

export interface DaytonaCreateOptions {
  name: string
  gitUrl: string
  branch?: string
  language?: 'typescript' | 'python' | 'javascript'
  envVars?: Record<string, string>
  timeout?: number
  resources?: {
    cpu?: number
    memory?: number // in GB
    disk?: number   // in GB
  }
}

export class DaytonaClient {
  private daytona: Daytona

  constructor(apiKey?: string, serverUrl?: string, target?: string) {
    // Use environment variables by default as per actual SDK implementation
    const finalApiKey = apiKey || process.env.DAYTONA_API_KEY
    if (!finalApiKey) {
      throw new Error('DAYTONA_API_KEY is required')
    }

    this.daytona = new Daytona({
      apiKey: finalApiKey,
      serverUrl: serverUrl || process.env.DAYTONA_SERVER_URL || 'https://app.daytona.io/api',
      target: (target || process.env.DAYTONA_TARGET || 'us') as 'us' | 'eu',
    })
  }

  /**
   * Create a new Daytona sandbox (workspace)
   */
  async createWorkspace(options: DaytonaCreateOptions): Promise<DaytonaWorkspace> {
    // Validate resources before creation
    const resources = this.validateAndOptimizeResources(options.resources)
    
    try {
      console.log(`Creating Daytona workspace with resources:`, resources)
      
      // Create sandbox using official SDK with validated resource allocation
      const sandbox = await this.daytona.create({
        language: options.language || 'javascript',
        envVars: options.envVars || {},
        resources,
        async: true, // Return immediately without waiting for full startup
        timeout: options.timeout || 300,
        autoStopInterval: 15 // Auto-stop after 15 minutes of inactivity
      })

      console.log(`Workspace created with ID: ${sandbox.id}`)

      // Wait for workspace to be ready with proper polling
      await this.waitForWorkspaceReady(sandbox.id, options.timeout || 300)

      // If git repository is provided, clone it after sandbox creation
      if (options.gitUrl) {
        try {
          console.log(`Cloning repository: ${options.gitUrl}`)
          await sandbox.process.executeCommand(`git clone ${options.gitUrl} /workspace`)
          if (options.branch && options.branch !== 'main') {
            console.log(`Checking out branch: ${options.branch}`)
            await sandbox.process.executeCommand(`cd /workspace && git checkout ${options.branch}`)
          }
        } catch (gitError) {
          console.warn('Git clone failed, but workspace created:', gitError)
        }
      }

      return {
        id: sandbox.id,
        name: options.name,
        status: 'running',
        url: undefined, // Will be available after sandbox starts
        gitUrl: options.gitUrl,
        branch: options.branch,
        workspace: sandbox,
      }
    } catch (error) {
      console.error('Failed to create Daytona sandbox:', error)
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error(`Resource quota exceeded. Try reducing CPU, memory, or disk allocation. Current limits: CPU=${resources.cpu}, Memory=${resources.memory}GB, Disk=${resources.disk}GB`)
        }
        if (error.message.includes('timeout')) {
          throw new Error(`Workspace creation timed out after ${options.timeout || 300} seconds. Try increasing timeout or reducing resource requirements.`)
        }
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          throw new Error(`Access denied. Check your API key and permissions. Resource request: CPU=${resources.cpu}, Memory=${resources.memory}GB, Disk=${resources.disk}GB`)
        }
      }
      
      throw new Error(`Failed to create sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate and optimize resource allocation
   */
  private validateAndOptimizeResources(requestedResources?: { cpu?: number; memory?: number; disk?: number }) {
    // Default conservative resources
    const defaults = {
      cpu: 1,      // 1 CPU core
      memory: 2,   // 2GB memory
      disk: 5      // 5GB disk
    }

    const resources = {
      cpu: requestedResources?.cpu || defaults.cpu,
      memory: requestedResources?.memory || defaults.memory,
      disk: requestedResources?.disk || defaults.disk
    }

    // Validate resource limits (based on discovered 30GB quota and 8GB memory limit)
    if (resources.cpu > 4) {
      console.warn(`CPU request ${resources.cpu} exceeds recommended limit of 4, reducing to 4`)
      resources.cpu = 4
    }
    
    if (resources.memory > 8) {
      console.warn(`Memory request ${resources.memory}GB exceeds limit of 8GB, reducing to 8GB`)
      resources.memory = 8
    }
    
    if (resources.disk > 10) {
      console.warn(`Disk request ${resources.disk}GB exceeds recommended limit of 10GB, reducing to 10GB`)
      resources.disk = 10
    }

    // Ensure minimum viable resources
    if (resources.cpu < 1) resources.cpu = 1
    if (resources.memory < 1) resources.memory = 1
    if (resources.disk < 3) resources.disk = 3

    return resources
  }

  /**
   * Wait for workspace to be ready with proper polling
   */
  private async waitForWorkspaceReady(workspaceId: string, timeoutSeconds: number = 300): Promise<void> {
    const startTime = Date.now()
    const timeoutMs = timeoutSeconds * 1000
    const pollInterval = 2000 // 2 seconds

    console.log(`Waiting for workspace ${workspaceId} to be ready...`)

    while (Date.now() - startTime < timeoutMs) {
      try {
        const workspace = await this.daytona.get(workspaceId)
        
        // Try a simple command to test if workspace is responsive
        const testResult = await workspace.process.executeCommand('echo "ready"')
        if (testResult.exitCode === 0) {
          console.log(`Workspace ${workspaceId} is ready`)
          return
        }
      } catch (error) {
        // Workspace not ready yet, continue polling
        console.log(`Workspace not ready yet, retrying in ${pollInterval/1000}s...`)
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Workspace ${workspaceId} failed to become ready within ${timeoutSeconds} seconds`)
  }

  /**
   * Execute a command in a workspace with retry logic
   */
  async executeCommand(
    workspaceId: string,
    command: string,
    options?: {
      cwd?: string
      env?: Record<string, string>
      timeout?: number
      retries?: number
    },
  ): Promise<DaytonaCommandResult> {
    const maxRetries = options?.retries || 3
    const baseDelay = 1000 // 1 second base delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Executing command (attempt ${attempt}/${maxRetries}): ${command}`)
        
        const sandbox = await this.daytona.get(workspaceId)

        // Prepare the command with options
        let finalCommand = command

        // Add environment variables if provided
        if (options?.env && Object.keys(options.env).length > 0) {
          const envVars = Object.entries(options.env)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ')
          finalCommand = `${envVars} ${command}`
        }

        // Add working directory if provided
        if (options?.cwd) {
          finalCommand = `cd "${options.cwd}" && ${finalCommand}`
        }

        // Use the built-in sandbox.process.executeCommand() as per official docs
        const response = await sandbox.process.executeCommand(finalCommand)

        const result = {
          success: response.exitCode === 0,
          output: response.result,
          error: response.exitCode !== 0 ? `Command failed with exit code ${response.exitCode}` : undefined,
          exitCode: response.exitCode,
        }

        if (result.success || attempt === maxRetries) {
          return result
        }

        // If command failed and we have retries left, wait before retrying
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
          console.log(`Command failed, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

      } catch (error) {
        console.error(`Command execution attempt ${attempt} failed:`, error)
        
        // If this is the last attempt or a non-retryable error, return failure
        if (attempt === maxRetries || this.isNonRetryableError(error)) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            exitCode: 1,
          }
        }

        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying command in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // This should never be reached, but just in case
    return {
      success: false,
      error: 'Maximum retries exceeded',
      exitCode: 1,
    }
  }

  /**
   * Check if an error is non-retryable
   */
  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      // Don't retry on authentication, permission, or syntax errors
      return message.includes('unauthorized') || 
             message.includes('forbidden') || 
             message.includes('not found') ||
             message.includes('syntax error') ||
             message.includes('permission denied')
    }
    return false
  }

  /**
   * Get sandbox (workspace) information
   */
  async getWorkspace(workspaceId: string): Promise<DaytonaWorkspace | null> {
    try {
      const sandbox = await this.daytona.get(workspaceId)

      return {
        id: sandbox.id,
        name: sandbox.id,
        status: 'running', // Assume running if we can get it
        url: undefined, // URL might be available in sandbox info
        workspace: sandbox,
      }
    } catch (error) {
      console.error('Failed to get sandbox:', error)
      return null
    }
  }

  /**
   * Delete a sandbox (workspace)
   */
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      const sandbox = await this.daytona.get(workspaceId)
      await this.daytona.remove(sandbox)
      return true
    } catch (error) {
      console.error('Failed to delete sandbox:', error)
      return false
    }
  }

  /**
   * Check if workspace is ready
   */
  async isWorkspaceReady(workspaceId: string): Promise<boolean> {
    try {
      const workspace = await this.getWorkspace(workspaceId)
      return workspace?.status === 'running'
    } catch (error) {
      console.error('Error checking workspace status:', error)
      return false
    }
  }

  /**
   * Get sandbox URL for accessing the environment
   */
  async getWorkspaceUrl(workspaceId: string, port: number = 3000): Promise<string | null> {
    try {
      const sandbox = await this.daytona.get(workspaceId)
      // The URL might be available in the sandbox properties, potentially with port
      const baseUrl = (sandbox as { url?: string }).url
      if (baseUrl && port !== 3000) {
        // If a custom port is specified, try to construct the URL with that port
        return baseUrl.replace(/:\d+/, `:${port}`)
      }
      return baseUrl || null
    } catch (error) {
      console.error('Failed to get sandbox URL:', error)
      return null
    }
  }
}

// Export singleton instance
let daytonaClient: DaytonaClient | null = null

export function getDaytonaClient(): DaytonaClient {
  if (!daytonaClient) {
    const apiKey = process.env.DAYTONA_API_KEY
    const serverUrl = process.env.DAYTONA_SERVER_URL

    if (!apiKey) {
      throw new Error('DAYTONA_API_KEY environment variable is required')
    }

    if (!serverUrl) {
      throw new Error('DAYTONA_SERVER_URL environment variable is required')
    }

    daytonaClient = new DaytonaClient(apiKey, serverUrl)
  }
  return daytonaClient
}
