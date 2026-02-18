# Sprint 12 - Docs Restructure & tmux-First

Status: active

---

## Context

### Motivation
The sprint files (`docs/SPRINTS/sprint-01.md` through `sprint-10.md`) are EMPTY - just title
and status, 2-3 lines each. All the richness of the sprints (motivation, decisions, detailed tasks)
lives ONLY inside PRD.md, a monolithic document of 2100+ lines. Additionally, the recommended
CAM setup (tmux + Claude Code Teams) is not reflected in the docs or the UX.

### Current Code State
- Sprint files (`sprint-01.md` through `sprint-10.md`) contain only title and status (2-3 lines each)
- PRD Part 3 contains ~250 lines of detailed sprint tasks (should be in sprint files)
- README Roadmap has sprint-level detail (should be simplified to milestones)
- No generic templates exist for PRD or Sprint format
- No README files in docs/, docs/PRD/, docs/SPRINTS/
- `packages/cli/src/commands/doctor.ts`: 8 current checks, missing tmux check
- Dashboard: no warning component for in-process mode

### Design Decisions
1. **PRD = vision document** (Part 1 + 2), NOT a repository of sprint details
2. **Sprint files = source of truth** for context and tasks of each sprint
3. **Template with CONTEXT**: each sprint file has a mini-PRD (motivation, state, decisions, refs)
4. **Generic templates**: do not mention CAM/dogfooding - work for any project
5. **tmux = recommended, in-process = supported**: docs and UX reflect this hierarchy
6. **Simplified roadmap**: only version milestones in README, details in sprint files

### References
- docs/SPRINTS/TEMPLATE.md - ideal sprint template
- docs/PRD/TEMPLATE.md - ideal PRD template
- packages/cli/src/commands/doctor.ts - current cam doctor code

---

## Tasks

### Section 1 - Docs Restructure (DONE)
- [x] Create ideal sprint template with CONTEXT section
  Priority: high
  Tags: docs, template
  Description: Create `docs/SPRINTS/TEMPLATE.md` with generic format including CONTEXT block.

- [x] Backfill sprint-01 through sprint-04 (historical)
  Priority: high
  Tags: docs, backfill
  Description: Populate with content from PRD Part 3. Mark tasks as `[x]` (completed).

- [x] Backfill sprint-05 through sprint-07 (detailed)
  Priority: high
  Tags: docs, backfill
  Description: Populate with rich content from PRD. Mark Sprint-07's 3 deferred tasks.

- [x] Backfill sprint-08 through sprint-10 (recent)
  Priority: high
  Tags: docs, backfill
  Description: Populate with content from PRD. Include design decisions.

- [x] Add CONTEXT section to sprint-11
  Priority: medium
  Tags: docs, backfill
  Description: Add CONTEXT block with motivation, state, and decisions from Q&A session.

- [x] Replace sprint details in PRD with summary table
  Priority: high
  Tags: docs, prd
  Description: Replace PRD Part 3 sprint details with summary table linking to sprint files.

- [x] Update PRD metadata
  Priority: low
  Tags: docs, prd
  Description: Update version to 3.1.0, date, and status to reflect completed sprints.

- [x] Fix Roadmap and feature claims in README
  Priority: high
  Tags: docs, readme
  Description: Simplify Roadmap to milestones. Correct Kanban columns. Update Multi-project.

- [x] Document tmux + Teams as recommended setup
  Priority: high
  Tags: docs, readme, tmux
  Description: Rename WSL section to "Multi-Agent Setup". Document tmux + Teams as recommended.

- [x] Create generic PRD template
  Priority: medium
  Tags: docs, template
  Description: Create `docs/PRD/TEMPLATE.md` with generic 4-part structure.

- [x] Create READMEs for docs/, PRD/, SPRINTS/
  Priority: medium
  Tags: docs, readme
  Description: Create/update READMEs with file index and usage guide.

### Section 2 - tmux-First Features
- [x] Add tmux availability check to cam doctor
  Priority: medium
  Tags: cli, doctor, tmux
  Description: Add a check in `cam doctor` that verifies if `tmux` is in PATH.
  If not found, show as warning (not error) with message: "tmux not found -
  recommended for full multi-agent tracking". On Windows, suggest WSL. This check is
  informational, not blocking.
  Files: packages/cli/src/commands/doctor.ts

- [x] Add partial tracking warning for in-process mode in dashboard
  Priority: medium
  Tags: dashboard, ux, tmux
  Description: When the dashboard detects that all agents of a session have the SAME
  session_id (indicative of in-process mode), show a discreet dismissible banner:
  "In-process mode detected - per-agent tracking limited. Use tmux + Teams for
  full E2E tracking." Banner appears once per session (localStorage flag).
  Files: packages/dashboard/src/components/shared/InProcessWarning.tsx (new)

---

## Success Metrics
- [x] All 12 sprint files have full content with CONTEXT section
- [x] PRD Part 3 reduced to summary table
- [x] README Roadmap simplified and accurate
- [x] README documents tmux + Teams as recommended setup
- [x] Generic templates created (PRD + Sprint)
- [x] `cam doctor` shows tmux status
- [x] Dashboard shows warning when in in-process mode
