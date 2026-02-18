# PRD Documentation

This directory contains the Product Requirements Document (PRD) and its template.

## Files

| File | Description |
|------|-------------|
| `PRD.md` | The actual PRD for this project |
| `TEMPLATE.md` | Generic PRD template for new projects |

## Structure

The PRD follows a 4-part structure:

| Part | Content | Question it answers |
|------|---------|-------------------|
| **PART 1 - PRD** | Vision + Problem | WHAT to build and WHY? |
| **PART 2 - SPEC** | Architecture + Details | HOW to build it? |
| **PART 3 - EXECUTION** | Sprints + Backlog | WHEN to build it? |
| **PART 4 - REFERENCE** | File structure + Glossary | WHERE to find things? |

## How to Use

### For a new project

1. Copy `TEMPLATE.md` to your project as `docs/PRD/PRD.md`
2. Fill in each section with your project details
3. Create sprint files in `docs/SPRINTS/` following the sprint template
4. Reference sprint files from Part 3 instead of duplicating task details

### With CAM

```bash
cam init --prd docs/PRD/PRD.md
```

CAM will parse the PRD and create sprints and tasks in the database automatically.

## Principles

- The PRD is a **vision document**, not a task tracker
- Sprint files (`docs/SPRINTS/`) hold the detailed tasks and context per sprint
- Part 3 is an **index** pointing to sprint files, not a duplication of their content
- Number sections for easy cross-referencing (e.g., "see PRD Section 3.2")
