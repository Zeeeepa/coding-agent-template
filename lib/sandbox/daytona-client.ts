import { TaskLogger } from '@/lib/utils/task-logger'

export interface DaytonaWorkspace {
  id: string
  name: string
  status: 'CREATING' | 'RUNNING' | 'STOPPED' | 'ERROR'
  url?: string
  gitUrl?: string
  branch?: string
}

export interface DaytonaCommandResult {
  exitCode: number
  output: string
  error: string
}

export interface DaytonaCreateWorkspaceOptions {
  name: string
  gitUrl: string
  branch?: string
  target?: string
}

export class DaytonaClient {
  private apiKey: string
  private serverUrl: string
  private target: string

  constructor(apiKey: string, serverUrl: string = 'https://app.daytona.io/api', target: string = 'us') {
    this.apiKey = apiKey
    this.serverUrl = serverUrl
    this.target = target
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.serverUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Daytona API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  async createWorkspace(options: DaytonaCreateWorkspaceOptions): Promise<DaytonaWorkspace> {
    const payload = {
      name: options.name,
      repository: {
        url: options.gitUrl,
        branch: options.branch || 'main',
      },
      target: options.target || this.target,
    }

    const result = await this.makeRequest('/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return {
      id: result.id,
      name: result.name,
      status: result.status,
      url: result.url,
      gitUrl: options.gitUrl,
      branch: options.branch,
    }
  }

  async getWorkspace(workspaceId: string): Promise<DaytonaWorkspace> {
    const result = await this.makeRequest(`/workspaces/${workspaceId}`)
    
    return {
      id: result.id,
      name: result.name,
      status: result.status,
      url: result.url,
      gitUrl: result.repository?.url,
      branch: result.repository?.branch,
    }
  }

  async executeCommand(
    workspaceId: string,
    command: string,
    args: string[] = [],
    options: { env?: Record<string, string>; cwd?: string } = {}
  ): Promise<DaytonaCommandResult> {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
    
    const payload = {
      command: fullCommand,
      workingDirectory: options.cwd || '/',
      environment: options.env || {},
    }

    const result = await this.makeRequest(`/workspaces/${workspaceId}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return {
      exitCode: result.exitCode || 0,
      output: result.stdout || '',
      error: result.stderr || '',
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.makeRequest(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
    })
  }

  async waitForWorkspaceReady(workspaceId: string, timeoutMs: number = 300000): Promise<DaytonaWorkspace> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const workspace = await this.getWorkspace(workspaceId)
      
      if (workspace.status === 'RUNNING') {
        return workspace
      }
      
      if (workspace.status === 'ERROR') {
        throw new Error(`Workspace ${workspaceId} failed to start`)
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    throw new Error(`Workspace ${workspaceId} did not become ready within ${timeoutMs}ms`)
  }
}

// Singleton instance
let daytonaClient: DaytonaClient | null = null

export function getDaytonaClient(): DaytonaClient {
  if (!daytonaClient) {
    const apiKey = process.env.DAYTONA_API_KEY
    const serverUrl = process.env.DAYTONA_SERVER_URL || 'https://app.daytona.io/api'
    const target = process.env.DAYTONA_TARGET || 'us'

    if (!apiKey) {
      throw new Error('DAYTONA_API_KEY environment variable is required')
    }

    daytonaClient = new DaytonaClient(apiKey, serverUrl, target)
  }

  return daytonaClient
}

// Helper function to create a workspace with logging
export async function createDaytonaWorkspace(
  name: string,
  gitUrl: string,
  branch: string = 'main',
  logger?: TaskLogger
): Promise<DaytonaWorkspace> {
  const client = getDaytonaClient()
  
  if (logger) {
    await logger.info(`Creating Daytona workspace: ${name}`)
  }

  const workspace = await client.createWorkspace({
    name,
    gitUrl,
    branch,
  })

  if (logger) {
    await logger.info(`Workspace created with ID: ${workspace.id}`)
    await logger.info('Waiting for workspace to be ready...')
  }

  const readyWorkspace = await client.waitForWorkspaceReady(workspace.id)

  if (logger) {
    await logger.info(`Workspace is ready: ${readyWorkspace.url || readyWorkspace.id}`)
  }

  return readyWorkspace
}

// Helper function to run a command in a workspace with logging
export async function runCommandInDaytonaWorkspace(
  workspace: DaytonaWorkspace,
  command: string,
  args: string[] = [],
  options: { env?: Record<string, string>; cwd?: string } = {},
  logger?: TaskLogger
): Promise<DaytonaCommandResult> {
  const client = getDaytonaClient()
  const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

  if (logger) {
    await logger.command(fullCommand)
  }

  const result = await client.executeCommand(workspace.id, command, args, options)

  if (logger) {
    if (result.output) {
      await logger.info(result.output)
    }
    if (result.error) {
      await logger.error(result.error)
    }
  }

  return result
}
