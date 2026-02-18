# Sprint 6 - True Observability

Status: completed

---

## Context

### Motivation
The dashboard needs to show the truth. Real dogfooding reveals serious problems: agent names are random UUIDs (raw session_id instead of names), counts are inflated (tool calls counted 2x on both PreToolUse AND PostToolUse), zombie sessions pollute the view (test sessions that never receive a Stop event remain "active" forever), and the activity feed is repetitive (TaskList appears dozens of times consecutively without grouping).

This sprint fixes everything so that monitoring is genuinely useful - not just "works" but "shows reliable information".

### Current Code State
- `packages/hook/src/handlers/` - all handlers with agent_id hardcoded as "main"
- `packages/server/src/services/event-processor.ts` - increments tool calls on both Pre and PostToolUse
- `packages/dashboard/src/stores/session-store.ts` - StatsBar uses events.length from Zustand (only counts SSE events after connection)
- `packages/shared/src/constants.ts` - MAX_INPUT_LENGTH and MAX_OUTPUT_LENGTH = 500 (truncates critical data)
- `.claude/settings.json` - no handler for SubagentStart

### Design Decisions
- session_id from stdin is the real agent_id (each Claude Code process has a unique session_id)
- Tool calls incremented ONLY on PostToolUse (no longer on Pre)
- Agent name resolution in 3 layers: agent_type -> Task name -> Docker-style friendly name
- Configurable activity window (1m/3m/5m/10m) instead of fixed detection
- MAX_INPUT/OUTPUT increased significantly to preserve correlation data

### References
- PRD Section 10 - MVP Sprints (lines 1940-1961)
- Discoveries from dogfooding with 4984+ captured events
- `packages/hook/src/handlers/` - all hook handlers
- `packages/server/src/services/event-processor.ts` - event processing

---

## Tasks

### Section 1 - Hook Accuracy
- [x] Implement SubagentStart hook
  Priority: high
  Tags: hook, subagent, accuracy
  Description: Create a new handler that captures `agent_id` and `agent_type` from stdin when a subagent spawns. Add to settings.json. Claude Code already provides these fields natively - we just need to capture them.
  Files: packages/hook/src/handlers/subagent-start.ts, .claude/settings.json

- [x] Fix hardcoded agent_id "main" in all handlers
  Priority: critical
  Tags: hook, accuracy, bug-fix
  Description: Fix pre-tool-use, post-tool-use, stop, subagent-stop, session-start, notification, compact. Use `session_id` from stdin as the real `agent_id`. Each Claude Code process has a unique session_id.
  Files: packages/hook/src/handlers/

- [x] Fix double counting of tool calls
  Priority: high
  Tags: accuracy, bug-fix
  Description: `incrementToolCalls` runs on both PreToolUse and PostToolUse, inflating the count 2x. Change to increment ONLY on PostToolUse.
  Files: packages/server/src/services/event-processor.ts

### Section 2 - Agent Identity
- [x] Implement agent name resolution with 3 layers
  Priority: high
  Tags: agent-naming, identity
  Description: (1) `agent_type` from SubagentStart as primary source, (2) `name` from Task tool input as secondary source, (3) Docker-style friendly name as last fallback. Persist session_id -> real name mapping in agents table.
  Files: packages/dashboard/src/hooks/use-resolve-agent-name.ts, packages/server/src/services/event-processor.ts

- [x] Correlate Task tool to session
  Priority: medium
  Tags: agent-naming, correlation
  Description: When main agent uses Task tool with `name: "cli-dev"`, store in pending names queue. When a new session appears in the group (SessionStart), associate the next pending name to that session. Update agent.name retroactively.
  Files: packages/server/src/services/event-processor.ts

### Section 3 - Session Lifecycle
- [x] Add configurable time window for active/inactive
  Priority: medium
  Tags: session, lifecycle, dashboard
  Description: Replace fixed detection with a configurable window (1m/3m/5m/10m). Agents with activity within the window = active in workspace. No activity = inactive in InactiveBar. Add UI selector on the dashboard to switch windows.
  Files: packages/dashboard/src/stores/filter-store.ts

- [x] Implement auto-cleanup of stale sessions
  Priority: high
  Tags: session, lifecycle, server
  Description: Add periodic job on the server that marks sessions without activity for more than 10 minutes as "completed". Resolve zombie sessions (test-debug, test-wrapper, etc.) that remain "active" forever by never receiving a Stop event.
  Files: packages/server/src/index.ts

- [x] Add session picker to dashboard
  Priority: medium
  Tags: session, dashboard, ux
  Description: Add dropdown/tabs in the shell to switch between sessions and session groups. Show current active session/group with summarized stats. Make previous session history accessible without cluttering the main view.
  Files: packages/dashboard/src/components/shared/SessionPicker.tsx

### Section 4 - Dashboard Accuracy
- [x] Fix StatsBar Events count
  Priority: high
  Tags: dashboard, accuracy, bug-fix
  Description: Use `session.eventCount` from the database instead of `events.length` from Zustand store (which only counts events received via SSE after connection). Ensure consistency across all displayed metrics.
  Files: packages/dashboard/src/components/themes/modern/ModernStatsBar.tsx

- [x] Filter/group repetitive TaskList in Activity Feed
  Priority: medium
  Tags: dashboard, activity-feed, ux
  Description: When multiple consecutive TaskList events from the same agent occur, group into "TaskList x5" or allow filtering by tool. Reduce noise in the feed to highlight real actions (Edit, Bash, Write).
  Files: packages/dashboard/src/components/themes/modern/ModernActivityFeed.tsx

- [x] Complete Full Visibility server-side
  Priority: high
  Tags: server, data-pipeline, visibility
  Description: Remove or significantly increase `MAX_INPUT_LENGTH = 500` and `MAX_OUTPUT_LENGTH = 500` in constants.ts. The server truncates data BEFORE it reaches the dashboard, preventing the UI from showing complete information even with word-wrap.
  Files: packages/shared/src/constants.ts
