export function validateEnvironmentVariables(selectedAgent: string = 'claude') {
  const errors: string[] = []

  // Check for Daytona API key and server URL (required for all agents)
  if (!process.env.DAYTONA_API_KEY) {
    errors.push('DAYTONA_API_KEY is required for sandbox creation')
  }

  if (!process.env.DAYTONA_SERVER_URL) {
    errors.push('DAYTONA_SERVER_URL is required for sandbox creation')
  }

  // Check for required environment variables based on selected agent
  if (selectedAgent === 'claude' && !process.env.ANTHROPIC_API_KEY) {
    errors.push('ANTHROPIC_API_KEY is required for Claude CLI')
  }

  if (selectedAgent === 'cursor' && !process.env.CURSOR_API_KEY) {
    errors.push('CURSOR_API_KEY is required for Cursor CLI')
  }

  if (selectedAgent === 'codex' && !process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is required for Codex CLI')
  }

  // Check for GitHub token for private repositories
  if (!process.env.GITHUB_TOKEN) {
    errors.push('GITHUB_TOKEN is required for repository access')
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join(', ') : undefined,
  }
}

export function createAuthenticatedRepoUrl(repoUrl: string): string {
  if (!process.env.GITHUB_TOKEN) {
    return repoUrl
  }

  try {
    const url = new URL(repoUrl)
    if (url.hostname === 'github.com') {
      // Add GitHub token for authentication
      url.username = process.env.GITHUB_TOKEN
      url.password = 'x-oauth-basic'
    }
    return url.toString()
  } catch {
    // Failed to parse repository URL
    return repoUrl
  }
}

export interface DaytonaConfigOptions {
  repoUrl: string
  branchName: string
  timeout?: string
  ports?: number[]
  runtime?: string
  resources?: { vcpus?: number }
}

export function createDaytonaConfiguration(options: DaytonaConfigOptions) {
  const { repoUrl, branchName, timeout, ports = [3000], runtime = 'node22', resources = { vcpus: 4 } } = options

  // Detect language from runtime or repository
  let language = 'javascript'
  if (runtime?.includes('python')) {
    language = 'python'
  } else if (runtime?.includes('go')) {
    language = 'go'
  } else if (runtime?.includes('rust')) {
    language = 'rust'
  }

  // Parse timeout to seconds
  const timeoutSeconds = timeout ? parseInt(timeout.replace(/\D/g, '')) * 60 : 5 * 60 // 5 minutes default

  return {
    gitUrl: repoUrl,
    branch: branchName,
    language,
    ports,
    timeout: timeoutSeconds,
    resources: {
      cpu: Math.min(resources.vcpus || 1, 4),  // Cap at 4 CPUs
      memory: 2,   // 2GB memory (conservative default)
      disk: 5      // 5GB disk (well within 30GB quota)
    },
    envVars: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || '',
    },
  }
}
