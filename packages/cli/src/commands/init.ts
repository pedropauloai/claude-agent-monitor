import { Command } from "commander";
import chalk from "chalk";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { execSync } from "node:child_process";
import { DEFAULT_SERVER_PORT } from "@cam/shared";
import { logger } from "../utils/logger.js";
import {
  claudeSettingsExist,
  readClaudeSettings,
  writeClaudeSettings,
  ensureClaudeDir,
  resolveFilePath,
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
  .option("--prd <path>", "Path to PRD file to import")
  .option("--force", "Overwrite existing hooks configuration")
  .option(
    "--parse <method>",
    "PRD parse method: structured, ai_assisted, manual",
    "structured",
  )
  .action(
    async (options: { prd?: string; force?: boolean; parse?: string }) => {
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

      // Handle PRD import (explicit --prd flag)
      if (options.prd) {
        logger.blank();
        const prdPath = resolveFilePath(options.prd);

        if (!existsSync(prdPath)) {
          logger.error(`PRD file not found: ${chalk.cyan(prdPath)}`);
          process.exit(1);
        }

        const prdContent = readFileSync(prdPath, "utf-8");
        logger.success(
          `PRD loaded: ${chalk.cyan(options.prd)} (${prdContent.length} chars)`,
        );
        logger.info(
          `Parse method: ${chalk.cyan(options.parse ?? "structured")}`,
        );

        // Try to send PRD to server for parsing
        try {
          const response = await fetch(
            `http://localhost:${DEFAULT_SERVER_PORT}/api/projects`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: extractProjectName(prdContent),
                prd_content: prdContent,
                parse_method: options.parse ?? "structured",
              }),
            },
          );

          if (response.ok) {
            const data = (await response.json()) as {
              project?: { id: string; name: string; totalTasks: number };
            };
            if (data.project) {
              logger.success(
                `Project created: ${chalk.cyan(data.project.name)}`,
              );
              logger.info(
                `Tasks extracted: ${chalk.cyan(String(data.project.totalTasks))}`,
              );
            }
          } else {
            logger.warning(
              'Server not available. PRD will be imported when you run "cam start".',
            );
            logger.info(`PRD saved for later import: ${chalk.cyan(prdPath)}`);
          }
        } catch {
          logger.warning(
            'Server not running. Start with "cam start" to import PRD.',
          );
        }
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
        // Step 1: Find or create project
        const prdPath = options.prd
          ? resolveFilePath(options.prd)
          : findPrdFile();

        if (prdPath && existsSync(prdPath)) {
          // PRD found - import it (if not already imported via --prd flag above)
          if (!options.prd) {
            try {
              const prdContent = readFileSync(prdPath, "utf-8");
              logger.success(
                `PRD found: ${chalk.cyan(prdPath)} (${prdContent.length} chars)`,
              );

              const response = await fetch(
                `http://localhost:${DEFAULT_SERVER_PORT}/api/projects`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: extractProjectName(prdContent),
                    prd_content: prdContent,
                    parse_method: options.parse ?? "structured",
                  }),
                },
              );

              if (response.ok) {
                const data = (await response.json()) as {
                  project?: {
                    id: string;
                    name: string;
                    totalTasks: number;
                  };
                };
                if (data.project) {
                  projectId = data.project.id;
                  logger.success(
                    `Project created: ${chalk.cyan(data.project.name)} (${data.project.totalTasks} tasks)`,
                  );
                }
              }
            } catch {
              logger.warning("Failed to import PRD");
            }
          } else {
            // --prd was provided, project was already created above
            // Try to get the project ID from existing projects
            try {
              const projResponse = await fetch(
                `http://localhost:${DEFAULT_SERVER_PORT}/api/projects`,
              );
              if (projResponse.ok) {
                const projData = (await projResponse.json()) as {
                  projects?: Array<{ id: string; name: string }>;
                };
                if (projData.projects && projData.projects.length > 0) {
                  projectId = projData.projects[projData.projects.length - 1].id;
                }
              }
            } catch {
              // Could not fetch project list
            }
          }
        } else if (!options.prd) {
          // No PRD - create minimal project for observability-only mode
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
                logger.success(
                  `Project created: ${chalk.cyan(data.project.name)} (no PRD)`,
                );
                logger.info(
                  "Projeto registrado sem PRD. Observability ativo!",
                );
                logger.info(
                  `Importe um PRD depois com: ${chalk.cyan("cam init --prd <path>")}`,
                );
              }
            }
          } catch {
            logger.warning("Failed to create project");
          }
        }

        // Step 2: Register working directory
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
                  prd_path: prdPath || null,
                }),
              },
            );

            if (regResponse.ok) {
              logger.success("Directory registered with CAM");
            }
          } catch {
            logger.warning("Failed to register directory");
          }

          // Step 3: Save activeProjectId to local config
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

      logger.blank();
    },
  );

function findPrdFile(): string | null {
  const candidates = ["PRD.md", "prd.md", "PRD.MD"];
  for (const name of candidates) {
    if (existsSync(name)) return name;
  }
  return null;
}

function extractProjectName(prdContent: string): string {
  // Try to extract project name from PRD heading
  const headingMatch = prdContent.match(
    /^#\s+(.+?)(?:\s*[-\u2013\u2014]\s*PRD)?$/m,
  );
  if (headingMatch) {
    return headingMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  // Try to extract from **Name** pattern
  const nameMatch = prdContent.match(
    /\*\*(?:Nome|Name)\*\*[:\s]*\*?\*?(.+?)\*?\*?\s*(?:\(|$)/m,
  );
  if (nameMatch) {
    return nameMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  // Fallback to directory name
  return basename(process.cwd());
}

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
