import { Command } from 'commander';
import chalk from 'chalk';
import { DEFAULT_SERVER_PORT } from '@cam/shared';
import { logger } from '../utils/logger.js';
import { readConfig, writeConfig } from '../utils/config.js';

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  currentSprintId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDetailData extends ProjectData {
  completionPercent: number;
  currentSprint?: {
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    completionPercent: number;
  };
}

interface ProjectsResponse {
  projects: ProjectData[];
}

interface ProjectDetailResponse {
  project: ProjectDetailData;
}

interface SprintsResponse {
  sprints: Array<{
    id: string;
    name: string;
    order: number;
    status: string;
    totalTasks: number;
    completedTasks: number;
  }>;
}

function getApiBase(): string {
  const config = readConfig();
  const port = config.serverPort || DEFAULT_SERVER_PORT;
  return `http://localhost:${port}`;
}

function resolveProjectId(idArg?: string): string | undefined {
  if (idArg) return idArg;
  const config = readConfig();
  return config.activeProjectId;
}

const listCommand = new Command('list')
  .description('List all projects')
  .action(async () => {
    logger.blank();
    logger.section('Projects');
    logger.blank();

    try {
      const response = await fetch(`${getApiBase()}/api/projects`);

      if (!response.ok) {
        logger.error(`Server responded with status ${response.status}`);
        process.exit(1);
      }

      const data = (await response.json()) as ProjectsResponse;

      if (data.projects.length === 0) {
        logger.info('No projects found.');
        logger.info(`Create one with: ${chalk.cyan('cam init')}`);
        logger.blank();
        return;
      }

      const config = readConfig();

      for (const project of data.projects) {
        const statusColor =
          project.status === 'active'
            ? chalk.green
            : project.status === 'completed'
              ? chalk.cyan
              : chalk.gray;

        const percent =
          project.totalTasks > 0
            ? Math.round((project.completedTasks / project.totalTasks) * 100)
            : 0;

        const isActive = project.id === config.activeProjectId;
        const marker = isActive ? chalk.green(' (active)') : '';

        logger.keyValue('  ID', chalk.cyan(project.id.slice(0, 8)) + marker);
        logger.keyValue('  Name', chalk.white(project.name));
        logger.keyValue('  Status', statusColor(project.status));
        logger.keyValue(
          '  Progress',
          `${project.completedTasks}/${project.totalTasks} tasks (${percent}%)`,
        );
        logger.blank();
      }

      logger.info(
        chalk.gray(`${data.projects.length} project(s) found. Use ${chalk.cyan('cam project show <id>')} to see details.`),
      );
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const showCommand = new Command('show')
  .description('Show project details')
  .argument('[id]', 'Project ID (uses active project if not specified)')
  .action(async (idArg?: string) => {
    logger.blank();

    let projectId = resolveProjectId(idArg);

    try {
      // If no project ID, try to auto-select if there's only one project
      if (!projectId) {
        const listResponse = await fetch(`${getApiBase()}/api/projects`);
        if (!listResponse.ok) {
          logger.error(`Server responded with status ${listResponse.status}`);
          process.exit(1);
        }

        const listData = (await listResponse.json()) as ProjectsResponse;

        if (listData.projects.length === 0) {
          logger.error('No projects found.');
          logger.info(`Create one with: ${chalk.cyan('cam init')}`);
          logger.blank();
          return;
        }

        if (listData.projects.length === 1) {
          projectId = listData.projects[0].id;
          logger.info(chalk.gray(`Auto-selected project: ${listData.projects[0].name}`));
          logger.blank();
        } else {
          logger.error('No active project set and multiple projects exist.');
          logger.info(`Run: ${chalk.cyan('cam project show <id>')} to set the active project.`);
          logger.info(`Run: ${chalk.cyan('cam project list')} to see all projects.`);
          logger.blank();
          return;
        }
      }

      const response = await fetch(`${getApiBase()}/api/projects/${projectId}`);

      if (!response.ok) {
        if (response.status === 404) {
          logger.error(`Project not found: ${projectId}`);
        } else {
          logger.error(`Server responded with status ${response.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      const data = (await response.json()) as ProjectDetailResponse;
      const project = data.project;

      // Save as active project
      writeConfig({ activeProjectId: project.id });

      logger.section(`Project: ${project.name}`);
      logger.blank();
      logger.keyValue('ID', chalk.cyan(project.id));
      logger.keyValue(
        'Status',
        project.status === 'active'
          ? chalk.green(project.status)
          : project.status === 'completed'
            ? chalk.cyan(project.status)
            : chalk.gray(project.status),
      );
      if (project.description) {
        logger.keyValue('Description', project.description);
      }
      logger.blank();

      // Progress
      logger.section('Progress');
      logger.keyValue(
        'Tasks',
        `${project.completedTasks}/${project.totalTasks} completed (${project.completionPercent}%)`,
      );

      const barWidth = 20;
      const filled = Math.round((project.completionPercent / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = chalk.green('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(empty));
      logger.keyValue('Progress', `[${bar}] ${project.completionPercent}%`);
      logger.blank();

      // Current sprint
      if (project.currentSprint) {
        const sprint = project.currentSprint;
        logger.section('Current Sprint');
        logger.keyValue('Name', chalk.yellow(sprint.name));
        logger.keyValue(
          'Tasks',
          `${sprint.completedTasks}/${sprint.totalTasks} completed (${sprint.completionPercent}%)`,
        );
        logger.blank();
      }

      // Sprints summary
      const sprintsResponse = await fetch(`${getApiBase()}/api/projects/${project.id}/sprints`);
      if (sprintsResponse.ok) {
        const sprintsData = (await sprintsResponse.json()) as SprintsResponse;
        if (sprintsData.sprints.length > 0) {
          logger.section(`Sprints (${sprintsData.sprints.length})`);
          for (const sprint of sprintsData.sprints) {
            const sprintStatusColor =
              sprint.status === 'active'
                ? chalk.green
                : sprint.status === 'completed'
                  ? chalk.cyan
                  : chalk.gray;

            logger.item(
              `${chalk.white(sprint.name)} ${sprintStatusColor(sprint.status)} - ${sprint.completedTasks}/${sprint.totalTasks} tasks`,
            );
          }
          logger.blank();
        }
      }

      logger.info(chalk.gray(`Set as active project. Use ${chalk.cyan('cam sprint list')} or ${chalk.cyan('cam tasks')} for details.`));
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const deleteCommand = new Command('delete')
  .description('Delete a project')
  .argument('<id>', 'Project ID to delete')
  .action(async (id: string) => {
    logger.blank();

    try {
      const response = await fetch(`${getApiBase()}/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.error(`Project not found: ${id}`);
        } else {
          logger.error(`Server responded with status ${response.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      logger.success(`Project deleted: ${chalk.cyan(id.slice(0, 8))}`);

      // Clear active project if it was the deleted one
      const config = readConfig();
      if (config.activeProjectId === id) {
        writeConfig({ activeProjectId: undefined });
        logger.info('Active project cleared.');
      }
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

export const projectCommand = new Command('project')
  .description('Manage CAM projects');

projectCommand.addCommand(listCommand);
projectCommand.addCommand(showCommand);
projectCommand.addCommand(deleteCommand);
