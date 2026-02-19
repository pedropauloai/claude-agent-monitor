import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_SERVER_PORT } from '@claudecam/shared';
import { logger } from '../utils/logger.js';
import { readConfig } from '../utils/config.js';
import { parseSprintMarkdown } from '../utils/sprint-parser.js';

interface SprintData {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  totalTasks: number;
  completedTasks: number;
}

interface SprintsResponse {
  sprints: SprintData[];
}

interface SprintResponse {
  sprint: SprintData;
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
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedAgent?: string;
  }>;
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

const listCommand = new Command('list')
  .description('List sprints for the active project')
  .action(async () => {
    const projectId = requireActiveProject();

    logger.blank();
    logger.section('Sprints');
    logger.blank();

    try {
      const response = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`);

      if (!response.ok) {
        if (response.status === 404) {
          logger.error('Active project not found on server. It may have been deleted.');
        } else {
          logger.error(`Server responded with status ${response.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      const data = (await response.json()) as SprintsResponse;

      if (data.sprints.length === 0) {
        logger.info('No sprints found.');
        logger.info(`Create one with: ${chalk.cyan('cam sprint create <name>')}`);
        logger.blank();
        return;
      }

      for (const sprint of data.sprints) {
        const statusColor =
          sprint.status === 'active'
            ? chalk.green
            : sprint.status === 'completed'
              ? chalk.cyan
              : chalk.gray;

        const percent =
          sprint.totalTasks > 0
            ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100)
            : 0;

        logger.keyValue('  ID', chalk.cyan(sprint.id.slice(0, 8)));
        logger.keyValue('  Name', chalk.white(sprint.name));
        logger.keyValue('  Status', statusColor(sprint.status));
        logger.keyValue(
          '  Progress',
          `[${renderProgressBar(percent, 16)}] ${percent}% (${sprint.completedTasks}/${sprint.totalTasks})`,
        );
        logger.blank();
      }

      logger.info(
        chalk.gray(`${data.sprints.length} sprint(s). Use ${chalk.cyan('cam sprint status')} for current sprint details.`),
      );
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const createCommand = new Command('create')
  .description('Create a new sprint')
  .argument('<name>', 'Sprint name')
  .action(async (name: string) => {
    const projectId = requireActiveProject();

    logger.blank();

    try {
      const response = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.error('Active project not found on server.');
        } else {
          logger.error(`Server responded with status ${response.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      const data = (await response.json()) as SprintResponse;
      const sprint = data.sprint;

      logger.success(`Sprint created: ${chalk.cyan(sprint.name)}`);
      logger.keyValue('ID', chalk.cyan(sprint.id.slice(0, 8)));
      logger.keyValue('Status', chalk.gray(sprint.status));
      logger.info(`Activate with: ${chalk.cyan(`cam sprint activate ${sprint.id.slice(0, 8)}`)}`);
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const statusCommand = new Command('status')
  .description('Show current sprint progress')
  .action(async () => {
    const projectId = requireActiveProject();

    logger.blank();

    try {
      // Get sprints to find the active one
      const sprintsResponse = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`);
      if (!sprintsResponse.ok) {
        logger.error(`Server responded with status ${sprintsResponse.status}`);
        logger.blank();
        process.exit(1);
      }

      const sprintsData = (await sprintsResponse.json()) as SprintsResponse;
      const activeSprint = sprintsData.sprints.find((s) => s.status === 'active');

      if (!activeSprint) {
        logger.info('No active sprint found.');
        logger.info(`Activate one with: ${chalk.cyan('cam sprint activate <id>')}`);
        logger.blank();
        return;
      }

      // Get tasks for the active sprint
      const tasksResponse = await fetch(
        `${getApiBase()}/api/projects/${projectId}/tasks?sprint_id=${activeSprint.id}`,
      );

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

      if (tasksResponse.ok) {
        const tasksData = (await tasksResponse.json()) as TasksResponse;
        summary = tasksData.summary;
      }

      const percent =
        activeSprint.totalTasks > 0
          ? Math.round((activeSprint.completedTasks / activeSprint.totalTasks) * 100)
          : 0;

      logger.section(`Sprint: ${activeSprint.name}`);
      logger.keyValue(
        'Status',
        chalk.green(activeSprint.status),
      );
      logger.keyValue(
        'Progress',
        `[${renderProgressBar(percent)}] ${percent}% (${activeSprint.completedTasks}/${activeSprint.totalTasks} tasks)`,
      );
      logger.blank();

      // Status breakdown
      const statuses: Array<{ label: string; value: number; color: (s: string) => string }> = [
        { label: 'completed', value: summary.completed, color: chalk.green },
        { label: 'in_progress', value: summary.in_progress, color: chalk.yellow },
        { label: 'in_review', value: summary.in_review, color: chalk.cyan },
        { label: 'pending', value: summary.pending, color: chalk.gray },
        { label: 'planned', value: summary.planned, color: chalk.blue },
        { label: 'blocked', value: summary.blocked, color: chalk.red },
      ];

      for (const status of statuses) {
        if (status.value > 0) {
          logger.keyValue(
            `  ${status.label}`,
            status.color(String(status.value)),
          );
        }
      }
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const activateCommand = new Command('activate')
  .description('Activate a sprint')
  .argument('<id>', 'Sprint ID to activate')
  .action(async (sprintId: string) => {
    const projectId = requireActiveProject();

    logger.blank();

    try {
      const response = await fetch(
        `${getApiBase()}/api/projects/${projectId}/sprints/${sprintId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          logger.error(`Sprint not found: ${sprintId}`);
        } else {
          logger.error(`Server responded with status ${response.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      const data = (await response.json()) as SprintResponse;
      logger.success(`Sprint activated: ${chalk.cyan(data.sprint.name)}`);
      logger.keyValue('ID', chalk.cyan(data.sprint.id.slice(0, 8)));
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface CreateTaskResponse {
  task: TaskData;
}

const addCommand = new Command('add')
  .description('Add a new sprint (alias for create)')
  .argument('<name>', 'Sprint name')
  .action(async (name: string) => {
    const projectId = requireActiveProject();

    logger.blank();

    try {
      const response = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.error('Active project not found on server.');
        } else {
          logger.error(`Server responded with status ${response.status}`);
        }
        logger.blank();
        process.exit(1);
      }

      const data = (await response.json()) as SprintResponse;
      const sprint = data.sprint;

      logger.success(`Sprint created: ${chalk.cyan(sprint.name)}`);
      logger.keyValue('ID', chalk.cyan(sprint.id.slice(0, 8)));
      logger.keyValue('Status', chalk.gray(sprint.status));
      logger.info(`Activate with: ${chalk.cyan(`cam sprint activate ${sprint.id.slice(0, 8)}`)}`);
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const importCommand = new Command('import')
  .description('Import tasks from a sprint markdown file')
  .argument('<file>', 'Path to sprint markdown file')
  .option('--sprint-id <id>', 'Assign tasks to an existing sprint ID')
  .action(async (file: string, options: { sprintId?: string }) => {
    const projectId = requireActiveProject();

    logger.blank();

    // Resolve and validate file path
    const filePath = resolve(process.cwd(), file);
    if (!existsSync(filePath)) {
      logger.error(`File not found: ${chalk.cyan(filePath)}`);
      logger.blank();
      process.exit(1);
    }

    // Read and parse the markdown file
    const content = readFileSync(filePath, 'utf-8');
    const parsed = parseSprintMarkdown(content);

    if (parsed.tasks.length === 0) {
      logger.warning('No tasks found in the markdown file.');
      logger.info('Make sure tasks use the format: - [ ] Task title');
      logger.blank();
      return;
    }

    logger.section(`Importing: ${parsed.name || file}`);
    logger.info(`Found ${chalk.cyan(String(parsed.tasks.length))} task(s)`);
    logger.blank();

    try {
      // Step 1: Create sprint if needed (unless --sprint-id provided)
      let sprintId = options.sprintId;

      if (!sprintId && parsed.name) {
        // Check if sprint with this name already exists
        const sprintsResponse = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`);
        if (sprintsResponse.ok) {
          const sprintsData = (await sprintsResponse.json()) as SprintsResponse;
          const existing = sprintsData.sprints.find(
            (s) => s.name.toLowerCase() === parsed.name.toLowerCase(),
          );
          if (existing) {
            sprintId = existing.id;
            logger.info(`Using existing sprint: ${chalk.cyan(existing.name)} (${existing.id.slice(0, 8)})`);
          }
        }

        if (!sprintId) {
          const createResponse = await fetch(
            `${getApiBase()}/api/projects/${projectId}/sprints`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: parsed.name }),
            },
          );

          if (createResponse.ok) {
            const createData = (await createResponse.json()) as SprintResponse;
            sprintId = createData.sprint.id;
            logger.success(`Sprint created: ${chalk.cyan(createData.sprint.name)} (${sprintId.slice(0, 8)})`);
          } else {
            logger.warning('Could not create sprint. Tasks will be imported without sprint assignment.');
          }
        }
      }

      // Step 2: Fetch existing tasks for idempotency check
      const existingTitles = new Set<string>();

      if (sprintId) {
        const existingResponse = await fetch(
          `${getApiBase()}/api/projects/${projectId}/tasks?sprint_id=${sprintId}`,
        );
        if (existingResponse.ok) {
          const existingData = (await existingResponse.json()) as TasksResponse;
          for (const t of existingData.tasks) {
            existingTitles.add(t.title.toLowerCase().trim());
          }
          if (existingTitles.size > 0) {
            logger.info(`Found ${chalk.cyan(String(existingTitles.size))} existing task(s) in sprint`);
          }
        }
      }

      // Step 3: Import tasks (skip duplicates)
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const task of parsed.tasks) {
        // Idempotency: skip tasks that already exist by title
        if (existingTitles.has(task.title.toLowerCase().trim())) {
          skipped++;
          logger.info(`Skipped (already exists): ${chalk.gray(task.title)}`);
          continue;
        }

        const taskStatus = task.completed ? 'completed' : 'planned';
        const body: Record<string, unknown> = {
          title: task.title,
          description: task.description || '',
          status: taskStatus,
          priority: task.priority,
          prd_section: parsed.name || undefined,
          prd_subsection: task.section || undefined,
        };

        if (task.tags.length > 0) {
          body['tags'] = task.tags;
        }

        if (sprintId) {
          body['sprint_id'] = sprintId;
        }

        const response = await fetch(
          `${getApiBase()}/api/projects/${projectId}/tasks`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        if (response.ok) {
          const data = (await response.json()) as CreateTaskResponse;
          imported++;
          const statusIcon = task.completed ? chalk.green('[x]') : chalk.gray('[ ]');
          logger.item(`${statusIcon} ${data.task.title}`);
        } else {
          failed++;
          logger.warning(`Failed: ${task.title}`);
        }
      }

      logger.blank();
      logger.success(`Imported ${chalk.cyan(String(imported))} new task(s)`);
      if (skipped > 0) {
        logger.info(`Skipped ${chalk.cyan(String(skipped))} existing task(s)`);
      }
      if (failed > 0) {
        logger.warning(`Failed ${chalk.cyan(String(failed))} task(s)`);
      }
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
    }

    logger.blank();
  });

const syncCommand = new Command('sync')
  .description('Sync all sprint files from docs/SPRINTS/ to the database')
  .option('--dir <path>', 'Directory containing sprint files', 'docs/SPRINTS')
  .action(async (options: { dir: string }) => {
    const projectId = requireActiveProject();

    logger.blank();
    logger.section('Sprint Sync');
    logger.blank();

    // Resolve directory
    const sprintsDir = resolve(process.cwd(), options.dir);
    if (!existsSync(sprintsDir)) {
      logger.error(`Directory not found: ${chalk.cyan(sprintsDir)}`);
      logger.info(`Run ${chalk.cyan('cam init')} to create the sprint structure.`);
      logger.blank();
      process.exit(1);
    }

    // Find sprint files (sprint-*.md, excluding TEMPLATE.md and README.md)
    const files = readdirSync(sprintsDir)
      .filter((f) => /^sprint-\d+.*\.md$/i.test(f))
      .sort((a, b) => {
        // Natural sort: sprint-01 < sprint-02 < sprint-10
        const numA = parseInt(a.match(/sprint-(\d+)/i)?.[1] ?? '0', 10);
        const numB = parseInt(b.match(/sprint-(\d+)/i)?.[1] ?? '0', 10);
        return numA - numB;
      });

    if (files.length === 0) {
      logger.info('No sprint files found.');
      logger.info(`Create sprint files in ${chalk.cyan(options.dir)} following the template.`);
      logger.blank();
      return;
    }

    logger.info(`Found ${chalk.cyan(String(files.length))} sprint file(s)`);
    logger.blank();

    // Fetch existing sprints from DB
    let existingSprints: SprintData[] = [];
    try {
      const response = await fetch(`${getApiBase()}/api/projects/${projectId}/sprints`);
      if (response.ok) {
        const data = (await response.json()) as SprintsResponse;
        existingSprints = data.sprints;
      }
    } catch {
      logger.error('Server is not running.');
      logger.info(`Start with: ${chalk.cyan('cam start')}`);
      logger.blank();
      process.exit(1);
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let sprintsCreated = 0;
    let sprintsSynced = 0;

    for (const file of files) {
      const filePath = resolve(sprintsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseSprintMarkdown(content);

      if (parsed.tasks.length === 0) {
        logger.info(`${chalk.gray(file)}: no tasks found, skipping`);
        continue;
      }

      // Find or create sprint
      let sprintId: string | undefined;
      const existing = existingSprints.find(
        (s) => s.name.toLowerCase() === parsed.name.toLowerCase(),
      );

      if (existing) {
        sprintId = existing.id;
      } else if (parsed.name) {
        // Create new sprint
        try {
          const createResponse = await fetch(
            `${getApiBase()}/api/projects/${projectId}/sprints`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: parsed.name }),
            },
          );

          if (createResponse.ok) {
            const createData = (await createResponse.json()) as SprintResponse;
            sprintId = createData.sprint.id;
            existingSprints.push(createData.sprint); // Track for subsequent files
            sprintsCreated++;
          }
        } catch {
          logger.warning(`Failed to create sprint for ${file}`);
          continue;
        }
      }

      // Fetch existing tasks for this sprint (idempotency)
      const existingTitles = new Set<string>();
      if (sprintId) {
        try {
          const tasksResponse = await fetch(
            `${getApiBase()}/api/projects/${projectId}/tasks?sprint_id=${sprintId}`,
          );
          if (tasksResponse.ok) {
            const tasksData = (await tasksResponse.json()) as TasksResponse;
            for (const t of tasksData.tasks) {
              existingTitles.add(t.title.toLowerCase().trim());
            }
          }
        } catch {
          // Continue without idempotency check
        }
      }

      // Import tasks
      let fileImported = 0;
      let fileSkipped = 0;
      let fileFailed = 0;

      for (const task of parsed.tasks) {
        if (existingTitles.has(task.title.toLowerCase().trim())) {
          fileSkipped++;
          continue;
        }

        const taskStatus = task.completed ? 'completed' : 'planned';
        const body: Record<string, unknown> = {
          title: task.title,
          description: task.description || '',
          status: taskStatus,
          priority: task.priority,
          prd_section: parsed.name || undefined,
          prd_subsection: task.section || undefined,
        };

        if (task.tags.length > 0) {
          body['tags'] = task.tags;
        }

        if (sprintId) {
          body['sprint_id'] = sprintId;
        }

        try {
          const response = await fetch(
            `${getApiBase()}/api/projects/${projectId}/tasks`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            },
          );

          if (response.ok) {
            fileImported++;
          } else {
            fileFailed++;
          }
        } catch {
          fileFailed++;
        }
      }

      totalImported += fileImported;
      totalSkipped += fileSkipped;
      totalFailed += fileFailed;
      sprintsSynced++;

      // Log per-file summary
      const statusIcon = fileImported > 0 ? chalk.green('\u2713') : chalk.gray('\u2013');
      const parts: string[] = [];
      if (fileImported > 0) parts.push(chalk.green(`${fileImported} imported`));
      if (fileSkipped > 0) parts.push(chalk.gray(`${fileSkipped} existing`));
      if (fileFailed > 0) parts.push(chalk.red(`${fileFailed} failed`));

      logger.item(`${statusIcon} ${chalk.white(file)}: ${parts.join(', ')}`);
    }

    // Summary
    logger.blank();
    if (sprintsCreated > 0) {
      logger.success(`Created ${chalk.cyan(String(sprintsCreated))} new sprint(s)`);
    }
    logger.success(`Synced ${chalk.cyan(String(sprintsSynced))} sprint file(s): ${chalk.green(String(totalImported))} imported, ${chalk.gray(String(totalSkipped))} existing`);
    if (totalFailed > 0) {
      logger.warning(`${totalFailed} task(s) failed`);
    }

    logger.blank();
  });

export const sprintCommand = new Command('sprint')
  .description('Manage project sprints');

sprintCommand.addCommand(listCommand);
sprintCommand.addCommand(createCommand);
sprintCommand.addCommand(addCommand);
sprintCommand.addCommand(statusCommand);
sprintCommand.addCommand(activateCommand);
sprintCommand.addCommand(importCommand);
sprintCommand.addCommand(syncCommand);
