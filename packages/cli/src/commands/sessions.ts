import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { DEFAULT_SERVER_PORT } from '@claudecam/shared';
import { logger } from '../utils/logger.js';
import { readConfig } from '../utils/config.js';

interface SessionData {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  agentCount: number;
  eventCount: number;
  workingDirectory: string;
}

interface SessionsResponse {
  sessions: SessionData[];
}

export const sessionsCommand = new Command('sessions')
  .description('List previous monitoring sessions')
  .option('--clear', 'Clear all session history')
  .option('-l, --limit <count>', 'Number of sessions to show', '10')
  .action(async (options: { clear?: boolean; limit: string }) => {
    const config = readConfig();
    const port = config.serverPort || DEFAULT_SERVER_PORT;

    logger.blank();

    if (options.clear) {
      const spinner = ora('Clearing session history...').start();

      try {
        const listResponse = await fetch(
          `http://localhost:${port}/api/sessions`,
        );

        if (!listResponse.ok) {
          spinner.fail('Failed to fetch sessions');
          process.exit(1);
        }

        const data = (await listResponse.json()) as SessionsResponse;

        let cleared = 0;
        for (const session of data.sessions) {
          try {
            await fetch(`http://localhost:${port}/api/sessions/${session.id}`, {
              method: 'DELETE',
            });
            cleared++;
          } catch {
            // Skip failed deletions
          }
        }

        spinner.succeed(`Cleared ${cleared} session(s)`);
      } catch {
        spinner.fail('Server not running. Cannot clear sessions.');
      }

      logger.blank();
      return;
    }

    logger.section('Claude Agent Monitor - Sessions');
    logger.blank();

    try {
      const limit = parseInt(options.limit, 10) || 10;
      const response = await fetch(
        `http://localhost:${port}/api/sessions?limit=${limit}`,
      );

      if (!response.ok) {
        logger.error(`Server responded with status ${response.status}`);
        process.exit(1);
      }

      const data = (await response.json()) as SessionsResponse;

      if (data.sessions.length === 0) {
        logger.info('No sessions found.');
        logger.blank();
        return;
      }

      for (const session of data.sessions) {
        const statusColor =
          session.status === 'active'
            ? chalk.green
            : session.status === 'error'
              ? chalk.red
              : chalk.gray;

        const startDate = new Date(session.startedAt);
        const dateStr = startDate.toLocaleDateString();
        const timeStr = startDate.toLocaleTimeString();

        let duration = '';
        if (session.endedAt) {
          const endDate = new Date(session.endedAt);
          const diffMs = endDate.getTime() - startDate.getTime();
          duration = formatDuration(diffMs);
        } else if (session.status === 'active') {
          duration = chalk.green('running');
        }

        logger.keyValue('  Session', chalk.cyan(session.id.slice(0, 8)));
        logger.keyValue('  Status', statusColor(session.status));
        logger.keyValue('  Date', `${dateStr} ${timeStr}`);
        if (duration) {
          logger.keyValue('  Duration', duration);
        }
        logger.keyValue('  Agents', String(session.agentCount));
        logger.keyValue('  Events', String(session.eventCount));
        logger.blank();
      }

      logger.info(
        chalk.gray(`Showing ${data.sessions.length} session(s). Use --limit to see more.`),
      );
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
