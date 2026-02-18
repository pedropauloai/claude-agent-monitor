# Sprint 8 - Project-First Architecture

Status: completed

---

## Context

### Motivation
CAM tries to guess which project a session belongs to using time windows and automatic grouping (session_groups). This is complex and fragile. This sprint replaces all that logic with a direct model: the user registers the project with `cam init`, CAM auto-detects the PRD, and when Claude Code opens in that directory, the connection is instant via `working_directory`. The central decision: **the project is the central entity, NOT the session**.

### Current Code State
- `session_groups` and `session_group_members` are the automatic grouping tables (Sprint 6)
- Auto-grouping logic in the event handler uses a 5-minute window to group sessions
- `/api/session-groups/*` endpoints exist but are fragile
- No concept of "project registration" - the server accepts events from any directory
- `packages/server/src/services/event-processor.ts` contains session grouping logic
- `packages/server/src/db/queries.ts` has session_groups queries

### Design Decisions
- **session_groups REMOVED**: replaced by direct `working_directory` -> `project_id` binding via `project_registry` table
- **Project Router**: middleware that routes events by `working_directory`, no time heuristics
- **Unregistered directories**: silently ignored (debug log), no errors for the user
- **`cam init` as entry point**: explicit model instead of magic detection
- **One server, multiple projects**: CAM manages N projects simultaneously

### References
- PRD Section 10 - MVP Sprint 8 (lines 2000-2022)
- Architecture decision: Project-First (MEMORY.md 2026-02-17)
- Multi-agent hooks discovery (MEMORY.md 2026-02-16)

---

## Tasks

### Section 1 - Project Registry (3 tasks)
- [x] Create project registration system with project_registry table
  Priority: high
  Tags: database, server
  Description: Create `project_registry` table mapping `working_directory` to `project_id`. Enforce uniqueness (one directory = one project). Add API endpoints for CRUD operations on registrations.
  Files: packages/server/src/db/schema.sql, packages/server/src/db/queries.ts

- [x] Implement cam init command for project registration
  Priority: high
  Tags: cli, init
  Description: Build interactive CLI that registers the current directory as a CAM project. Detect name from `package.json` or folder name. Create local `.cam/config.json` file with project_id.
  Files: packages/cli/src/commands/init.ts

- [x] Add auto-detect of PRD.md with parsing and confirmation
  Priority: high
  Tags: cli, prd
  Description: During `cam init`, search for `PRD.md` or `prd.md` at the root. If found, parse using the existing structured parser. Display summary and ask for confirmation. If not found, inform that it can be imported later.
  Files: packages/cli/src/commands/init.ts

### Section 2 - Connection Architecture (3 tasks)
- [x] Build Project Router middleware for event routing
  Priority: high
  Tags: server, routing
  Description: Create middleware that receives events from hooks and routes to the correct project by comparing `working_directory`. Match by prefix (support subdirectories). Silently reject events from unregistered directories.
  Files: packages/server/src/services/project-manager.ts

- [x] Simplify session binding via working_directory
  Priority: high
  Tags: server, sessions
  Description: Replace session_groups logic with direct `working_directory` to project binding. When SessionStart arrives, the Project Router identifies the project and creates the binding automatically.
  Files: packages/server/src/services/event-processor.ts, packages/server/src/db/queries.ts

- [x] Remove session_groups and dead code
  Priority: medium
  Tags: server, cleanup
  Description: Delete `session_groups` and `session_group_members` tables, remove `/api/session-groups/*` endpoints, remove auto-grouping logic, remove related queries.
  Files: packages/server/src/db/schema.sql, packages/server/src/routes/tasks.ts, packages/server/src/db/queries.ts

### Section 3 - Hook Management (3 tasks)
- [x] Implement auto-install of hooks via cam init
  Priority: high
  Tags: cli, hooks
  Description: Detect `.claude/settings.json` (global or local), add/update hook configuration pointing to `@cam/hook`. Back up original settings before modifying. Check if hooks already exist to avoid duplicates.
  Files: packages/cli/src/commands/init.ts

- [x] Add hook validation with cam doctor
  Priority: medium
  Tags: cli, diagnostics
  Description: Create command that checks if hooks are installed, if the server is running, if the project is registered. Display checklist with status (check/X) for each item. Suggest fixes for each problem.
  Files: packages/cli/src/commands/init.ts

- [x] Handle unregistered directories silently
  Priority: low
  Tags: server, hooks
  Description: Events from sessions in directories without `cam init` are silently ignored (debug log). No errors, no visible warnings to the user.
  Files: packages/server/src/services/project-manager.ts

### Section 4 - Multi-Project Server (3 tasks)
- [x] Add multi-project API endpoints
  Priority: high
  Tags: api, server
  Description: `GET /api/projects` returns registered projects with status, `GET /api/projects/:id/summary` with counters, `POST /api/projects/:id/archive` for archiving. Add status filters.
  Files: packages/server/src/routes/tasks.ts, packages/server/src/index.ts

- [x] Add SSE streams per project with project_id filter
  Priority: high
  Tags: server, sse
  Description: Add `project_id` parameter to the SSE endpoint to filter events. Client receives only events for the selected project. Support switching projects without reconnecting.
  Files: packages/server/src/index.ts

- [x] Implement cam status command with formatted table
  Priority: medium
  Tags: cli, status
  Description: Display formatted table with registered projects, active sessions, last activity, and connection health. Add visual indicators for each project's status.
  Files: packages/cli/src/commands/init.ts
