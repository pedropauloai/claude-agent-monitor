# Sprint 11 - Real User Polish

Status: active

---

## Context

### Motivation
Sprint born from real problems discovered during intensive dogfooding. While using CAM to monitor the construction of CAM itself, several UX and architecture issues are evident: SessionPicker showing sessions from all projects, Kanban columns never used (In Review, Blocked), race condition in agent naming, confusing "Elapsed" label, Correlation Engine too complex (~1500 lines) for the results delivered. A Q&A session defines the decisions for each problem.

### Current Code State
- `SessionPicker` shows all sessions without filtering by project
- Kanban has 6 columns but "In Review" and "Blocked" never receive tasks
- `use-resolve-agent-name.ts` has race condition: name changes when task binding arrives
- `friendly-names.ts` generates Docker-style names (adjective-noun) that confuse more than they help
- `correlation-engine.ts` with ~1500 lines, complexity disproportionate to the result
- Tasks live only in the DB, with no representation in versionable files
- No CRUD endpoints for tasks/sprints (only import via seed scripts)
- `prd_section` used for sprint grouping AND categorization simultaneously
- Relevant files: `packages/dashboard/src/stores/kanban-store.ts`, `packages/server/src/services/correlation-engine.ts`

### Design Decisions
- **SessionPicker**: KEEP but filter by project (working_directory of the active project)
- **Kanban**: REMOVE "In Review" and "Blocked" columns (never used in practice)
- **Agent naming**: prioritize Task `name` field, remove Docker-style names, resolve race condition
- **"Elapsed" -> "Session Duration"**: rename for clarity
- **Correlation Engine**: simplify to explicit-first (~1500 -> ~500 lines)
- **Sprint workflow**: PRD.md = vision document (Part 1-2), `tasks/` = sprint files (importable), DB = live source of truth
- **`prd_subsection`**: new field to separate sprint grouping from categorization
- **API CRUD**: endpoints to manage tasks and sprints without depending on seed scripts

### References
- PRD Part 3 - Execution (reference for sprint structure)
- Dogfooding Q&A session (2026-02-17) documented in MEMORY.md
- Sprint 8 (Project-First) and Sprint 9 (Dashboard Experience) as prerequisites
- Sprint template: `docs/SPRINTS/TEMPLATE.md`

---

## Tasks

### CLI & Infrastructure
- [ ] Allow cam init without PRD - observability standalone
  Priority: medium
  Tags: cli, init
  Description: cam init should work without PRD.md. Pilar 1 (observability) must work 100% standalone.
- [ ] Add prd_subsection column to DB schema
  Priority: medium
  Tags: database, schema
  Description: prd_section is used for both sprint grouping AND task categorization. Add prd_subsection to separate them.
- [ ] Create tasks/ folder structure with sprint markdown files
  Priority: high
  Tags: cli, tasks
  Description: Create tasks/ directory at project root with markdown file for each sprint.
- [ ] Implement API CRUD for tasks/sprints management
  Priority: high
  Tags: api, server
  Description: POST /api/projects/:id/tasks, DELETE /api/projects/:id/tasks/:taskId, POST /api/projects/:id/sprints.
- [ ] Add CLI sprint commands (add, import)
  Priority: medium
  Tags: cli, sprint
  Description: cam sprint add, cam sprint import for managing sprints from CLI.
- [ ] Implement sprint markdown import from tasks/ folder
  Priority: medium
  Tags: cli, parser
  Description: Parse sprint markdown files and import tasks to DB via API.

### Session Management
- [ ] Implement session auto-cleanup on page load
  Priority: high
  Tags: server, sessions
  Description: Mark stale sessions as completed when dashboard loads.
- [ ] Add session delete endpoint
  Priority: medium
  Tags: api, sessions
  Description: DELETE /api/sessions/:id to remove old sessions.
- [ ] Add session filtering by project
  Priority: medium
  Tags: api, sessions
  Description: Filter sessions by project working directory.
- [ ] Display session metadata
  Priority: low
  Tags: dashboard, sessions
  Description: Show session duration, event count, and agent count in session list.

### Dashboard Polish
- [ ] Fix activity feed scroll position
  Priority: high
  Tags: dashboard, ux
  Description: Activity feed should auto-scroll to bottom on new events but respect manual scroll.
- [ ] Implement Kanban drag-and-drop task status update
  Priority: high
  Tags: dashboard, kanban
  Description: Drag tasks between columns to update status via API.
- [ ] Show sprint progress in sidebar
  Priority: medium
  Tags: dashboard, sidebar
  Description: Show sprint completion percentage in project sidebar.
- [ ] Add task detail modal
  Priority: medium
  Tags: dashboard, tasks
  Description: Click on a task to see full details, activity log, and assigned agent.
- [ ] Optimize Agent Map performance
  Priority: medium
  Tags: dashboard, agent-map
  Description: Reduce re-renders in Agent Map with memoization and virtualization.
- [ ] Improve dark mode
  Priority: low
  Tags: dashboard, theme
  Description: Improve contrast and readability in dark mode across all components.
- [ ] Add mobile responsive layout
  Priority: low
  Tags: dashboard, responsive
  Description: Basic mobile support for viewing sprint progress and task list.
- [ ] Add error boundary for dashboard sections
  Priority: medium
  Tags: dashboard, error-handling
  Description: Add React error boundaries to prevent full page crashes on component errors.
