import { Command } from 'commander';
import chalk from 'chalk';
import { DEFAULT_SERVER_PORT } from '@claudecam/shared';
import { logger } from '../utils/logger.js';
import {
  claudeSettingsExist,
  readClaudeSettings,
  writeClaudeSettings,
} from '../utils/config.js';
import {
  listConfiguredCamHooks,
  removeCamHooks,
  HOOK_TYPE_DESCRIPTIONS,
} from '../utils/hooks-config.js';

export const hooksCommand = new Command('hooks')
  .description('Manage Claude Agent Monitor hooks')
  .option('--list', 'List configured CAM hooks')
  .option('--remove', 'Remove CAM hooks (preserves other hooks)')
  .option('--test', 'Send a test event to the server')
  .action(async (options: { list?: boolean; remove?: boolean; test?: boolean }) => {
    // Default to --list if no option specified
    if (!options.list && !options.remove && !options.test) {
      options.list = true;
    }

    logger.blank();

    if (options.list) {
      await listHooks();
    }

    if (options.remove) {
      await removeHooks();
    }

    if (options.test) {
      await testHook();
    }

    logger.blank();
  });

async function listHooks(): Promise<void> {
  logger.section('Claude Agent Monitor - Hooks');
  logger.blank();

  if (!claudeSettingsExist()) {
    logger.warning('No .claude/settings.json found.');
    logger.info(`Run ${chalk.cyan('cam init')} to configure hooks.`);
    return;
  }

  const settings = readClaudeSettings();
  const camHooks = listConfiguredCamHooks(settings);

  if (camHooks.length === 0) {
    logger.info('No CAM hooks configured.');
    logger.info(`Run ${chalk.cyan('cam init')} to configure hooks.`);
    return;
  }

  logger.info(`Found ${chalk.cyan(String(camHooks.length))} CAM hook(s):`);
  logger.blank();

  for (const hook of camHooks) {
    const description = HOOK_TYPE_DESCRIPTIONS[hook.hookType] ?? '';
    logger.item(
      `${chalk.white(hook.hookType)} ${chalk.gray(`- ${description}`)}`,
    );
    logger.info(`  Command: ${chalk.gray(hook.command)}`);
  }
}

async function removeHooks(): Promise<void> {
  logger.section('Removing CAM hooks...');
  logger.blank();

  if (!claudeSettingsExist()) {
    logger.info('No .claude/settings.json found. Nothing to remove.');
    return;
  }

  const settings = readClaudeSettings();
  const camHooks = listConfiguredCamHooks(settings);

  if (camHooks.length === 0) {
    logger.info('No CAM hooks found. Nothing to remove.');
    return;
  }

  const cleaned = removeCamHooks(settings);
  writeClaudeSettings(cleaned);

  logger.success(`Removed ${chalk.cyan(String(camHooks.length))} CAM hook(s)`);
  logger.info('Other hooks have been preserved.');
}

async function testHook(): Promise<void> {
  logger.section('Sending test event...');
  logger.blank();

  const port = DEFAULT_SERVER_PORT;

  try {
    const testEvent = {
      hook: 'Notification',
      timestamp: new Date().toISOString(),
      session_id: 'test-session',
      agent_id: 'test-agent',
      data: {
        message: 'Test event from CAM CLI',
        level: 'info',
      },
    };

    const response = await fetch(`http://localhost:${port}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent),
    });

    if (response.ok) {
      const data = (await response.json()) as { ok: boolean; event_id?: string };
      logger.success(`Test event sent successfully`);
      if (data.event_id) {
        logger.info(`Event ID: ${chalk.cyan(data.event_id)}`);
      }
    } else {
      logger.error(`Server responded with status ${response.status}`);
    }
  } catch {
    logger.error('Server is not running.');
    logger.info(`Start with: ${chalk.cyan('cam start')}`);
  }
}
