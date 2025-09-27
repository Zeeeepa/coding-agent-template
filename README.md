# Coding Agent Template

A template for building AI-powered coding agents that supports Claude Code, OpenAI's Codex CLI, Cursor CLI, and opencode with [Daytona](https://daytona.io) workspaces and [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) to automatically execute coding tasks on your repositories.

![Coding Agent Template Screenshot](screenshot.png)

## Deploy Your Own

You can deploy your own version of the coding agent template to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fcoding-agent-template&env=POSTGRES_URL,ANTHROPIC_API_KEY,GITHUB_TOKEN,VERCEL_TEAM_ID,VERCEL_PROJECT_ID,VERCEL_TOKEN,AI_GATEWAY_API_KEY,CURSOR_API_KEY,NPM_TOKEN&envDescription=Environment+variables+for+the+coding+agent+template.+AI_GATEWAY_API_KEY+is+required+for+branch+name+generation+and+Codex+agent.+CURSOR_API_KEY+and+NPM_TOKEN+are+optional.&project-name=coding-agent-template&repository-name=coding-agent-template)

## Features

- **Multi-Agent Support**: Choose from Claude Code, OpenAI Codex CLI, Cursor CLI, or opencode to execute coding tasks
- **Dual Environment Support**: Runs code in [Daytona](https://daytona.io) workspaces or [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) - automatically detects based on configuration
- **AI Gateway Integration**: Built for seamless integration with [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) for model routing and observability
- **AI-Generated Branch Names**: Automatically generates descriptive Git branch names using AI SDK 5 + AI Gateway
- **Task Management**: Track task progress with real-time updates
- **Persistent Storage**: Tasks stored in PostgreSQL database
- **Git Integration**: Automatically creates branches and commits changes
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/vercel-labs/coding-agent-template.git
cd coding-agent-template
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

- `POSTGRES_URL`: Your PostgreSQL connection string (works with any PostgreSQL database)
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude (or use `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` for Z.ai)
- `GITHUB_TOKEN`: GitHub personal access token (for repository access)
- `AI_GATEWAY_API_KEY`: Your AI Gateway API key for AI-generated branch names and Codex agent support

Environment-specific variables (choose one):

**For Daytona (recommended):**
- `DAYTONA_API_KEY`: Your Daytona API key for workspace creation

**For Vercel Sandbox:**
- `VERCEL_TEAM_ID`: Your Vercel team ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID  
- `VERCEL_TOKEN`: Your Vercel API token

Optional environment variables:

- `CURSOR_API_KEY`: For Cursor agent support
- `NPM_TOKEN`: For private npm packages
- `ANTHROPIC_BASE_URL`: Custom Anthropic API base URL (e.g., for Z.ai: `https://api.z.ai/api/anthropic`)
- `ANTHROPIC_AUTH_TOKEN`: Custom auth token when using alternative Anthropic-compatible APIs

### 4. Set up the database

Generate and run database migrations:

```bash
pnpm db:generate
pnpm db:push
```

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Create a Task**: Enter a repository URL and describe what you want the AI to do
2. **Monitor Progress**: Watch real-time logs as the agent works
3. **Review Results**: See the changes made and the branch created
4. **Manage Tasks**: View all your tasks in the sidebar with status updates

## How It Works

1. **Task Creation**: When you submit a task, it's stored in the database
2. **AI Branch Name Generation**: AI SDK 5 + AI Gateway automatically generates a descriptive branch name based on your task (non-blocking using Next.js 15's `after()`)
3. **Environment Setup**: 
   - **Daytona**: Creates a cloud development workspace with your repository (if `DAYTONA_API_KEY` is configured)
   - **Vercel Sandbox**: Creates a secure sandbox environment (fallback if Daytona is not configured)
4. **Agent Execution**: Your chosen coding agent (Claude Code, Codex CLI, Cursor CLI, or opencode) analyzes your prompt and makes changes
5. **Git Operations**: Changes are committed and pushed to the AI-generated branch
6. **Cleanup**: The workspace/sandbox is shut down to free resources

## Environment Variables

### Required

- `POSTGRES_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Claude API key (or use `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` for Z.ai)
- `GITHUB_TOKEN`: GitHub token for repository access
- `AI_GATEWAY_API_KEY`: AI Gateway API key for branch name generation and Codex agent support

### Environment-Specific (choose one)

**For Daytona (recommended):**
- `DAYTONA_API_KEY`: Daytona API key for workspace creation

**For Vercel Sandbox:**
- `VERCEL_TEAM_ID`: Vercel team ID for sandbox creation
- `VERCEL_PROJECT_ID`: Vercel project ID for sandbox creation
- `VERCEL_TOKEN`: Vercel API token for sandbox creation

### Optional

- `CURSOR_API_KEY`: Cursor agent API key
- `NPM_TOKEN`: NPM token for private packages
- `ANTHROPIC_BASE_URL`: Custom Anthropic API base URL (e.g., `https://api.z.ai/api/anthropic`)
- `ANTHROPIC_AUTH_TOKEN`: Custom auth token for alternative Anthropic-compatible APIs

## AI Branch Name Generation

The system automatically generates descriptive Git branch names using AI SDK 5 and Vercel AI Gateway. This feature:

- **Non-blocking**: Uses Next.js 15's `after()` function to generate names without delaying task creation
- **Descriptive**: Creates meaningful branch names like `feature/user-authentication-A1b2C3` or `fix/memory-leak-parser-X9y8Z7`
- **Conflict-free**: Adds a 6-character alphanumeric hash to prevent naming conflicts
- **Fallback**: Gracefully falls back to timestamp-based names if AI generation fails
- **Context-aware**: Uses task description, repository name, and agent context for better names

### Branch Name Examples

- `feature/add-user-auth-K3mP9n` (for "Add user authentication with JWT")
- `fix/resolve-memory-leak-B7xQ2w` (for "Fix memory leak in image processing")
- `chore/update-deps-M4nR8s` (for "Update all project dependencies")
- `docs/api-endpoints-F9tL5v` (for "Document REST API endpoints")

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **AI SDK**: AI SDK 5 with Vercel AI Gateway integration
- **AI Agents**: Claude Code, OpenAI Codex CLI, Cursor CLI, opencode
- **Development Environments**: 
  - [Daytona](https://daytona.io) workspaces (recommended)
  - [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) (fallback)
- **Git**: Automated branching and commits with AI-generated branch names

## Development

### Database Operations

```bash
# Generate migrations
pnpm db:generate

# Push schema changes
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

### Running the App

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Migrating to Daytona

This template now supports both Daytona workspaces and Vercel Sandbox environments. To migrate from Vercel Sandbox to Daytona:

### 1. Get Daytona API Key

1. Sign up for [Daytona](https://daytona.io)
2. Generate an API key from your Daytona dashboard
3. Add `DAYTONA_API_KEY` to your environment variables

### 2. Update Environment Variables

The system automatically detects which environment to use:

- **Daytona**: Used when `DAYTONA_API_KEY` is present and not empty
- **Vercel Sandbox**: Used as fallback when Daytona is not configured

### 3. Benefits of Daytona

- **Better Performance**: Cloud development workspaces with dedicated resources
- **Persistent Environments**: Workspaces can be reused across tasks
- **Enhanced Security**: Isolated cloud environments with better access controls
- **Cost Efficiency**: Pay-per-use model with automatic resource management

### 4. Backward Compatibility

The template maintains full backward compatibility with Vercel Sandbox. Existing deployments will continue to work without any changes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Considerations

- **Environment Variables**: Never commit `.env` files to version control. All sensitive data should be stored in environment variables.
- **API Keys**: Rotate your API keys regularly and use the principle of least privilege.
- **Database Access**: Ensure your PostgreSQL database is properly secured with strong credentials.
- **Development Environments**: Both Daytona workspaces and Vercel sandboxes are isolated, but ensure you're not exposing sensitive data in logs or outputs.
- **GitHub Token**: Use a personal access token with minimal required permissions for repository access.
- **Daytona Security**: Daytona workspaces provide enhanced security with isolated cloud environments and access controls.
