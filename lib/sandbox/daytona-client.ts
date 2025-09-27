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
    try {
      // Create sandbox using official SDK parameters with async=true for immediate return
      const sandbox = await this.daytona.create({
        language: options.language || 'typescript',
        envVars: options.envVars || {},
        async: true, // Return immediately without waiting for full startup
      })

      // If git repository is provided, clone it after sandbox creation
      if (options.gitUrl) {
        await sandbox.process.executeCommand(`git clone ${options.gitUrl} /workspace`)
        if (options.branch && options.branch !== 'main') {
          await sandbox.process.executeCommand(`cd /workspace && git checkout ${options.branch}`)
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
      throw new Error(`Failed to create sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute a command in a workspace
   */
  async executeCommand(
    workspaceId: string,
    command: string,
    options?: {
      cwd?: string
      env?: Record<string, string>
      timeout?: number
    },
  ): Promise<DaytonaCommandResult> {
    try {
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

      return {
        success: response.exitCode === 0,
        output: response.result,
        error: response.exitCode !== 0 ? 'Command failed' : undefined,
        exitCode: response.exitCode,
      }
    } catch (error) {
      console.error('Failed to execute command:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
      }
    }
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
      return false
    }
  }

  /**
   * Get sandbox URL for accessing the environment
   */
  async getWorkspaceUrl(workspaceId: string, port: number = 3000): Promise<string | null> {
    try {
      const sandbox = await this.daytona.get(workspaceId)
      // The URL might be available in the sandbox properties
      return (sandbox as { url?: string }).url || null
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
