import { Command } from 'commander';
import chalk from 'chalk';
import { DEFAULT_SERVER_PORT } from '@claudecam/shared';
import { logger } from '../utils/logger.js';
import { readConfig } from '../utils/config.js';

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  complexity?: number;
  assignedAgent?: string;
  sprintId?: string;
}

interface TasksSummary {
  total: number;
  backlog: number;
  planned: number;
  pending: number;
  in_progress: number;
  in_review: number;
  completed: number;
  blocked: number;
  deferred: number;
}

interface TasksResponse {
  tasks: TaskData[];
  summary: TasksSummary;
}

interface SprintData {
  id: string;
  name: string;
  status: string;
}

interface SprintsResponse {
  sprints: SprintData[];
}

function getApiBase(): string {
  const config = readConfig();
  const port = config.serverPort || DEFAULT_SERVER_PORT;
  return `http://localhost:${port}`;
}

function requireActiveProject(): string {
  const config = readConfig();
  if (!config.activeProjectId) {
    logger.error('No active project.');
    logger.info(`Run: ${chalk.cyan('cam project show <id>')} to set the active project.`);
    logger.blank();
    process.exit(1);
  }
  return config.activeProjectId;
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green(status);
    case 'in_progress':
      return chalk.yellow(status);
    case 'in_review':
      return chalk.cyan(status);
    case 'blocked':
      return chalk.red(status);
    case 'planned':
      return chalk.blue(status);
    case 'pending':
    case 'backlog':
    case 'deferred':
    default:
      return chalk.gray(status);
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return chalk.red(priority);
    case 'high':
      return chalk.yellow(priority);
    case 'medium':
      return chalk.white(priority);
    case 'low':
      return chalk.gray(priority);
    default:
      return chalk.gray(priority);
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export const tasksCommand = new Command('tasks')
  .description('List tasks for the active project')
  .option('--all', 'List all tasks (not just active sprint)')
  .option('--status <status>', 'Filter by status')
  .option('--agent <name>', 'Filter by assigned agent')
  .option('--blocked', 'Show only blocked tasks')
  .option('--priority <priority>', 'Filter by priority')
  .action(
    async (options: {
      all?: boolean;
      status?: string;
      agent?: string;
      blocked?: boolean;
      priority?: string;
    }) => {
      const projectId = requireActiveProject();

      logger.blank();

      try {
        // Build query params
        const params = new URLSearchParams();

        if (options.blocked) {
          params.set('status', 'blocked');
        } else if (options.status) {
          params.set('status', options.status);
        }

        if (options.agent) {
          params.set('agent', options.agent);
        }

        if (options.priority) {
          params.set('priority', options.priority);
        }

        // If not --all, find active sprint and filter by it
        if (!options.all && !options.status && !options.blocked) {
          const sprintsResponse = await fetch(
            `${getApiBase()}/api/projects/${projectId}/sprints`,
          );
          if (sprintsResponse.ok) {
            const sprintsData = (await sprintsResponse.json()) as SprintsResponse;
            const activeSprint = sprintsData.sprints.find((s) => s.status === 'active');
            if (activeSprint) {
              params.set('sprint_id', activeSprint.id);
              logger.section(`Tasks - Sprint: ${activeSprint.name}`);
            } else {
              logger.section('Tasks (no active sprint, showing all)');
            }
          } else {
            logger.section('Tasks');
          }
        } else {
          const label = options.blocked
            ? 'Blocked Tasks'
            : options.status
              ? `Tasks (status: ${options.status})`
              : options.agent
                ? `Tasks (agent: ${options.agent})`
                : 'All Tasks';
          logger.section(label);
        }

        logger.blank();

        const queryString = params.toString();
        const url = `${getApiBase()}/api/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            logger.error('Active project not found on server.');
          } else {
            logger.error(`Server responded with status ${response.status}`);
          }
          logger.blank();
          process.exit(1);
        }

        const data = (await response.json()) as TasksResponse;

        if (data.tasks.length === 0) {
          logger.info('No tasks found matching the filters.');
          logger.blank();
          return;
        }

        // Render table header
        const titleWidth = 40;
        const statusWidth = 14;
        const priorityWidth = 10;
        const agentWidth = 16;

        const header = [
          chalk.bold('Title'.padEnd(titleWidth)),
          chalk.bold('Status'.padEnd(statusWidth)),
          chalk.bold('Priority'.padEnd(priorityWidth)),
          chalk.bold('Agent'.padEnd(agentWidth)),
        ].join('  ');

        logger.info(header);
        logger.info(chalk.gray('-'.repeat(titleWidth + statusWidth + priorityWidth + agentWidth + 6)));

        for (const task of data.tasks) {
          const title = truncate(task.title, titleWidth).padEnd(titleWidth);
          const status = statusColor(task.status.padEnd(statusWidth));
          const priority = priorityColor(task.priority.padEnd(priorityWidth));
          const agent = (task.assignedAgent ?? chalk.gray('-')).toString().padEnd(agentWidth);

          logger.info(`${title}  ${status}  ${priority}  ${agent}`);
        }

        logger.blank();

        // Summary
        const s = data.summary;
        const parts: string[] = [];
        if (s.completed > 0) parts.push(chalk.green(`${s.completed} completed`));
        if (s.in_progress > 0) parts.push(chalk.yellow(`${s.in_progress} in progress`));
        if (s.blocked > 0) parts.push(chalk.red(`${s.blocked} blocked`));
        if (s.pending > 0) parts.push(chalk.gray(`${s.pending} pending`));
        if (s.planned > 0) parts.push(chalk.blue(`${s.planned} planned`));
        if (s.backlog > 0) parts.push(chalk.gray(`${s.backlog} backlog`));

        logger.info(chalk.gray(`Total: ${s.total} | `) + parts.join(chalk.gray(' | ')));
      } catch {
        logger.error('Server is not running.');
        logger.info(`Start with: ${chalk.cyan('cam start')}`);
      }

      logger.blank();
    },
  );
