# Sprint 5 - Developer Experience & Plug-and-Play

Status: completed

---

## Context

### Motivation
Transform CAM from "works for whoever built it" into "any dev with Claude Code installs and uses it quickly". Up to this point, CAM only works if you clone the repo and run `pnpm dev`. No global install path exists. Ideal setup: tmux + Claude Code Teams for full E2E tracking. Desired flow: `npm install -g claude-agent-monitor && cam init && cam start`.

Beyond the CLI, the dashboard provides no visual feedback about connection state - it does not show whether it is connected, whether a session starts or ends, or whether agents join or leave. Users open the dashboard and see a blank screen with no instructions.

### Current Code State
- `packages/cli/` - Commander.js with basic commands but no cross-platform robustness
- `packages/hook/` - cam-hook binary exists but does not work as a global install
- `packages/dashboard/` - no connection indicators, no empty states, no lifecycle notifications
- `packages/hook/src/transport.ts` - basic transport without fallbacks
- `.claude/settings.json` - hooks configured manually, no auto-detect

### Design Decisions
- `cam-hook` must be a functional global binary (in PATH after `npm install -g`), NOT relative paths
- `cam init` performs smart merge of hooks (preserves user's existing hooks, adds CAM's)
- Docker-style friendly naming for agents (session_id hash -> "brave-panda")
- Full Visibility as a principle: no truncation without an associated "view full" mechanism
- Resilient transport: fallback chain (gateway -> nameserver -> localhost)

### References
- PRD Section 10 - MVP Sprints (lines 1911-1938)
- `packages/cli/src/commands/init.ts` - cam init implementation
- `packages/hook/src/transport.ts` - transport with WSL auto-detect
- `scripts/test-wsl-hook.sh` - WSL diagnostic tool

---

## Tasks

### Section 1 - Robust CLI
- [x] Make cam init robust
  Priority: high
  Tags: cli, setup, hooks
  Description: Detect existing `.claude/settings.json`, perform smart merge of hooks (preserve user hooks, add CAM hooks), work on Windows/Mac/Linux, show clear feedback of what is configured. Use `cam-hook` (global binary) in commands, NOT relative paths.
  Files: packages/cli/src/commands/init.ts

- [x] Make cam-hook a functional global binary
  Priority: high
  Tags: cli, hook, global-install
  Description: When installed via `npm install -g`, the `cam-hook` binary must be in PATH and work standalone (read stdin JSON, POST to server). Test global installation end-to-end.
  Files: packages/hook/src/index.ts

- [x] Integrate cam start command
  Priority: high
  Tags: cli, dx
  Description: A single command that starts server + dashboard + opens browser + shows status. Must work after `npm install -g` (not just in dev with `pnpm dev`).
  Files: packages/cli/src/commands/start.ts

- [x] Make cam status functional
  Priority: medium
  Tags: cli, diagnostics
  Description: Show whether the server is running, how many active sessions, how many captured events, whether hooks are configured correctly. Quick diagnostic to verify everything is working.
  Files: packages/cli/src/commands/status.ts

### Section 2 - Dashboard Visual Feedback
- [x] Add connection status indicator
  Priority: high
  Tags: dashboard, ux, sse
  Description: Permanent bar/badge on the dashboard showing "Connected - capturing events" or "Disconnected - awaiting server". Use the existing SSE heartbeat (15s). Visible across all themes.
  Files: packages/dashboard/src/components/shared/ConnectionStatus.tsx

- [x] Add session lifecycle visuals
  Priority: medium
  Tags: dashboard, ux, notifications
  Description: When SessionStart arrives via SSE, show notification/banner "New session started". When SessionEnd arrives, show "Session ended". The dashboard already receives these events but does nothing visual with them.

- [x] Add agent join/leave notifications
  Priority: medium
  Tags: dashboard, ux, notifications
  Description: When an agent appears (agent_created SSE), show toast "Agent X joined". When it leaves (agent_status=shutdown), show "Agent X finished". Visual feedback of the team forming.

- [x] Add empty state / onboarding screen
  Priority: medium
  Tags: dashboard, ux, onboarding
  Description: When the dashboard opens with no active session, show "Awaiting connection..." screen with instructions on how to start (run `cam init`, run `claude` in another terminal). Currently shows a blank screen.

### Section 3 - Cross-Platform Reliability
- [x] Document tmux + Teams setup
  Priority: medium
  Tags: docs, tmux, teams
  Description: Add a README section explaining the recommended setup (tmux + Teams for full E2E tracking), include `scripts/test-wsl-hook.sh` as a diagnostic tool, explain that in-process mode works but with degraded tracking (events not attributed per agent).

- [x] Add transport resilience
  Priority: high
  Tags: hook, transport, reliability
  Description: Add fallback in transport.ts (if gateway fails, try nameserver, try localhost). Add optional logging (CAM_DEBUG=1) that shows which host it's sending to.
  Files: packages/hook/src/transport.ts

- [x] Create cam doctor diagnostic command
  Priority: medium
  Tags: cli, diagnostics
  Description: Check if server is running, hooks are configured, tmux is available, can POST successfully, show clear diagnostic of where the problem is.
  Files: packages/cli/src/commands/doctor.ts

### Section 4 - Zero-Config Agent Detection
- [x] Work without explicit tasks
  Priority: high
  Tags: agent-detection, zero-config
  Description: CAM must show useful activity even with `claude "fix the bug"` without tasks/teams. Activity feed, file watcher, and agent panel must work with a single agent doing normal tool calls.

- [x] Auto-detect team formation
  Priority: medium
  Tags: agent-detection, teams
  Description: When Claude Code uses TeamCreate or Task tool, CAM must automatically create a session group and show agents appearing. End-to-end testing and polish of existing event-processor implementation.
  Files: packages/server/src/services/event-processor.ts

### Section 5 - Didactic Naming & Full Visibility
- [x] Implement Friendly Agent Naming System
  Priority: high
  Tags: agent-naming, ux
  Description: Display main agent as "Main" (or project name), subagents use Task/TeamCreate name (e.g., "researcher"), if no name generate automatic friendly name via session_id hash (Docker-style: "brave-panda"). Session ID (8 chars) as subtle subtitle. Sessions shown as "Session #1" or "14:30 - Feb 16" with UUID in tooltip.
  Files: packages/dashboard/src/lib/friendly-names.ts, packages/dashboard/src/hooks/use-resolve-agent-name.ts

- [x] Enforce Full Visibility - eliminate truncations
  Priority: high
  Tags: ux, visibility
  Description: Use word-wrap by default in activity labels (never text-overflow ellipsis), file paths show filename as primary + full path in tooltip, speech bubbles expandable on click, agent cards with flexible size, Bash commands with horizontal scroll. Rule: no truncation without an associated "view full" mechanism.
