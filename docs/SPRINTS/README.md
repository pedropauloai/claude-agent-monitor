# Sprint Files

This directory contains sprint definition files in markdown format.
Each file represents one sprint with its context and tasks.

## Files

| File | Sprint | Status |
|------|--------|--------|
| `TEMPLATE.md` | Template for new sprints | - |
| `sprint-01.md` | Core Infrastructure (29 tasks) | Completed |
| `sprint-02.md` | Agent Map v1 (10 tasks) | Completed |
| `sprint-03.md` | SSE Pilar 2 (2 tasks) | Completed |
| `sprint-04.md` | Agent Map v2: Mission Floor (16 tasks) | Completed |
| `sprint-05.md` | Developer Experience (15 tasks) | Completed |
| `sprint-06.md` | True Observability (11 tasks) | Completed |
| `sprint-07.md` | Correlation Engine v2 (17 tasks) | Completed |
| `sprint-08.md` | Project-First Architecture (12 tasks) | Completed |
| `sprint-09.md` | Dashboard Experience (16 tasks) | Completed |
| `sprint-10.md` | Visual Polish (10 tasks) | Completed |
| `sprint-11.md` | Real User Polish (18 tasks) | Completed |
| `sprint-12.md` | Docs Restructure & tmux-First (11 tasks) | Planned |

## Format

Each sprint file follows the template structure:

```markdown
# Sprint X - Name

Status: planned | active | completed

---

## Context

### Motivation
Why this sprint exists.

### Current Code State
Key files and modules affected.

### Design Decisions
Architectural decisions made.

### References
Links to PRD sections, docs, and external references.

---

## Tasks

### Section Name
- [x] Completed task title
  Priority: high
  Tags: tag1, tag2
  Description: What was done.

- [ ] Planned task title
  Priority: medium
  Tags: tag1
  Description: What needs to be done.
```

## Usage

### Import tasks from a sprint file

```bash
cam sprint import docs/SPRINTS/sprint-12.md
```

This will:
1. Parse the markdown file
2. Create the sprint if it does not exist
3. Import all tasks via the server API
4. Show progress as tasks are imported

### Create a new sprint

```bash
cam sprint add "Sprint 13 - Name"
```

### List all sprints

```bash
cam sprint list
```

## Notes

- Task status is determined by the checkbox: `[x]` = completed, `[ ]` = planned
- Priority, Tags, Description, and Files are optional metadata lines indented under each task
- Section headings (`###`) group tasks into subsections within the sprint
- The sprint name comes from the top-level heading (`#`)
- The status line sets the initial sprint status
- The `## Context` section is a mini-PRD: motivation, state, decisions, references
- See `TEMPLATE.md` for the full template with examples
