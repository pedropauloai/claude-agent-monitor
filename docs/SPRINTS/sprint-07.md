# Sprint 7 - Correlation Engine v2: Reliable Task Tracking

Status: completed

---

## Context

### Motivation
Complete rewrite of the Correlation Engine. Real dogfooding reveals that the automatic correlation system between hook events and PRD tasks does not work reliably. The Sprint 5 team completes 14 tasks but none are automatically updated in the database. Root cause: fuzzy matching by substring between titles in different languages, with no session context, no agent binding, no explicit IDs.

Strategy: "Explicit First, Context Second, Fuzzy Last" - inspired by how Jira (PROJ-123 in commits), GitHub (#45 in PRs) and Linear (issue ID in branches) handle correlation: explicit ID as the primary layer, context as secondary, fuzzy as fallback.

### Current Code State
- `packages/server/src/services/correlation-engine.ts` - original engine with ~500 lines, basic substring matching
- `packages/server/src/services/event-processor.ts` - processes events but without detailed field extraction
- `packages/shared/src/constants.ts` - MAX_INPUT/OUTPUT_LENGTH = 500 (truncates critical task IDs)
- `events` table missing correlation_id/causation_id fields
- No audit log, session-project binding, or agent-task binding tables

### Design Decisions
- 5-layer hierarchical pipeline: Exact ID (1.0) -> Tag match (0.85-0.95) -> Agent binding + file path (0.7-0.85) -> Title similarity (0.6-0.8) -> Keyword overlap (0.5-0.7)
- Stop at the first layer with sufficient confidence (don't process all)
- Custom algorithms in pure TypeScript (Jaro-Winkler, Levenshtein) - zero external deps
- Audit log for EVERY correlation attempt (success and failure) - essential for debugging
- Automatic session-project binding via working_directory on SessionStart
- Agent-task binding with +0.3 confidence boost
- 3 tasks deferred to backlog v1.1: intent detection, state machine, and file mapping (high complexity, uncertain ROI)

### References
- PRD Section 10 - MVP Sprints (lines 1963-1998)
- Jira/GitHub/Linear as reference for explicit ID correlation
- OpenTelemetry/Arkency for correlation_id + causation_id pattern
- `packages/server/src/services/string-similarity.ts` - new file with algorithms
- `packages/server/src/db/schema.sql` - new tables (correlation_audit_log, session_project_bindings, agent_task_bindings)

---

## Tasks

### Section 1 - Explicit ID Strategy
- [x] Implement PRD Task ID injection system via cam init --prd
  Priority: high
  Tags: correlation, explicit-id, cli
  Description: Generate `.cam/task-map.json` mapping PRD task IDs to titles. Generate a CLAUDE.md section instructing agents to reference IDs. Use `[CAM:task-id]` pattern in descriptions for exact match. Solve the root problem: agents don't know PRD tasks exist.
  Files: packages/cli/src/commands/init.ts

- [x] Enhance TaskCreate/TaskUpdate field extraction
  Priority: high
  Tags: correlation, event-processing
  Description: Extract ALL fields from tool_input (subject, description, tags, priority, activeForm, taskId). Tags are a direct source of correlation. Store complete tool_input without truncation.
  Files: packages/server/src/services/event-processor.ts, packages/server/src/services/correlation-engine.ts

- [x] Implement TaskList synchronization handler
  Priority: medium
  Tags: correlation, sync
  Description: Parse TaskList response to obtain Claude Code tasks with statuses. Reconcile against PRD tasks by exact ID match and title similarity. Bulk-update divergences.
  Files: packages/server/src/services/correlation-engine.ts

### Section 2 - Context Binding
- [x] Implement automatic Session-to-Project binding
  Priority: high
  Tags: correlation, session, binding
  Description: When SessionStart arrives, check working_directory against project paths. Auto-bind session to project. All subsequent correlation filters by that project (resolve O(n*m) scan).
  Files: packages/server/src/services/correlation-engine.ts, packages/server/src/db/queries.ts

- [x] Implement Agent-to-Task binding with confidence boost
  Priority: high
  Tags: correlation, agent, binding
  Description: When an agent is assigned to a task, create binding (agent_id -> prd_task_id). Subsequent events gain +0.3 bias. Binding expires when task completes.
  Files: packages/server/src/services/correlation-engine.ts, packages/server/src/db/queries.ts

- [x] Implement Agent Context Window - per-agent state
  Priority: medium
  Tags: correlation, context
  Description: Maintain current_task, last_10_tools, files_since_task_start, time_on_task. Use for disambiguating matches. Persist in memory + DB.
  Files: packages/server/src/services/correlation-engine.ts

### Section 3 - Improved Matching
- [x] Implement Levenshtein + Jaro-Winkler similarity
  Priority: high
  Tags: correlation, algorithms
  Description: Replace substring match with custom algorithms. Normalize strings (lowercase, remove accents, expand abbreviations). Pure TypeScript, zero deps.
  Files: packages/server/src/services/string-similarity.ts

- [x] Build multi-signal hierarchical scoring pipeline
  Priority: critical
  Tags: correlation, pipeline
  Description: 5 layers - Exact ID (1.0), Tag match (0.85-0.95), Agent binding + file path (0.7-0.85), Title similarity (0.6-0.8), Keyword overlap (0.5-0.7). Stop at the first layer with sufficient confidence.
  Files: packages/server/src/services/correlation-engine.ts

- [ ] Add File-to-Task domain mapping
  Priority: low
  Tags: correlation, file-mapping
  Description: Map file patterns to task domains automatically from PRD titles + tags. Deferred to backlog v1.1 - high complexity with uncertain ROI.

### Section 4 - Event Intelligence
- [ ] Add UserPromptSubmit intent detection
  Priority: medium
  Tags: correlation, intent, nlp
  Description: Extract intent from user prompt, flag tasks as "in scope" (boost +0.2). Hook already exists but Correlation Engine ignores it. Deferred to backlog v1.1 - requires natural language analysis.

- [ ] Implement status inference state machine
  Priority: medium
  Tags: correlation, state-machine
  Description: IDLE -> RESEARCHING -> IMPLEMENTING -> TESTING -> COMPLETED. Per-agent per-task. Use Bash exit codes as a strong signal. Deferred to backlog v1.1 - high state complexity.

### Section 5 - Data Pipeline
- [x] Remove artificial truncation
  Priority: high
  Tags: data-pipeline, visibility
  Description: Increase MAX_INPUT/OUTPUT_LENGTH from 500/5000 to 50000. Truncated data loses critical task IDs.
  Files: packages/shared/src/constants.ts

- [x] Add correlation audit log
  Priority: high
  Tags: correlation, audit, debugging
  Description: Create table + endpoint to record every correlation attempt (success and failure). Essential for debugging and tuning.
  Files: packages/server/src/db/schema.sql, packages/server/src/db/queries.ts, packages/server/src/routes/tasks.ts

### Section 6 - Integration & Validation
- [x] Add dashboard correlation indicators
  Priority: medium
  Tags: dashboard, correlation, ux
  Description: Add confidence badges on Kanban cards (green >0.95, yellow >0.75, gray manual). Debug panel with recent matches.
  Files: packages/dashboard/src/components/themes/modern/ModernKanban.tsx

- [x] Create end-to-end correlation test suite
  Priority: high
  Tags: testing, correlation, e2e
  Description: Build fixtures with real payloads, tests per layer, full pipeline, regression for known failures. Target: >90% accuracy.
  Files: scripts/test-full-pipeline.cjs

### Section 7 - Hooks & Event Chain
- [x] Add new hook handlers
  Priority: high
  Tags: hooks, pipeline
  Description: Add TaskCompleted (provides task_id + task_subject natively - GOLD for correlation), SubagentStart (agent_id + agent_type), PostToolUseFailure (capture failures). Claude Code already supports these hooks but CAM is not capturing them.
  Files: packages/hook/src/handlers/, .claude/settings.json, packages/server/src/services/event-processor.ts

- [x] Implement Correlation ID + Causation Chain
  Priority: medium
  Tags: correlation, opentelemetry, tracing
  Description: Add correlation_id and causation_id fields to the events table. Follow OpenTelemetry/Arkency pattern - propagate task context through the event chain of the same agent. Enable grouping "everything that happened for this task" in the dashboard.
  Files: packages/server/src/db/schema.sql, packages/server/src/services/event-processor.ts
