import { Sandbox } from './types'
import { DaytonaWorkspace, runCommandInDaytonaWorkspace } from './daytona-client'

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

export async function runCommandInSandbox(
  sandbox: Sandbox,
  command: string,
  args: string[] = [],
): Promise<CommandResult> {
  try {
    const result = await sandbox.runCommand(command, args)

    // Handle stdout and stderr properly
    let stdout = ''
    let stderr = ''

    try {
      stdout = await (result.stdout as () => Promise<string>)()
    } catch {
      // Failed to read stdout
    }

    try {
      stderr = await (result.stderr as () => Promise<string>)()
    } catch {
      // Failed to read stderr
    }

    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      output: stdout,
      error: stderr,
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

export async function runStreamingCommandInSandbox(
  sandbox: Sandbox,
  command: string,
  args: string[] = [],
  options: StreamingCommandOptions = {},
): Promise<CommandResult> {
  try {
    const result = await sandbox.runCommand(command, args)

    let stdout = ''
    let stderr = ''

    try {
      // stdout is always a function that returns a promise
      if (typeof result.stdout === 'function') {
        stdout = await result.stdout()
        // Process the complete output for JSON lines
        if (options.onJsonLine) {
          const lines = stdout.split('\n')
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
        if (options.onStdout) {
          options.onStdout(stdout)
        }
      }
    } catch {
      // Failed to read stdout
    }

    try {
      // stderr is always a function that returns a promise
      if (typeof result.stderr === 'function') {
        stderr = await result.stderr()
        if (options.onStderr) {
          options.onStderr(stderr)
        }
      }
    } catch {
      // Failed to read stderr
    }

    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      output: stdout,
      error: stderr,
      command: fullCommand,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to run streaming command in sandbox'
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command
    return {
      success: false,
      error: errorMessage,
      command: fullCommand,
    }
  }
}

// New functions for Daytona workspaces
export async function runCommandInWorkspace(
  workspace: DaytonaWorkspace,
  command: string,
  args: string[] = [],
  options: { env?: Record<string, string>; cwd?: string } = {}
): Promise<CommandResult> {
  try {
    const result = await runCommandInDaytonaWorkspace(workspace, command, args, options)
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command

    return {
      success: result.exitCode === 0,
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

// Unified command execution function that works with both Sandbox and DaytonaWorkspace
export async function runCommand(
  environment: Sandbox | DaytonaWorkspace,
  command: string,
  args: string[] = [],
  options: { env?: Record<string, string>; cwd?: string } = {}
): Promise<CommandResult> {
  // Type guard to check if it's a DaytonaWorkspace
  if ('id' in environment && 'status' in environment) {
    return runCommandInWorkspace(environment as DaytonaWorkspace, command, args, options)
  } else {
    // It's a legacy Sandbox
    return runCommandInSandbox(environment as Sandbox, command, args)
  }
}
