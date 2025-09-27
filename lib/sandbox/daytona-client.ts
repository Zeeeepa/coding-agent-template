import { Daytona, Workspace, Process } from '@daytonaio/sdk'

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

  constructor(apiKey: string, serverUrl?: string) {
    this.daytona = new Daytona({
      apiKey: apiKey,
      serverUrl: serverUrl || process.env.DAYTONA_SERVER_URL || 'https://api.daytona.io',
    })
  }

  /**
   * Create a new Daytona workspace
   */
  async createWorkspace(options: DaytonaCreateOptions): Promise<DaytonaWorkspace> {
    try {
      const workspace = await this.daytona.create({
        id: options.name,
        language: options.language || 'javascript',
        envVars: options.envVars || {},
        // Add git repository configuration
        repository: options.gitUrl ? {
          url: options.gitUrl,
          branch: options.branch || 'main'
        } : undefined,
        timeout: options.timeout,
      })

      return {
        id: workspace.id,
        name: options.name,
        status: 'running',
        url: undefined, // Will be available after workspace starts
        gitUrl: options.gitUrl,
        branch: options.branch,
        workspace: workspace
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
      const workspace = await this.daytona.get(workspaceId)
      
      // Use the Process class to execute commands
      const process = new Process(workspace)
      const response = await process.executeCommand(command, {
        cwd: options?.cwd,
        env: options?.env,
      })

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
      const workspace = await this.daytona.get(workspaceId)
      const info = await workspace.info()
      
      return {
        id: workspace.id,
        name: workspace.id,
        status: 'running', // Assume running if we can get it
        url: undefined, // URL might be available in info
        workspace: workspace
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
      const workspace = await this.daytona.get(workspaceId)
      await this.daytona.remove(workspace)
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
      const workspace = await this.daytona.get(workspaceId)
      const info = await workspace.info()
      // The URL might be available in the workspace info
      return info?.url || null
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
