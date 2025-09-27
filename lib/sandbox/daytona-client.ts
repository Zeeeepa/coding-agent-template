import { Daytona } from '@daytonaio/sdk'

export interface DaytonaWorkspace {
  id: string
  name: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  url?: string
  gitUrl?: string
  branch?: string
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
  language?: 'typescript' | 'python' | 'node'
  envVars?: Record<string, string>
  timeout?: number
}

export class DaytonaClient {
  private daytona: Daytona
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.daytona = new Daytona({
      apiKey: apiKey,
      // Use default API URL and target
    })
  }

  /**
   * Create a new Daytona workspace
   */
  async createWorkspace(options: DaytonaCreateOptions): Promise<DaytonaWorkspace> {
    try {
      const sandbox = await this.daytona.create({
        language: options.language || 'typescript',
        envVars: options.envVars || {},
        // Add git configuration if provided
        ...(options.gitUrl && {
          git: {
            url: options.gitUrl,
            branch: options.branch || 'main'
          }
        })
      })

      return {
        id: sandbox.id,
        name: options.name,
        status: 'running',
        url: sandbox.url,
        gitUrl: options.gitUrl,
        branch: options.branch
      }
    } catch (error) {
      console.error('Failed to create Daytona workspace:', error)
      throw new Error(`Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    }
  ): Promise<DaytonaCommandResult> {
    try {
      const sandbox = await this.daytona.getSandbox(workspaceId)
      
      const response = await sandbox.process.executeCommand(
        command,
        options?.cwd || '~',
        options?.env,
        options?.timeout
      )

      return {
        success: response.exitCode === 0,
        output: response.stdout,
        error: response.stderr,
        exitCode: response.exitCode
      }
    } catch (error) {
      console.error('Failed to execute command:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1
      }
    }
  }

  /**
   * Get workspace information
   */
  async getWorkspace(workspaceId: string): Promise<DaytonaWorkspace | null> {
    try {
      const sandbox = await this.daytona.getSandbox(workspaceId)
      
      return {
        id: sandbox.id,
        name: sandbox.name || workspaceId,
        status: 'running', // Assume running if we can get it
        url: sandbox.url
      }
    } catch (error) {
      console.error('Failed to get workspace:', error)
      return null
    }
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      await this.daytona.delete(workspaceId)
      return true
    } catch (error) {
      console.error('Failed to delete workspace:', error)
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
   * Get workspace URL for accessing the environment
   */
  async getWorkspaceUrl(workspaceId: string, port: number = 3000): Promise<string | null> {
    try {
      const sandbox = await this.daytona.getSandbox(workspaceId)
      return sandbox.url || null
    } catch (error) {
      console.error('Failed to get workspace URL:', error)
      return null
    }
  }
}

// Export singleton instance
let daytonaClient: DaytonaClient | null = null

export function getDaytonaClient(): DaytonaClient {
  if (!daytonaClient) {
    const apiKey = process.env.DAYTONA_API_KEY
    if (!apiKey) {
      throw new Error('DAYTONA_API_KEY environment variable is required')
    }
    daytonaClient = new DaytonaClient(apiKey)
  }
  return daytonaClient
}
