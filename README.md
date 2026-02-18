<p align="center">
  <pre align="center">
   ██████╗ █████╗ ███╗   ███╗
  ██╔════╝██╔══██╗████╗ ████║
  ██║     ███████║██╔████╔██║
  ██║     ██╔══██║██║╚██╔╝██║
  ╚██████╗██║  ██║██║ ╚═╝ ██║
   ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝
  </pre>
</p>

<h1 align="center">Claude Agent Monitor</h1>

<p align="center">
  <strong>Mission Control for Claude Code agents.</strong><br>
  Real-time observability + visual PRD/Sprint tracking.<br>
  Watch your AI agents work. Learn how they build. Ship faster.
</p>

<p align="center">
  <a href="https://github.com/pedropauloai/claude-agent-monitor/stargazers"><img src="https://img.shields.io/github/stars/pedropauloai/claude-agent-monitor?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/pedropauloai/claude-agent-monitor/network/members"><img src="https://img.shields.io/github/forks/pedropauloai/claude-agent-monitor?style=social" alt="GitHub Forks"></a>
</p>

<p align="center">
  <a href="https://github.com/pedropauloai/claude-agent-monitor/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript"></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-workspace-orange" alt="pnpm"></a>
  <a href="https://github.com/pedropauloai/claude-agent-monitor/commits"><img src="https://img.shields.io/github/last-commit/pedropauloai/claude-agent-monitor" alt="Last Commit"></a>
  <a href="https://github.com/pedropauloai/claude-agent-monitor/issues"><img src="https://img.shields.io/github/issues/pedropauloai/claude-agent-monitor" alt="Issues"></a>
</p>

---

## Who is this for?

CAM was built for developers who use **Claude Code** (with Opus model) to build full-stack applications. Whether you call it "vibe-coding" or AI-assisted development, the experience today is a **black box**:

- You have no idea what the agent is doing
- You can't tell if it's stuck or making progress
- When you use teams of agents, it's chaos
- You learn nothing from the process

**CAM changes that.** It's a dashboard that connects to Claude Code via hooks and shows you everything in real-time. Think of it as a **flight control center** for your AI agents.

> **Learning through observability**: The core concept of CAM. By watching agents work, you understand *how* software is built -- not just the final result.

### Two Pillars, One Dashboard

| Pillar | What it answers | Data source |
|--------|----------------|-------------|
| **Agent Monitor** | "What is each agent doing RIGHT NOW?" | Real-time hooks |
| **Sprint Tracker** | "Where are we in the project? What's left?" | Sprint files + TaskCreate/TaskUpdate via hooks |

---

## Quick Start

### Step 1: Install

```bash
npm install -g claude-agent-monitor
```

### Step 2: Initialize your project

```bash
cd your-project
cam init
# CAM will:
#   - Configure Claude Code hooks
#   - Create docs/PRD/ and docs/SPRINTS/ with templates
#   - Register the project for monitoring
```

### Step 3: Start working

```bash
# Start the CAM server + dashboard
cam start

# In another terminal, use Claude Code as you normally would
claude "implement the auth module"

# Open http://localhost:7891 and watch everything in real-time
```

That's it. Three commands and you have full observability.

### Adding Sprint Tracking (optional)

Create sprint files to track tasks on the Kanban board:

```bash
# Create a sprint file from the template
cp docs/SPRINTS/TEMPLATE.md docs/SPRINTS/sprint-01.md
# Edit sprint-01.md with your tasks

# Import all sprint files at once
cam sprint sync

# Or import one at a time
cam sprint import docs/SPRINTS/sprint-01.md
```

---

## Screenshots

> Screenshots and GIF demos coming soon. Here is what each view shows:

- **Modern Theme** -- Clean dark dashboard with agent cards, real-time activity feed, file watcher, session timeline, and stats bar. Inspired by Linear and Vercel.
- **Terminal Theme** -- Green-on-black interface with tmux-style panes, ASCII sparklines, vim keybindings, and CRT scan line effects.
- **Pixel Art Theme** -- Retro RPG aesthetic with pixel borders, NES color palette, game-style HUD, and 8-bit typography.
- **Agent Map** -- Pixel art visualization where agents are animated characters on a "Mission Floor". Watch them code, search, talk, and celebrate in real-time.
- **Kanban Board** -- Auto-updating task board with columns for Backlog, Planned, In Progress, and Completed.
- **Burndown Chart** -- Real vs ideal progress lines with scope change indicators and sprint velocity tracking.

---

## Features

### Pillar 1 -- Agent Monitor

- **Real-time activity feed** -- Every tool call, file edit, bash command, and message streamed live via SSE
- **Agent panel** -- See all agents with live status indicators (active, idle, error, completed, shutdown)
- **Agent Map** -- Pixel art visualization with 8 animated poses, speech bubbles, activity labels, and hierarchy lines
- **File watcher** -- Track every file created, modified, or read, with per-agent attribution and touch counts
- **Session timeline** -- Gantt-style visualization of agent activity over time
- **Stats bar** -- Live counters for duration, tool calls, errors, files modified, and events per minute
- **Agent detail view** -- Deep dive into any agent's tool history, files touched, errors, and current task
- **Error tracking** -- Instant visibility into tool errors, rejected tool calls, and agent failures

### Pillar 2 -- Sprint Tracker

- **Sprint file import** -- Create markdown sprint files with tasks, import them with `cam sprint sync` or `cam sprint import`
- **Auto-updating Kanban** -- Tasks move between columns on their own as agents call TaskCreate and TaskUpdate
- **Sprint progress** -- Live progress bars, completion percentages, and velocity metrics for the active sprint
- **Correlation Engine v2** -- 5-layer scoring pipeline that automatically matches agent events to tasks (exact ID, tag similarity, file domain, title similarity, keyword overlap)
- **Burndown chart** -- Classic burndown with ideal vs actual lines, scope changes, and time-based projections
- **Multi-project support** -- Monitor multiple projects from a single CAM dashboard with project sidebar and switcher

---

## Themes

CAM ships with three complete visual themes. Switch anytime from the settings or with `cam theme <name>`.

### Modern (Default)

Clean, professional dashboard inspired by Linear, Vercel, and Raycast. Dark background with glassmorphism cards, smooth Framer Motion transitions, and a minimal color palette. Best for everyday use.

### Terminal

100% text interface styled after htop, lazygit, and tmux. Pure black background with phosphorescent green text, box-drawing characters, ASCII sparklines, and optional CRT effects. Keyboard-driven with vim-style navigation (j/k/h/l). For developers who live in the terminal.

### Pixel Art

Retro RPG aesthetic with NES-era 16-color palette, pixel borders, Press Start 2P font, and game-style HUD elements. Progress bars fill pixel by pixel. Activity logs read like RPG battle text. Home of the Agent Map visualization.

---

## How It Works

```
  You use Claude Code normally
          |
          | hook fires automatically
          v
  +-----------------+     POST      +------------------+
  |   cam-hook      | -----------> |   CAM Server     |
  |   (< 10ms)      |              |   (Express +     |
  |   zero deps     |              |    SQLite)       |
  +-----------------+              +--------+---------+
                                            |
                              +-------------+-------------+
                              |                           |
                              v                           v
                     +----------------+         +------------------+
                     |   Dashboard    |         |   Correlation    |
                     |   (React +     |         |   Engine         |
                     |    real-time)  |         |   (auto-links    |
                     +----------------+         |    to PRD tasks) |
                                                +------------------+
```

**Step by step:**

1. You run Claude Code in your project as normal
2. Claude Code executes an action (edit a file, run a command, etc.)
3. A configured **hook** fires and sends a tiny JSON payload to the CAM server
4. The server stores it in SQLite and emits an **SSE event**
5. The dashboard receives the event and updates the UI in **real-time**
6. If sprint tracking is enabled, the **Correlation Engine** maps tool calls to sprint tasks automatically

The hook binary is ultra-fast (< 10ms) and fails silently. It **never** blocks Claude Code, even if the CAM server is not running.

---

## Architecture

### Monorepo Structure

```
                          +------------------+
                          |   @cam/shared    |
                          |   Types, Schemas |
                          +--------+---------+
                                   |
                     used by all packages below
                                   |
          +------------+-----------+-----------+------------+
          |            |                       |            |
          v            v                       v            v
   +------------+ +------------+       +------------+ +------------+
   | @cam/hook  | | @cam/cli   |       | @cam/server| | @cam/      |
   | Hook binary| | Terminal   |------>| API + DB   |-->| dashboard |
   | (zero deps)| | commands   |       | + SSE      | | React UI   |
   +------------+ +------------+       +------------+ +------------+
```

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
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id/sprints` | List sprints |
| `GET` | `/api/projects/:id/tasks` | List tasks with filters |
| `GET` | `/api/registry/lookup` | Lookup project by working directory |

---

## CLI Commands

### Getting Started

```bash
cam init                     # Register project + configure hooks + scaffold templates
cam start                    # Start server + dashboard (opens browser)
cam status                   # Show registered projects, active sessions, health
cam doctor                   # Diagnose common issues (hooks, server, project)
```

### Server and Dashboard

```bash
cam start                    # Start server + dashboard (opens browser)
cam start --port 8080        # Custom server port
cam start --no-open          # Don't auto-open browser
cam sessions                 # List previous sessions
```

### Projects

```bash
cam project list             # List all projects
cam project show             # Show active project with stats
cam project show <id>        # Show specific project (sets as active)
cam project delete <id>      # Delete a project
```

### Sprints and Tasks

```bash
cam sprint list              # List sprints in active project
cam sprint create "Sprint 2" # Create a new sprint
cam sprint import <file>     # Import tasks from a sprint markdown file
cam sprint sync              # Import all sprint files from docs/SPRINTS/
cam sprint activate <id>     # Set the active sprint
cam tasks                    # List tasks in active sprint
cam tasks --all              # List all tasks in project
```

---

## Hook Events Captured

CAM captures the following Claude Code hook events:

| Hook | When it fires | What CAM does with it |
|------|--------------|----------------------|
| `SessionStart` | When a Claude Code session begins | Creates session, binds to project via working directory |
| `SessionEnd` | When a session ends | Marks session completed, final stats |
| `PreToolUse` | Before every tool call | Records agent intent, tracks tool usage |
| `PostToolUse` | After tool call completes | Records result, duration, detects errors, correlates to PRD tasks |
| `UserPromptSubmit` | When user sends a prompt | Tracks user interaction within sessions |
| `Notification` | Claude Code sends a notification | Displays alerts in dashboard |
| `Stop` | Main agent stops | Marks session end, triggers cleanup |
| `SubagentStop` | A teammate agent stops | Tracks agent lifecycle |
| `PreCompact` | Before context compaction | Monitors context usage |
| `PostCompact` | After context compaction | Tracks compaction efficiency |

---

## Recommended Workflow

CAM provides **3 layers of value**, each optional and additive:

1. **Observability** (always on) -- See what agents are doing in real-time
2. **Sprint Tracking** (optional) -- Track tasks on the Kanban board
3. **PRD** (optional) -- Define your project vision with a PRD document

### 1. Initialize your project

```bash
cd your-project
cam init
```

CAM configures hooks, scaffolds `docs/PRD/` and `docs/SPRINTS/` with templates, and registers the project. You're immediately ready for agent monitoring.

### 2. Define sprints (optional)

Create sprint files from the template and import them:

```bash
cp docs/SPRINTS/TEMPLATE.md docs/SPRINTS/sprint-01.md
# Edit sprint-01.md with your tasks
cam sprint sync
```

### 3. Let Claude Code build it

```bash
claude "implement Sprint 1 tasks"
```

### 4. Watch and learn

Open the CAM dashboard and observe:
- Which files are being created and modified
- What tools each agent uses and in what order
- How tasks move from "Planned" to "Completed"
- When errors happen and how agents recover

### 5. Add more sprints as you go

As the project grows, create new sprint files and run `cam sprint sync` to import them. The import is **idempotent** -- existing tasks are skipped, only new ones are added.

This workflow has been battle-tested building CAM itself (dogfooding since day one).

---

## Multi-Agent Setup (tmux + Teams)

For **full end-to-end agent tracking**, use Claude Code Teams with tmux. Each agent runs as a separate process with its own `session_id`, enabling per-agent tracking in the dashboard.

### Recommended: tmux + Teams

```bash
# 1. Start CAM
cam start

# 2. In a tmux session, start Claude Code
tmux new-session -s dev
claude "implement Sprint 1 using a team of agents"

# Claude Code Teams automatically creates tmux panes for each agent.
# Each agent fires hooks independently -- CAM tracks them all.
```

This gives you:
- Per-agent activity tracking (who did what)
- Individual agent timelines
- Accurate tool call attribution
- Agent lifecycle events (spawn, idle, shutdown)

### Alternative: Single process (in-process mode)

```bash
# Works without tmux, but with limited agent tracking
cam start
claude "implement the feature"
```

In this mode, background agents share the main process. CAM still captures all tool events, but they are attributed to the main agent. You get full observability of *what* is happening, but not *who* is doing it.

### WSL Setup (Windows)

The `cam-hook` binary auto-detects WSL by reading `/proc/version`. When WSL is detected, it resolves the Windows host IP via the default gateway. **No manual configuration is needed** in most cases.

If auto-detection fails:

```bash
export CAM_SERVER_HOST=172.20.0.1   # Replace with your Windows host IP
```

### Hook Transport

The hook binary includes built-in resilience:

1. Tries the detected/configured host first
2. Falls back to `localhost` and `127.0.0.1` if the primary host fails
3. Max 3 attempts with exponential backoff
4. Always fails silently -- never blocks Claude Code

### Debug mode

```bash
export CAM_DEBUG=1
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| Events not arriving | Run `CAM_DEBUG=1 cam-hook pre-tool-use < /dev/null` to see connection attempts |
| `ECONNREFUSED` on all hosts | Make sure the CAM server is running (`cam start` or `pnpm dev`) |
| Gateway IP wrong (WSL) | Set `CAM_SERVER_HOST` explicitly |
| Node not found in WSL | Ensure Node.js is installed in WSL or that nvm is configured |
| Hook takes too long | Check network: `curl -s http://<host>:7890/api/sessions` |
| Server in WSL, dashboard on Windows | Set bind host: `cam start --bind 0.0.0.0` |

---

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
git clone https://github.com/pedropauloai/claude-agent-monitor.git
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
| Styling | Tailwind CSS 4 | Consistent design, easy theming across 3 themes |
| State | Zustand | Minimal boilerplate, one store per domain |
| Charts | Recharts | React-native charting, simple API |
| Animation | Framer Motion | Smooth transitions for Modern theme |
| CLI | Commander.js + Chalk + Ora | Standard Node.js CLI tooling |
| Validation | Zod | Runtime type validation for hook event payloads |

---

## Roadmap

### v1.0 -- Mission Control (Current)

Real-time agent monitoring, PRD tracking, pixel art Agent Map, 3 themes, CLI, multi-project support. 11 sprints completed. See [sprint files](docs/SPRINTS/) for details.

### v1.1 -- Intelligence

AI-assisted PRD parsing, automatic dependency suggestions, session comparison, export (JSON/CSV/Markdown), performance profiling.

### v2.0 -- Desktop App (Tauri)

Native desktop app with system tray, OS notifications, auto-detect Claude Code sessions, auto-start on login.

### v3.0 -- VS Code Extension

Integrated WebView panel, status bar, click-to-open files, file decorators showing agent attribution.

### v4.0 -- Multi-Machine

Centralized server, authentication, multi-user dashboard, PostgreSQL, alerts (Slack, Discord, email).

---

## Security

- The server runs **only on localhost** -- never exposed to the network
- No authentication in the MVP (localhost-only is inherently secure)
- The hook binary **never** sends data to any external server
- Tool inputs and outputs are **truncated** to prevent leaking sensitive data
- SQLite database is a local file -- no data leaves your machine
- Never commit `.env`, database files, or credentials (enforced by `.gitignore`)

---

## Contributing

Contributions are welcome! Here is how to get started:

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

## Star History

<a href="https://star-history.com/#pedropauloai/claude-agent-monitor&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=pedropauloai/claude-agent-monitor&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=pedropauloai/claude-agent-monitor&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=pedropauloai/claude-agent-monitor&type=Date" />
 </picture>
</a>

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built with care for the Claude Code community.<br>
  <sub>CAM is built using CAM (dogfooding since day one).</sub>
</p>
