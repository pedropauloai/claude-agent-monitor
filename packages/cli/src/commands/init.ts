import { Command } from "commander";
import chalk from "chalk";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { execSync } from "node:child_process";
import { DEFAULT_SERVER_PORT } from "@claudecam/shared";
import { logger } from "../utils/logger.js";
import {
  claudeSettingsExist,
  readClaudeSettings,
  writeClaudeSettings,
  ensureClaudeDir,
  readConfig,
  writeConfig,
} from "../utils/config.js";
import {
  generateHooksConfig,
  mergeHooks,
  HOOK_TYPE_DESCRIPTIONS,
  type HookEntry,
  isCamHook,
} from "../utils/hooks-config.js";

export const initCommand = new Command("init")
  .description("Initialize Claude Agent Monitor hooks in the current project")
  .option("--force", "Overwrite existing hooks configuration")
  .action(
    async (options: { force?: boolean }) => {
      logger.blank();
      logger.section("Claude Agent Monitor - Initializing...");
      logger.blank();

      // Check if cam-hook binary is available in PATH
      const camHookAvailable = checkCamHookAvailable();
      if (!camHookAvailable) {
        logger.warning(
          `${chalk.cyan("cam-hook")} not found in PATH. Hooks may not work.`,
        );
        logger.info(
          `Install globally: ${chalk.cyan("npm install -g claude-agent-monitor")}`,
        );
        logger.blank();
      }

      const settingsExist = claudeSettingsExist();
      const camHooks = generateHooksConfig();
      const hookCount = Object.keys(HOOK_TYPE_DESCRIPTIONS).length;

      if (settingsExist && !options.force) {
        // Merge mode: preserve existing hooks, add/update CAM hooks
        const existing = readClaudeSettings();
        const existingHooks = (existing.hooks ?? {}) as Record<
          string,
          HookEntry[]
        >;

        // Count user hooks that will be preserved
        let preservedCount = 0;
        for (const entries of Object.values(existingHooks)) {
          preservedCount += entries.filter((e) => !isCamHook(e)).length;
        }

        const merged = mergeHooks(existing, camHooks);
        writeClaudeSettings(merged);

        logger.success(
          `Merged hooks into existing ${chalk.cyan(".claude/settings.json")}`,
        );
        if (preservedCount > 0) {
          logger.info(
            `Preserved ${chalk.yellow(String(preservedCount))} existing user hook(s)`,
          );
        }
      } else {
        // Create mode: create new settings with hooks
        ensureClaudeDir();
        const settings = { hooks: camHooks };
        writeClaudeSettings(settings);

        if (settingsExist && options.force) {
          logger.success(
            `Overwrote ${chalk.cyan(".claude/settings.json")} (--force)`,
          );
        } else {
          logger.success(`Created ${chalk.cyan(".claude/settings.json")}`);
        }
      }

      // Display configured hooks summary
      logger.blank();
      logger.section(`Configured ${hookCount} hooks:`);
      for (const [hookType, description] of Object.entries(
        HOOK_TYPE_DESCRIPTIONS,
      )) {
        logger.item(
          `${chalk.white(hookType)} ${chalk.gray(`(${description})`)}`,
        );
      }

      // Scaffold docs structure (PRD + Sprints)
      logger.blank();
      logger.section("Docs Structure");
      const docsResult = scaffoldDocs();
      if (docsResult.created.length > 0) {
        for (const path of docsResult.created) {
          logger.success(`Created ${chalk.cyan(path)}`);
        }
      } else {
        logger.info("Docs structure already exists");
      }

      // === Project Registration (Sprint 8: Project-First Architecture) ===
      logger.blank();
      logger.section("Project Registration");

      let projectId: string | null = null;
      let serverAvailable = false;

      // Check if server is running
      try {
        const healthRes = await fetch(
          `http://localhost:${DEFAULT_SERVER_PORT}/api/health`,
        );
        serverAvailable = healthRes.ok;
      } catch {
        serverAvailable = false;
      }

      if (!serverAvailable) {
        logger.info(
          `Server not running. Start with ${chalk.cyan("'cam start'")} then re-run ${chalk.cyan("'cam init'")} to register this project.`,
        );
      } else {
        // Check if project already registered for this directory
        try {
          const cwd = process.cwd();
          const lookupRes = await fetch(
            `http://localhost:${DEFAULT_SERVER_PORT}/api/registry/lookup?dir=${encodeURIComponent(cwd)}`,
          );
          if (lookupRes.ok) {
            const lookupData = (await lookupRes.json()) as {
              project_id?: string;
              project?: { id: string; name: string };
            };
            if (lookupData.project_id) {
              projectId = lookupData.project_id;
              const name = lookupData.project?.name ?? projectId.slice(0, 8);
              logger.success(`Project already registered: ${chalk.cyan(name)}`);
            }
          }
        } catch {
          // Registry lookup failed, will try to create
        }

        // Create project only if not already registered
        if (!projectId) {
          try {
            const projName = basename(process.cwd());
            const response = await fetch(
              `http://localhost:${DEFAULT_SERVER_PORT}/api/projects`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: projName, prd_content: "" }),
              },
            );

            if (response.ok) {
              const data = (await response.json()) as {
                project?: { id: string; name: string };
              };
              if (data.project) {
                projectId = data.project.id;
                logger.success(`Project created: ${chalk.cyan(data.project.name)}`);
              }
            }
          } catch {
            logger.warning("Failed to create project");
          }

          // Register working directory for new project
          if (projectId) {
            try {
              const regResponse = await fetch(
                `http://localhost:${DEFAULT_SERVER_PORT}/api/registry`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    working_directory: process.cwd(),
                    project_id: projectId,
                    prd_path: null,
                  }),
                },
              );

              if (regResponse.ok) {
                logger.success("Directory registered with CAM");
              }
            } catch {
              logger.warning("Failed to register directory");
            }
          }
        }

        // Save activeProjectId to local config (always, whether new or existing)
        if (projectId) {
          try {
            const config = readConfig();
            writeConfig({ ...config, activeProjectId: projectId });
            logger.success("Project ID saved to config");
          } catch {
            // Config save failed silently
          }
        }
      }

      // Test server connectivity
      logger.blank();
      try {
        const response = await fetch(
          `http://localhost:${DEFAULT_SERVER_PORT}/api/sessions`,
        );
        if (response.ok) {
          logger.success(
            `Server is running at ${chalk.cyan(`http://localhost:${DEFAULT_SERVER_PORT}`)}`,
          );
        }
      } catch {
        if (!serverAvailable) {
          logger.info(
            `Run ${chalk.cyan("'cam start'")} to launch the monitoring server.`,
          );
        }
      }

      // Next steps
      logger.blank();
      logger.section("Next steps");
      logger.info(`Create a PRD:    copy ${chalk.cyan("docs/PRD/TEMPLATE.md")} to ${chalk.cyan("PRD.md")} (optional)`);
      logger.info(`Create a sprint: copy ${chalk.cyan("docs/SPRINTS/TEMPLATE.md")} to ${chalk.cyan("sprint-01.md")}`);
      logger.info(`Import tasks:    ${chalk.cyan("cam sprint import docs/SPRINTS/sprint-01.md")}`);
      logger.blank();
    },
  );

function checkCamHookAvailable(): boolean {
  try {
    const cmd =
      process.platform === "win32" ? "where cam-hook" : "which cam-hook";
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const PRD_TEMPLATE_CONTENT = `# [Project Name] - PRD (Product Requirements Document)

> [Short phrase describing the project in one line]

**Version**: 1.0.0
**Date**: YYYY-MM-DD
**Status**: Draft | Active | Completed
**License**: MIT | Apache-2.0 | ...

---

# PART 1 - PRD (WHAT to build)

---

## 1. Product Vision

### Name
**[Project Name]**

### Value Proposition
What this product does and why it matters. What problem it solves and for whom.
Describe the value in 2-3 paragraphs.

### Target Audience
- Persona 1: description and primary need
- Persona 2: description and primary need

### Differentiator
- What makes this project unique
- Competitive advantages
- Why someone would choose this vs alternatives

---

## 2. Problem

### Current Situation
How things work today without this product.

### Pain Points
| Pain Point | Severity | Frequency |
|------------|----------|-----------|
| Pain point description 1 | High/Medium/Low | Frequency |
| Pain point description 2 | High/Medium/Low | Frequency |

### Opportunity
Why now is the right time. What technology or market shift enables this solution.

---

# PART 2 - SPEC (HOW to build)

---

## 3. Technical Architecture

### Overview
ASCII diagram or description of the high-level architecture.

\`\`\`
[Component A] --> [Component B] --> [Component C]
\`\`\`

### Data Flow
Describe how data flows between components.

### Technology Stack
| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | React / Vue / etc | Reason |
| Backend | Node.js / Python / etc | Reason |
| Database | SQLite / Postgres / etc | Reason |

---

## 4. Data Model

Describe the main entities and their relationships.

### Main Entity
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Unique identifier |
| name | TEXT | Entity name |
| status | TEXT | Current state |
| created_at | TEXT (ISO8601) | Creation date |

---

## 5. API / Interfaces

### Endpoints (if applicable)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/resource | List resources |
| POST | /api/resource | Create resource |

### CLI Commands (if applicable)
\`\`\`bash
project init         # Initialize the project
project start        # Start the server
project status       # Show status
\`\`\`

---

## 6. UI / Components

Describe the main visual components, screens, and navigation flows.

### Main Screen
- Layout description
- Visible components
- User interactions

---

## 7. Implementation Details

Additional project-specific sections. Examples:
- Security and authentication
- Performance and caching
- External service integration
- Plugin/extension system

---

# PART 3 - EXECUTION (WHEN to build)

> **Note**: Detailed task tracking and context for each sprint lives in the sprint files.
> Use the sprint files for complete tasks and context.

---

## 8. MVP

Description of what constitutes the MVP (Minimum Viable Product).

| Sprint | Name | Tasks | Status | Sprint File |
|--------|------|-------|--------|-------------|
| 1 | Sprint Name | N | Planned | [sprint-01.md](../SPRINTS/sprint-01.md) |
| 2 | Sprint Name | N | Planned | [sprint-02.md](../SPRINTS/sprint-02.md) |

---

## 9. Backlog

Features planned for after the MVP:
- Future feature 1
- Future feature 2
- Future feature 3

---

# PART 4 - REFERENCE

---

## 10. File Structure

\`\`\`
project/
  docs/
    PRD/
      PRD.md            # This document
    SPRINTS/
      sprint-01.md      # Sprint files with tasks
  src/
    ...                 # Source code
  README.md
  package.json
\`\`\`

---

## Template Notes

This template follows the **4-part structure**:

| Part | Content | Question |
|------|---------|----------|
| **PART 1 - PRD** | Vision + Problem | WHAT to build and WHY? |
| **PART 2 - SPEC** | Architecture + Details | HOW to build it? |
| **PART 3 - EXECUTION** | Sprints + Backlog | WHEN to build it? |
| **PART 4 - REFERENCE** | File structure + Glossary | WHERE to find things? |

**Principles**:
- The PRD is a VISION document, not a detailed execution tracker
- Sprint files (\`docs/SPRINTS/sprint-XX.md\`) contain tasks and context per sprint
- Part 3 is an INDEX to the sprint files, not a duplication of their content
- Number sections for easy cross-referencing ("see PRD Section 3.2")
`;

const PRD_README_CONTENT = `# PRD Documentation

This directory contains the Product Requirements Document (PRD) and its template.

## Files

| File | Description |
|------|-------------|
| \`PRD.md\` | The actual PRD for this project |
| \`TEMPLATE.md\` | Generic PRD template for new projects |

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

1. Copy \`TEMPLATE.md\` to \`PRD.md\` in this directory
2. Fill in each section with your project details
3. Create sprint files in \`docs/SPRINTS/\` following the sprint template
4. Reference sprint files from Part 3 instead of duplicating task details

### With CAM

\`\`\`bash
cam init --prd docs/PRD/PRD.md
\`\`\`

CAM will parse the PRD and create the project in the database.

## Principles

- The PRD is a **vision document**, not a task tracker
- Sprint files (\`docs/SPRINTS/\`) hold the detailed tasks and context per sprint
- Part 3 is an **index** pointing to sprint files, not a duplication of their content
- Number sections for easy cross-referencing (e.g., "see PRD Section 3.2")
`;

const SPRINT_TEMPLATE_CONTENT = `# Sprint X - Sprint Name

Status: planned | active | completed

---

## Context

### Motivation
Why this sprint exists. What problem was discovered or what need arose.
What is the high-level objective and how it connects to the product vision.

### Current Code State
Which modules/files are relevant to this sprint. What is the current architecture
that will be modified. What works and what does not.

### Design Decisions
Decisions already made that affect the implementation. Trade-offs considered.
Approaches discarded and why.

### References
- PRD Section X.Y - Name of the relevant section
- Internal docs or related architecture decisions
- External links (repos, articles, issues)

---

## Tasks

### Section 1 - Section Name
- [ ] Task title
  Priority: high | medium | low
  Tags: tag1, tag2
  Description: Detailed description with clear acceptance criteria.
  Files: packages/server/src/file.ts, packages/dashboard/src/components/File.tsx

- [x] Completed task title
  Priority: medium
  Tags: tag1
  Description: What was done and how.

### Section 2 - Section Name
- [ ] Another task
  Priority: medium
  Tags: tag1
  Description: Detailed description.

---

## Template Notes

- Sprint status: \`planned\` (not started), \`active\` (in progress), \`completed\` (finished)
- Checkbox: \`[x]\` = completed, \`[ ]\` = planned/pending
- Priority, Tags, Description, Files are optional (indented under the task)
- Sections (\`### Section N\`) group tasks by area/topic
- The CONTEXT block is the differentiator: it is a mini-PRD per sprint
- To import: \`cam sprint import docs/SPRINTS/sprint-XX.md\`
`;

const SPRINT_README_CONTENT = `# Sprint Files

This directory contains sprint definition files in markdown format.
Each file represents one sprint with its context and tasks.

## Format

Each sprint file follows the template structure. See \`TEMPLATE.md\` for the full format.

Key elements:
- **Title**: \`# Sprint X - Name\` (H1 heading)
- **Status**: \`planned\`, \`active\`, or \`completed\`
- **Context**: Mini-PRD with motivation, code state, decisions, references
- **Tasks**: Checkbox list grouped by sections

## Usage

### Create a new sprint
Copy \`TEMPLATE.md\` to \`sprint-XX.md\` and fill in the sections.

### Import tasks from a sprint file
\`\`\`bash
cam sprint import docs/SPRINTS/sprint-01.md
\`\`\`

### List all sprints
\`\`\`bash
cam sprint list
\`\`\`

### Check sprint progress
\`\`\`bash
cam sprint status
\`\`\`

## Task Format

\`\`\`markdown
- [ ] Task title
  Priority: high | medium | low
  Tags: tag1, tag2
  Description: Detailed description.
  Files: path/to/file1.ts, path/to/file2.ts
\`\`\`

- \`[x]\` = completed, \`[ ]\` = planned/pending
- All metadata lines (Priority, Tags, Description, Files) are optional
`;

function scaffoldDocs(): { created: string[] } {
  const created: string[] = [];
  const docsDir = join(process.cwd(), "docs");
  const prdDir = join(docsDir, "PRD");
  const sprintsDir = join(docsDir, "SPRINTS");

  // Create docs/PRD/ directory if it doesn't exist
  if (!existsSync(prdDir)) {
    mkdirSync(prdDir, { recursive: true });
    created.push("docs/PRD/");
  }

  // Write PRD TEMPLATE.md if it doesn't exist
  const prdTemplatePath = join(prdDir, "TEMPLATE.md");
  if (!existsSync(prdTemplatePath)) {
    writeFileSync(prdTemplatePath, PRD_TEMPLATE_CONTENT, "utf-8");
    created.push("docs/PRD/TEMPLATE.md");
  }

  // Write PRD README.md if it doesn't exist
  const prdReadmePath = join(prdDir, "README.md");
  if (!existsSync(prdReadmePath)) {
    writeFileSync(prdReadmePath, PRD_README_CONTENT, "utf-8");
    created.push("docs/PRD/README.md");
  }

  // Create docs/SPRINTS/ directory if it doesn't exist
  if (!existsSync(sprintsDir)) {
    mkdirSync(sprintsDir, { recursive: true });
    created.push("docs/SPRINTS/");
  }

  // Write Sprint TEMPLATE.md if it doesn't exist
  const sprintTemplatePath = join(sprintsDir, "TEMPLATE.md");
  if (!existsSync(sprintTemplatePath)) {
    writeFileSync(sprintTemplatePath, SPRINT_TEMPLATE_CONTENT, "utf-8");
    created.push("docs/SPRINTS/TEMPLATE.md");
  }

  // Write Sprint README.md if it doesn't exist
  const sprintReadmePath = join(sprintsDir, "README.md");
  if (!existsSync(sprintReadmePath)) {
    writeFileSync(sprintReadmePath, SPRINT_README_CONTENT, "utf-8");
    created.push("docs/SPRINTS/README.md");
  }

  return { created };
}
