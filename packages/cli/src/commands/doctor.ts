import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { DEFAULT_SERVER_PORT } from "@cam/shared";
import { logger } from "../utils/logger.js";
import {
  readConfig,
  claudeSettingsExist,
  readClaudeSettings,
} from "../utils/config.js";
import {
  listConfiguredCamHooks,
  HOOK_TYPE_DESCRIPTIONS,
} from "../utils/hooks-config.js";

interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
  fix?: string;
  warning?: boolean;
}

export const doctorCommand = new Command("doctor")
  .description("Run diagnostics to verify CAM setup is working correctly")
  .action(async () => {
    const config = readConfig();
    const port = config.serverPort || DEFAULT_SERVER_PORT;

    logger.blank();
    logger.section("Claude Agent Monitor - Doctor");
    logger.blank();

    const results: CheckResult[] = [];

    // 1. Check cam-hook binary
    const camHookOk = checkBinaryAvailable("cam-hook");
    results.push({
      label: "cam-hook binary in PATH",
      ok: camHookOk,
      detail: camHookOk ? "Found in PATH" : "Not found",
      fix: "npm install -g @cam/cli",
    });

    // 2. Check .claude/settings.json exists
    const settingsExist = claudeSettingsExist();
    results.push({
      label: ".claude/settings.json exists",
      ok: settingsExist,
      detail: settingsExist ? "Found" : "Not found in current directory",
      fix: "cam init",
    });

    // 3. Check hooks are configured
    let hooksConfigured = 0;
    const expectedHookCount = Object.keys(HOOK_TYPE_DESCRIPTIONS).length;
    if (settingsExist) {
      const settings = readClaudeSettings();
      const camHooks = listConfiguredCamHooks(settings);
      hooksConfigured = camHooks.length;
    }
    results.push({
      label: "CAM hooks configured",
      ok: hooksConfigured >= expectedHookCount,
      detail: `${hooksConfigured}/${expectedHookCount} hooks`,
      fix: hooksConfigured === 0 ? "cam init" : "cam init --force",
    });

    // 4. Check server is running
    let serverOnline = false;
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      serverOnline = response.ok;
    } catch {
      // Server not running
    }
    results.push({
      label: `Server running on port ${port}`,
      ok: serverOnline,
      detail: serverOnline ? "Responding to health check" : "Not responding",
      fix: "cam start",
    });

    // 5. Test POST to server (send a test event)
    let postOk = false;
    if (serverOnline) {
      try {
        const testEvent = {
          hook: "SessionStart",
          timestamp: new Date().toISOString(),
          session_id: "cam-doctor-test",
          agent_id: "system",
          data: {
            working_directory: process.cwd(),
            hooks_configured: hooksConfigured,
            source: "cam-doctor",
          },
        };

        const response = await fetch(`http://localhost:${port}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testEvent),
        });
        postOk = response.ok;
      } catch {
        // POST failed
      }
    }
    results.push({
      label: "POST /api/events works",
      ok: postOk,
      detail: postOk
        ? "Test event sent successfully"
        : serverOnline
          ? "POST failed"
          : "Server not running (skipped)",
      fix: serverOnline ? undefined : "cam start",
    });

    // 6. Check Node.js version
    let nodeOk = false;
    let nodeVersion = "unknown";
    try {
      nodeVersion = process.version;
      const major = parseInt(nodeVersion.slice(1).split(".")[0], 10);
      nodeOk = major >= 18;
    } catch {
      // Can't determine version
    }
    results.push({
      label: "Node.js >= 18",
      ok: nodeOk,
      detail: nodeVersion,
      fix: "Install Node.js 18+ from https://nodejs.org",
    });

    // 7. Check project is registered
    let registeredOk = false;
    if (serverOnline) {
      try {
        const cwd = process.cwd();
        const response = await fetch(
          `http://localhost:${port}/api/registry/lookup?dir=${encodeURIComponent(cwd)}`,
        );
        registeredOk = response.ok;
      } catch {
        // Not registered
      }
    }
    results.push({
      label: "Project registered in CAM",
      ok: registeredOk,
      detail: registeredOk
        ? "Current directory is registered"
        : serverOnline
          ? "Not registered"
          : "Server not running (skipped)",
      fix: "cam init",
    });

    // 8. Check PRD.md exists
    const hasPrd = ["PRD.md", "prd.md", "PRD.MD"].some((f) => existsSync(f));
    results.push({
      label: "PRD.md found in project",
      ok: hasPrd,
      detail: hasPrd ? "Found" : "Not found (optional - CAM works without it)",
      fix: hasPrd ? undefined : "Optional: create a PRD.md or run 'cam init --prd <path>'",
      warning: true,
    });

    // 9. Check tmux availability (warning only, not a failure)
    const tmuxAvailable = checkBinaryAvailable("tmux");
    results.push({
      label: "tmux available for multi-agent tracking",
      ok: tmuxAvailable,
      detail: tmuxAvailable
        ? "Found in PATH"
        : "Not found (recommended for full E2E tracking)",
      fix: tmuxAvailable
        ? undefined
        : process.platform === "win32"
          ? "Install WSL + tmux for complete per-agent tracking"
          : "Install tmux for complete per-agent tracking",
      warning: true,
    });

    // Display results
    let passCount = 0;
    let failCount = 0;
    let warnCount = 0;

    for (const result of results) {
      if (result.ok) {
        const icon = chalk.green("\u2713");
        const detail = result.detail ? chalk.gray(` (${result.detail})`) : "";
        console.log(`  ${icon} ${result.label}${detail}`);
        passCount++;
      } else if (result.warning) {
        const icon = chalk.yellow("\u26A0");
        const detail = result.detail ? chalk.gray(` (${result.detail})`) : "";
        console.log(`  ${icon} ${result.label}${detail}`);
        warnCount++;
      } else {
        const icon = chalk.red("\u2717");
        const detail = result.detail ? chalk.gray(` (${result.detail})`) : "";
        console.log(`  ${icon} ${result.label}${detail}`);
        failCount++;
      }
    }

    // Show fixes for failures and warnings
    const fixableResults = results.filter((r) => !r.ok && r.fix);
    if (fixableResults.length > 0) {
      logger.blank();
      logger.section("Fixes");
      for (const result of fixableResults) {
        const color = result.warning ? chalk.gray : chalk.yellow;
        logger.item(
          `${color(result.label)}: ${chalk.cyan(result.fix)}`,
        );
      }
    }

    // Summary
    logger.blank();
    const warnText = warnCount > 0 ? `, ${warnCount} warning${warnCount > 1 ? "s" : ""}` : "";
    if (failCount === 0) {
      logger.success(`All ${passCount} checks passed${warnText}! CAM is ready to use.`);
    } else {
      logger.warning(
        `${passCount} passed, ${failCount} failed${warnText}. Fix the issues above.`,
      );
    }

    logger.blank();

    process.exit(failCount > 0 ? 1 : 0);
  });

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
