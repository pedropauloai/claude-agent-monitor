# CAM Documentation

Project documentation organized by type.

## Structure

```
docs/
  PRD/
    PRD.md              # Product Requirements Document (vision + spec)
    TEMPLATE.md         # Generic PRD template for new projects
    README.md           # PRD format guide
  SPRINTS/
    TEMPLATE.md         # Generic sprint template
    sprint-01.md        # Sprint 1 - Core Infrastructure
    ...                 # One file per sprint
    sprint-12.md        # Sprint 12 - Docs Restructure & tmux-First
    README.md           # Sprint format guide
```

## Workflow

1. **PRD** defines the vision (WHAT and WHY) and spec (HOW)
2. **Sprint files** define execution (WHEN) with context and tasks
3. **CAM database** is the live source of truth for task status
4. Sprint files can be imported: `cam sprint import docs/SPRINTS/sprint-XX.md`

## Templates

Both `PRD/TEMPLATE.md` and `SPRINTS/TEMPLATE.md` are generic templates
ready to use in any project. Copy them to your project and fill in the details.
