import { Command } from 'commander';
import chalk from 'chalk';
import { DEFAULT_SERVER_PORT } from '@cam/shared';
import { logger } from '../utils/logger.js';
import { readConfig } from '../utils/config.js';

interface ProjectDetailData {
  id: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  currentSprint?: {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    completionPercent: number;
  };
}

interface ProjectDetailResponse {
  project: ProjectDetailData;
}

interface SprintData {
  id: string;
  name: string;
  order: number;
  status: string;
  totalTasks: number;
  completedTasks: number;
}

interface SprintsResponse {
  sprints: SprintData[];
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
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

function renderProgressBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return chalk.green('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(empty));
}

export const progressCommand = new Command('progress')
  .description('Show project progress overview')
  .option('--full', 'Show detailed progress report')
  .action(async (options: { full?: boolean }) => {
    const projectId = requireActiveProject();

    logger.blank();

    try {
      // Get project details
      const projectResponse = await fetch(`${getApiBase()}/api/projects/${projectId}`);

      if (!projectResponse.ok) {
        if (projectResponse.status === 404) {
          logger.error('Active project not found on server.');
        } else {
          logger.error(`Server responded with status ${projectResponse.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      const projectData = (await projectResponse.json()) as ProjectDetailResponse;
      const project = projectData.project;

      // Header
      logger.section(`Project: ${project.name}`);

      if (project.currentSprint) {
        logger.keyValue('Sprint', `${project.currentSprint.name} (${chalk.green('active')})`);
      }

      logger.blank();

      // Main progress bar
      logger.keyValue(
        '  ',
        `[${renderProgressBar(project.completionPercent)}] ${project.completionPercent}% complete`,
      );
      logger.blank();

      // Quick summary
      const tasksResponse = await fetch(`${getApiBase()}/api/projects/${projectId}/tasks`);

      let summary: TasksSummary = {
        total: 0,
        backlog: 0,
        planned: 0,
        pending: 0,
        in_progress: 0,
        in_review: 0,
        completed: 0,
        blocked: 0,
        deferred: 0,
      };
      let tasks: TaskData[] = [];

      if (tasksResponse.ok) {
        const tasksData = (await tasksResponse.json()) as TasksResponse;
        summary = tasksData.summary;
        tasks = tasksData.tasks;
      }

      const quickParts: string[] = [];
      quickParts.push(chalk.green(`${summary.completed} done`));
      if (summary.in_progress > 0) quickParts.push(chalk.yellow(`${summary.in_progress} in progress`));
      if (summary.blocked > 0) quickParts.push(chalk.red(`${summary.blocked} blocked`));

      const remaining = summary.total - summary.completed;
      if (remaining > 0) quickParts.push(chalk.gray(`${remaining} remaining`));

      logger.keyValue('Tasks', `${project.completedTasks}/${project.totalTasks} | ${quickParts.join(' | ')}`);
      logger.blank();

      // Full report
      if (options.full) {
        // Status breakdown
        logger.section('Task Breakdown');

        const statuses: Array<{ label: string; value: number; color: (s: string) => string }> = [
          { label: 'Completed', value: summary.completed, color: chalk.green },
          { label: 'In Progress', value: summary.in_progress, color: chalk.yellow },
          { label: 'In Review', value: summary.in_review, color: chalk.cyan },
          { label: 'Pending', value: summary.pending, color: chalk.gray },
          { label: 'Planned', value: summary.planned, color: chalk.blue },
          { label: 'Blocked', value: summary.blocked, color: chalk.red },
          { label: 'Backlog', value: summary.backlog, color: chalk.gray },
          { label: 'Deferred', value: summary.deferred, color: chalk.gray },
        ];

        for (const status of statuses) {
          if (status.value > 0) {
            const bar = status.color('\u2588'.repeat(Math.min(status.value, 30)));
            logger.keyValue(`  ${status.label}`, `${bar} ${status.value}`);
          }
        }

        logger.blank();

        // In-progress tasks with agents
        const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
        if (inProgressTasks.length > 0) {
          logger.section('In Progress');
          for (const task of inProgressTasks) {
            const agent = task.assignedAgent
              ? chalk.cyan(` (${task.assignedAgent})`)
              : '';
            logger.item(`${chalk.yellow(task.title)}${agent}`);
          }
          logger.blank();
        }

        // Blocked tasks
        const blockedTasks = tasks.filter((t) => t.status === 'blocked');
        if (blockedTasks.length > 0) {
          logger.section('Blocked');
          for (const task of blockedTasks) {
            logger.item(chalk.red(task.title));
          }
          logger.blank();
        }

        // Sprint-by-sprint breakdown
        const sprintsResponse = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`);
        if (sprintsResponse.ok) {
          const sprintsData = (await sprintsResponse.json()) as SprintsResponse;

          if (sprintsData.sprints.length > 0) {
            logger.section('Sprint Breakdown');
            logger.blank();

            for (const sprint of sprintsData.sprints) {
              const sprintPercent =
                sprint.totalTasks > 0
                  ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100)
                  : 0;

              const statusColor =
                sprint.status === 'active'
                  ? chalk.green
                  : sprint.status === 'completed'
                    ? chalk.cyan
                    : chalk.gray;

              logger.keyValue(
                `  ${sprint.name}`,
                `${statusColor(sprint.status)} [${renderProgressBar(sprintPercent, 12)}] ${sprintPercent}% (${sprint.completedTasks}/${sprint.totalTasks})`,
              );
            }

            logger.blank();
          }
        }
      }
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });
