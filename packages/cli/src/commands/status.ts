import { Command } from "commander";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { DEFAULT_SERVER_PORT } from "@cam/shared";
import { logger } from "../utils/logger.js";
import {
  readConfig,
  claudeSettingsExist,
  readClaudeSettings,
} from "../utils/config.js";
import { listConfiguredCamHooks } from "../utils/hooks-config.js";

interface SessionData {
  id: string;
  startedAt: string;
  status: string;
  agentCount: number;
  eventCount: number;
}

interface SessionsResponse {
  sessions: SessionData[];
}

interface HealthResponse {
  status: string;
  timestamp: string;
  connections: number;
}

export const statusCommand = new Command("status")
  .description("Show Claude Agent Monitor server status and diagnostics")
  .action(async () => {
    const config = readConfig();
    const port = config.serverPort || DEFAULT_SERVER_PORT;

    logger.blank();
    logger.section("Claude Agent Monitor - Status");
    logger.blank();

    // 1. Server status
    let serverOnline = false;
    let sseConnections = 0;
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      if (response.ok) {
        serverOnline = true;
        const health = (await response.json()) as HealthResponse;
        sseConnections = health.connections;
      }
    } catch {
      // Server not running
    }

    logger.keyValue(
      "Server",
      serverOnline
        ? chalk.green("Online") + chalk.gray(` (port ${port})`)
        : chalk.red("Offline"),
    );

    if (serverOnline) {
      logger.keyValue("SSE Connections", String(sseConnections));
    }

    // 2. Sessions info
    if (serverOnline) {
      try {
        const response = await fetch(`http://localhost:${port}/api/sessions`);
        if (response.ok) {
          const data = (await response.json()) as SessionsResponse;
          const activeSessions = data.sessions.filter(
            (s) => s.status === "active",
          );
          const totalEvents = data.sessions.reduce(
            (sum, s) => sum + s.eventCount,
            0,
          );
          const totalAgents = data.sessions.reduce(
            (sum, s) => sum + s.agentCount,
            0,
          );

          logger.blank();
          logger.section("Sessions");
          logger.keyValue(
            "Active",
            chalk.yellow(String(activeSessions.length)),
          );
          logger.keyValue("Total", String(data.sessions.length));
          logger.keyValue("Total Events", String(totalEvents));
          logger.keyValue("Total Agents", String(totalAgents));

          if (activeSessions.length > 0) {
            logger.blank();
            logger.section("Active Sessions");
            for (const session of activeSessions) {
              const elapsed = getElapsed(session.startedAt);
              logger.item(
                `${chalk.cyan(session.id.slice(0, 8))} - ` +
                  `${elapsed} ago, ${session.agentCount} agents, ${session.eventCount} events`,
              );
            }
          }
        }
      } catch {
        logger.warning("Failed to fetch session data");
      }
    }

    // 3. Registered Projects
    if (serverOnline) {
      try {
        const response = await fetch(
          `http://localhost:${port}/api/registry`,
        );
        if (response.ok) {
          const data = (await response.json()) as {
            registrations: Array<{
              working_directory: string;
              project_id: string;
              project_name: string;
              project_status: string;
              hooks_installed: number;
            }>;
          };

          logger.blank();
          logger.section("Registered Projects");

          if (data.registrations.length === 0) {
            logger.info(
              "No projects registered. Run " +
                chalk.cyan("'cam init'") +
                " in a project directory.",
            );
          } else {
            for (const reg of data.registrations) {
              const hookIcon = reg.hooks_installed
                ? chalk.green("\u2713")
                : chalk.yellow("\u25CB");
              const statusColor =
                reg.project_status === "active" ? chalk.green : chalk.gray;
              const dirName =
                reg.working_directory.split("/").pop() ||
                reg.working_directory.split("\\").pop() ||
                reg.working_directory;
              logger.item(
                `${hookIcon} ${chalk.cyan(reg.project_name || dirName)} ` +
                  `${statusColor(`(${reg.project_status})`)} ` +
                  chalk.gray(`[${dirName}]`),
              );
            }
            logger.keyValue("Total", String(data.registrations.length));
          }
        }
      } catch {
        logger.warning("Failed to fetch registered projects");
      }
    }

    // 4. Hooks configuration check
    logger.blank();
    logger.section("Hooks");
    if (claudeSettingsExist()) {
      const settings = readClaudeSettings();
      const camHooks = listConfiguredCamHooks(settings);
      if (camHooks.length > 0) {
        logger.keyValue("Settings", chalk.green("Configured"));
        logger.keyValue("CAM Hooks", chalk.green(String(camHooks.length)));
        for (const hook of camHooks) {
          logger.item(
            `${chalk.white(hook.hookType)} ${chalk.gray(hook.command)}`,
          );
        }
      } else {
        logger.keyValue("Settings", chalk.yellow("Exists but no CAM hooks"));
        logger.info(`Run ${chalk.cyan("'cam init'")} to configure hooks.`);
      }
    } else {
      logger.keyValue("Settings", chalk.red("Not configured"));
      logger.info(
        `Run ${chalk.cyan("'cam init'")} to create .claude/settings.json`,
      );
    }

    // 5. cam-hook binary check
    logger.blank();
    logger.section("Binary");
    const camHookAvailable = checkBinaryAvailable("cam-hook");
    logger.keyValue(
      "cam-hook",
      camHookAvailable ? chalk.green("Available") : chalk.red("Not in PATH"),
    );

    if (!camHookAvailable) {
      logger.info(`Install: ${chalk.cyan("npm install -g @cam/cli")}`);
    }

    // 6. Quick health summary
    logger.blank();
    logger.section("Health");
    const checks = [
      { label: "Server running", ok: serverOnline },
      {
        label: "Hooks configured",
        ok:
          claudeSettingsExist() &&
          listConfiguredCamHooks(readClaudeSettings()).length > 0,
      },
      { label: "cam-hook in PATH", ok: camHookAvailable },
    ];

    for (const check of checks) {
      const icon = check.ok ? chalk.green("\u2713") : chalk.red("\u2717");
      console.log(`  ${icon} ${check.label}`);
    }

    const allOk = checks.every((c) => c.ok);
    if (!allOk) {
      logger.blank();
      if (!serverOnline) {
        logger.info(`Start server: ${chalk.cyan("cam start")}`);
      }
    }

    logger.blank();
  });

function getElapsed(isoTimestamp: string): string {
  const start = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diffMs = now - start;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function checkBinaryAvailable(name: string): boolean {
  try {
    const cmd =
      process.platform === "win32" ? `where ${name}` : `which ${name}`;
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
