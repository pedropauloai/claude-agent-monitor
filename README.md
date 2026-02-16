```
   ██████╗ █████╗ ███╗   ███╗
  ██╔════╝██╔══██╗████╗ ████║
  ██║     ███████║██╔████╔██║
  ██║     ██╔══██║██║╚██╔╝██║
  ╚██████╗██║  ██║██║ ╚═╝ ██║
   ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝
```

# Claude Agent Monitor

**Mission Control for Claude Code agents: real-time observability + visual PRD/Sprint tracking.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange)](https://pnpm.io/)

---

## Why CAM?

When you run Claude Code with background agents and teams, the experience is a black box. You have no idea if an agent is stuck, which files it changed, or how far along your project is. The only option is manually reading output files and running `tail` on logs.

**CAM changes that.** It hooks into Claude Code's native hook system to capture every tool call, file change, error, and lifecycle event -- then streams it all to a beautiful real-time dashboard. Pair it with a PRD and watch your Kanban board update itself as agents complete tasks.

Two pillars, one dashboard:

| Pillar | What it answers | Data source |
|--------|----------------|-------------|
| **Agent Monitor** | "What is each agent doing RIGHT NOW?" | Real-time hooks |
| **PRD Tracker** | "Where are we in the project? What's left?" | TaskCreate/TaskUpdate via hooks |

---

## Quick Start

### Agent Monitoring Only

```bash
# Install globally
npm install -g claude-agent-monitor

# Initialize hooks in your project
cd your-project
cam init

# Start the monitoring server + dashboard
cam start

# In another terminal, use Claude Code as normal
claude "implement auth module using a team of 3 agents"

# Open http://localhost:7891 and watch everything in real-time
```

### Full Mission Control (with PRD)

```bash
# Initialize with your PRD for full project tracking
cam init --prd ./PRD.md

# Review the extracted tasks and sprints, then confirm
cam start

# Tell Claude Code to work through the PRD
claude "read PRD.md and implement all tasks using a team of agents"

# Watch tasks move themselves across the Kanban board
```

---

## Screenshots

> Screenshots coming soon. Here is what each view shows:

- **Modern Theme** -- Clean, dark dashboard with agent cards, real-time activity feed, file watcher, session timeline, and stats bar. Inspired by Linear and Vercel.
- **Terminal Theme** -- Green-on-black interface with tmux-style panes, ASCII sparklines, vim keybindings, and CRT scan line effects.
- **Pixel Art Theme** -- Retro RPG aesthetic with pixel borders, NES color palette, game-style HUD, and 8-bit typography.
- **Kanban Board** -- Auto-updating task board with columns for Backlog, Planned, In Progress, In Review, Completed, and Blocked.
- **Burndown Chart** -- Real vs ideal progress lines with scope change indicators and sprint velocity tracking.
- **Dependency Graph** -- Interactive node graph showing task dependencies, critical path highlighting, and blocked task indicators.

---

## Features

### Pillar 1 -- Agent Monitor

- **Real-time activity feed** -- Every tool call, file edit, bash command, and message streamed live via SSE
- **Agent panel** -- See all agents with live status indicators (active, idle, error, completed, shutdown)
- **File watcher** -- Track every file created, modified, or read, with per-agent attribution and touch counts
- **Session timeline** -- Gantt-style visualization of agent activity over time
- **Stats bar** -- Live counters for duration, tool calls, errors, files modified, and events per minute
- **Agent detail view** -- Deep dive into any agent's tool history, files touched, errors, and current task
- **Error tracking** -- Instant visibility into tool errors, rejected tool calls, and agent failures
- **Context compaction tracking** -- Monitor when agents compact their context and how much is retained

### Pillar 2 -- PRD Tracker

- **PRD import and parsing** -- Feed in a markdown PRD and get structured tasks, sprints, and dependencies extracted automatically
- **Auto-updating Kanban** -- Tasks move between columns on their own as agents call TaskCreate and TaskUpdate
- **Sprint progress** -- Live progress bars, completion percentages, and velocity metrics for the active sprint
- **Burndown chart** -- Classic burndown with ideal vs actual lines, scope changes, and time-based projections
- **Dependency graph** -- Interactive visualization of task dependencies with critical path and blocker detection
- **PRD overview** -- Color-coded view of your entire PRD with per-section completion percentages
- **Project selector** -- Switch between projects and view modes (Monitor, Tracker, or combined Mission Control)
- **Correlation engine** -- Automatically matches agent events to PRD tasks using fuzzy matching

---

## Themes

CAM ships with three complete visual themes. Switch anytime with `cam theme <name>` or the in-dashboard theme switcher.

### Modern (Default)

Clean, professional dashboard inspired by Linear, Vercel, and Raycast. Dark background with glassmorphism cards, smooth Framer Motion transitions, and a minimal color palette. Best for everyday use.

### Terminal

100% text interface styled after htop, lazygit, and tmux. Pure black background with phosphorescent green text, box-drawing characters, ASCII sparklines, and optional CRT effects. Keyboard-driven with vim-style navigation (j/k/h/l). For developers who live in the terminal.

### Pixel Art

Retro RPG aesthetic with NES-era 16-color palette, pixel borders, Press Start 2P font, and game-style HUD elements. Progress bars fill pixel by pixel. Activity logs read like RPG battle text. For developers who appreciate nostalgia.

---

## Architecture

```
Claude Code (hooks) --> CAM Server (Express + SQLite) --> Dashboard (React + Vite)
                              |
                         SSE (real-time events)
                         REST API (polling every 15s)
```

**How it works:**

1. Claude Code executes an action (e.g., Edit a file)
2. A configured hook fires a shell command
3. The `cam-hook` binary sends a POST to the local CAM server
4. The server processes, stores in SQLite, and emits an SSE event
5. The dashboard receives the SSE event and updates the UI in real-time
6. For PRD tracking, the correlation engine maps tool calls to PRD tasks automatically

### Monorepo Structure

| Package | Description | Key Tech |
|---------|-------------|----------|
| `@cam/shared` | Types, Zod schemas, constants | TypeScript, Zod |
| `@cam/hook` | Ultra-light CLI binary for hooks (zero external deps) | Native Node.js `http` |
| `@cam/server` | REST API + SSE + SQLite persistence | Express, better-sqlite3 |
| `@cam/cli` | CLI commands (`cam init`, `cam start`, etc.) | Commander.js, Chalk |
| `@cam/dashboard` | React SPA with 3 themes | React 19, Vite, Tailwind CSS, Zustand |

### Server API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Ingest hook events |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/:id` | Session details |
| `GET` | `/api/sessions/:id/agents` | Agents in a session |
| `GET` | `/api/sessions/:id/events` | Events with filters |
| `GET` | `/api/sessions/:id/files` | File changes |
| `GET` | `/api/sessions/:id/stats` | Aggregated metrics |
| `GET` | `/api/stream` | SSE real-time stream |
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project from PRD |
| `GET` | `/api/projects/:id/sprints` | List sprints |
| `GET` | `/api/projects/:id/tasks` | List tasks with filters |
| `POST` | `/api/parse-prd` | Parse PRD without creating project |

---

## CLI Commands

### Server and Dashboard

```bash
cam start                    # Start server + dashboard (opens browser)
cam start --port 8080        # Custom server port
cam start --theme terminal   # Start with a specific theme
cam start --no-open          # Don't auto-open browser
cam status                   # Show server status and stats
cam sessions                 # List previous sessions
cam sessions --clear         # Clear session history
```

### Initialization and Hooks

```bash
cam init                     # Configure hooks in current project
cam init --prd ./PRD.md      # Configure hooks + import PRD
cam init --prd ./PRD.md --parse ai  # Parse PRD with AI assistance
cam init --force             # Overwrite existing hooks
cam hooks --list             # Show configured hooks
cam hooks --remove           # Remove CAM hooks (preserves others)
cam hooks --test             # Send a test event
```

### Projects and Sprints

```bash
cam project list             # List all projects
cam project show             # Show active project with stats
cam project import PRD.md    # Import PRD into existing project
cam project archive          # Archive current project
cam sprint list              # List sprints in active project
cam sprint create "Sprint 2" # Create a new sprint
cam sprint status            # Show sprint progress in terminal
cam sprint activate <id>     # Set the active sprint
```

### Tasks and Progress

```bash
cam tasks                    # List tasks in active sprint
cam tasks --all              # List all tasks in project
cam tasks --blocked          # Show blocked tasks only
cam tasks --agent researcher # Tasks assigned to a specific agent
cam progress                 # Mini burndown in terminal
cam progress --full          # Detailed progress report
```

### Theme

```bash
cam theme modern             # Switch to Modern theme
cam theme terminal           # Switch to Terminal theme
cam theme pixel              # Switch to Pixel Art theme
```

---

## Hook Events Captured

CAM captures the following Claude Code hook events:

| Hook | When it fires | What CAM does with it |
|------|--------------|----------------------|
| `PreToolUse` | Before every tool call | Records agent intent, tracks tool usage |
| `PostToolUse` | After tool call completes | Records result, duration, detects errors |
| `Notification` | Claude Code sends a notification | Displays alerts in dashboard |
| `Stop` | Main agent stops | Marks session end, triggers cleanup |
| `SubagentStop` | A teammate agent stops | Tracks agent lifecycle |
| `PreCompact` | Before context compaction | Monitors context usage |
| `PostCompact` | After context compaction | Tracks compaction efficiency |

The `cam-hook` binary is designed to be ultra-fast (< 10ms) and fail silently. It never blocks Claude Code, even if the CAM server is not running.

---

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
git clone https://github.com/user/claude-agent-monitor.git
cd claude-agent-monitor
pnpm install
pnpm build        # Build all packages (shared must build first)
pnpm dev           # Start dev mode (server :7890, dashboard :7891)
```

### Available Scripts

```bash
pnpm dev           # Start all packages in dev mode with hot reload
pnpm build         # Build all packages
pnpm typecheck     # Type-check all packages
pnpm lint          # Lint all packages
pnpm clean         # Remove all dist/ directories
```

### Building Individual Packages

```bash
pnpm --filter @cam/shared build      # Must build first (other packages depend on it)
pnpm --filter @cam/server build
pnpm --filter @cam/hook build
pnpm --filter @cam/cli build
pnpm --filter @cam/dashboard build
```

### Project Conventions

- ESM only (`import`/`export`), never CommonJS
- All imports use `.js` extension
- Named exports only (no default exports, except React page components)
- TypeScript strict mode, no `any`, use `unknown` + type guards
- Shared types live in `@cam/shared` -- never duplicate types across packages
- `@cam/hook` must remain zero-dependency (only native Node.js modules)
- SSE for real-time updates, never WebSockets
- SQLite in WAL mode for concurrent reads
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Hook binary | Native Node.js `http` | Zero dependencies, < 500KB, < 10ms latency |
| Server | Express + better-sqlite3 | Lightweight, zero-config database, local file |
| Real-time | Server-Sent Events (SSE) | Unidirectional, auto-reconnect, no extra libraries |
| Dashboard | React 19 + Vite | Fast builds, HMR, modern React features |
| Styling | Tailwind CSS | Consistent design, easy theming across 3 themes |
| State | Zustand | Minimal boilerplate, one store per domain |
| Charts | Recharts | React-native charting, simple API |
| Animation | Framer Motion | Smooth transitions for Modern theme |
| CLI | Commander.js + Chalk + Ora | Standard Node.js CLI tooling |
| Validation | Zod | Runtime type validation for hook event payloads |

---

## Roadmap

### v1.0 -- Mission Control (Current)

- Real-time agent monitoring via Claude Code hooks
- Dashboard with 3 complete themes (Modern, Terminal, Pixel Art)
- PRD import with structured parsing into tasks and sprints
- Auto-updating Kanban board
- Sprint progress, burndown charts, dependency graphs
- Correlation engine linking agent events to PRD tasks
- CLI for init, start, status, sessions, hooks, and theme management
- SQLite persistence with full session history

### v1.1 -- Intelligence

- **Agent Map** -- Pixel art visualization where agents are characters moving between activity zones (Code, Command, Comms, Research, Rest, Done). The core visual differentiator of CAM.
- AI-assisted PRD parsing with complexity estimation
- Automatic dependency suggestions between tasks
- Session and sprint comparison
- Export to JSON, CSV, and Markdown reports
- Performance profiling (slowest tools, bottlenecks)

### v2.0 -- Desktop App (Tauri)

- Native desktop application wrapping the existing dashboard
- System tray with mini-status indicator
- Native OS notifications for errors and completions
- Auto-detect Claude Code sessions
- Auto-start on login

### v3.0 -- VS Code Extension

- Integrated WebView panel inside VS Code
- Status bar item showing agent count and errors
- Click-to-open on modified files
- File decorators showing who edited what and when

### v4.0 -- Multi-Machine

- Centralized server (optional cloud deployment)
- Authentication with API keys
- Multi-user dashboard
- PostgreSQL for persistent history
- Configurable alerts (Slack, Discord, email)

---

## How It Works Under the Hood

### Hook Configuration

When you run `cam init`, CAM adds hook entries to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "*", "command": "cam-hook pre-tool-use" }
    ],
    "PostToolUse": [
      { "matcher": "*", "command": "cam-hook post-tool-use" }
    ],
    "Notification": [
      { "matcher": "*", "command": "cam-hook notification" }
    ],
    "Stop": [
      { "matcher": "*", "command": "cam-hook stop" }
    ],
    "SubagentStop": [
      { "matcher": "*", "command": "cam-hook subagent-stop" }
    ],
    "PreCompact": [
      { "matcher": "*", "command": "cam-hook pre-compact" }
    ],
    "PostCompact": [
      { "matcher": "*", "command": "cam-hook post-compact" }
    ]
  }
}
```

Each hook reads environment variables injected by Claude Code (`$CLAUDE_TOOL_NAME`, `$CLAUDE_TOOL_INPUT`, etc.), serializes them to JSON, and sends a POST to the local CAM server. The entire process takes under 10ms and fails silently if the server is not running.

### Correlation Engine (PRD Tracking)

When PRD tracking is enabled, the correlation engine watches incoming events and automatically links them to PRD tasks:

1. **TaskCreate** detected -- Fuzzy-matches against existing PRD tasks or creates an "unplanned" task
2. **TaskUpdate** with status change -- Updates the corresponding PRD task status
3. **File Edit/Write** -- If the file is associated with a PRD task, records the activity
4. **SendMessage** between agents -- Tracks collaboration in the context of tasks

Three correlation modes are available: **Auto** (fuzzy matching, default), **Strict** (exact ID matching only), and **Manual** (user links events to tasks in the dashboard).

---

## Security

- The server runs **only on localhost** -- it is never exposed to the network
- No authentication required for the MVP (localhost-only is inherently secure)
- The hook binary never sends data to any external server
- Tool inputs and outputs are **truncated** to 500 characters to avoid leaking sensitive data
- The SQLite database is a local file -- no data leaves your machine
- Never commit `.env`, database files, or credentials (enforced by `.gitignore`)

---

## Contributing

Contributions are welcome. Here is how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes following the project conventions above
4. Ensure TypeScript compiles: `pnpm typecheck`
5. Ensure the build succeeds: `pnpm build`
6. Commit with conventional commits: `git commit -m "feat: add new feature"`
7. Push to your fork and open a pull request

### Branch Naming

- `feat/description` -- New features
- `fix/description` -- Bug fixes
- `refactor/description` -- Code restructuring
- `docs/description` -- Documentation changes

### Key Rules

- `@cam/shared` must be built before any other package
- Types go in `@cam/shared` first, then import them elsewhere
- `@cam/hook` must remain zero-dependency (only native Node.js modules)
- New API routes follow the Express router pattern in `packages/server/src/routes/`
- New dashboard components go in the appropriate theme folder under `packages/dashboard/src/components/themes/`
- Test files are colocated as `*.test.ts` next to source files

---

## License

[MIT](LICENSE)

---

Built with care for the Claude Code community.
