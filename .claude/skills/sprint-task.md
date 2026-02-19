---
name: sprint-task
description: Implement a specific PRD task by number or title
---

Implement the PRD task: $ARGUMENTS

1. Find the task in PRD.md matching the argument (by number or title keyword)
2. Read CLAUDE.md for conventions
3. Identify which packages need changes
4. If types are needed, add to @claudecam/shared first and build it
5. Implement the feature
6. Run `pnpm typecheck` to verify
7. Summarize what was done
