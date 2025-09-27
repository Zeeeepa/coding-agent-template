import { Sandbox } from '../types'
import { AgentExecutionResult } from '../types'
import { executeClaudeInSandbox } from './claude'
import { executeCodexInSandbox } from './codex'
import { executeCursorInSandbox } from './cursor'
import { executeOpenCodeInSandbox } from './opencode'
import { TaskLogger } from '@/lib/utils/task-logger'
import { DaytonaWorkspace } from '../daytona-client'

export type AgentType = 'claude' | 'codex' | 'cursor' | 'opencode'

// Re-export types
export type { AgentExecutionResult } from '../types'

// Main agent execution function
export async function executeAgentInSandbox(
  sandbox: Sandbox | DaytonaWorkspace,
  instruction: string,
  agentType: AgentType,
  logger: TaskLogger,
  selectedModel?: string,
  onCancellationCheck?: () => Promise<boolean>,
): Promise<AgentExecutionResult> {
  // Check for cancellation before starting agent execution
  if (onCancellationCheck && (await onCancellationCheck())) {
    await logger.info('Task was cancelled before agent execution')
    return {
      success: false,
      error: 'Task was cancelled',
      cliName: agentType,
      changesDetected: false,
    }
  }
  switch (agentType) {
    case 'claude':
      return executeClaudeInSandbox(sandbox, instruction, logger, selectedModel)

    case 'codex':
      return executeCodexInSandbox(sandbox, instruction, logger, selectedModel)

    case 'cursor':
      return executeCursorInSandbox(sandbox, instruction, logger, selectedModel)

    case 'opencode':
      return executeOpenCodeInSandbox(sandbox, instruction, logger, selectedModel)

    default:
      return {
        success: false,
        error: `Unknown agent type: ${agentType}`,
        cliName: agentType,
        changesDetected: false,
      }
  }
}
