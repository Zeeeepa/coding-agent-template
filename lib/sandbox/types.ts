import { LogEntry } from '@/lib/db/schema'
import { DaytonaWorkspace } from './daytona-client'

// Legacy Sandbox type for backward compatibility
export interface Sandbox {
  sandboxId: string
  runCommand: (options: any) => Promise<any>
  // Add other Sandbox properties as needed
}

export interface SandboxConfig {
  taskId: string
  repoUrl: string
  timeout?: string
  ports?: number[]
  runtime?: string
  resources?: {
    vcpus?: number
  }
  taskPrompt?: string
  selectedAgent?: string
  selectedModel?: string
  installDependencies?: boolean
  preDeterminedBranchName?: string
  existingBranchName?: string
  onProgress?: (progress: number, message: string) => Promise<void>
  onCancellationCheck?: () => Promise<boolean>
}

export interface SandboxResult {
  success: boolean
  sandbox?: Sandbox
  workspace?: DaytonaWorkspace
  domain?: string
  branchName?: string
  error?: string
  cancelled?: boolean
  logs?: LogEntry[]
}

export interface AgentExecutionResult {
  success: boolean
  output?: string
  agentResponse?: string
  cliName?: string
  changesDetected?: boolean
  error?: string
  streamingLogs?: unknown[]
  logs?: LogEntry[]
}
