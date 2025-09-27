import { getDaytonaClient } from './daytona-client'

export interface CommandResult {
  success: boolean
  exitCode?: number
  output?: string
  error?: string
  streamingLogs?: unknown[]
  command?: string
}

export interface StreamingCommandOptions {
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  onJsonLine?: (jsonData: unknown) => void
}

export async function runCommandInWorkspace(
  workspaceId: string,
  command: string,
  args: string[] = [],
  options?: {
    cwd?: string
    env?: Record<string, string>
    timeout?: number
  },
): Promise<CommandResult> {
  try {
    const daytonaClient = getDaytonaClient()
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    const result = await daytonaClient.executeCommand(workspaceId, fullCommand, options)

    return {
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      error: result.error,
      command: fullCommand,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Command execution failed'
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
    return {
      success: false,
      error: errorMessage,
      command: fullCommand,
    }
  }
}

export async function runStreamingCommandInWorkspace(
  workspaceId: string,
  command: string,
  args: string[] = [],
  options: StreamingCommandOptions = {},
  commandOptions?: {
    cwd?: string
    env?: Record<string, string>
    timeout?: number
  },
): Promise<CommandResult> {
  try {
    const daytonaClient = getDaytonaClient()
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    const result = await daytonaClient.executeCommand(workspaceId, fullCommand, commandOptions)

    // Process output for streaming callbacks
    if (result.output && options.onStdout) {
      options.onStdout(result.output)
    }

    if (result.error && options.onStderr) {
      options.onStderr(result.error)
    }

    // Process JSON lines if callback provided
    if (result.output && options.onJsonLine) {
      const lines = result.output.split('\n')
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine) {
          try {
            const jsonData = JSON.parse(trimmedLine)
            options.onJsonLine(jsonData)
          } catch {
            // Not valid JSON, ignore
          }
        }
      }
    }
    return {
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      error: result.error,
      command: fullCommand,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to run streaming command in workspace'
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
    return {
      success: false,
      error: errorMessage,
      command: fullCommand,
    }
  }
}

// Legacy function name for backward compatibility
export const runCommandInSandbox = runCommandInWorkspace
export const runStreamingCommandInSandbox = runStreamingCommandInWorkspace
