#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { statusCommand } from './commands/status.js';
import { sessionsCommand } from './commands/sessions.js';
import { hooksCommand } from './commands/hooks.js';
import { themeCommand } from './commands/theme.js';
import { projectCommand } from './commands/project.js';
import { sprintCommand } from './commands/sprint.js';
import { tasksCommand } from './commands/tasks.js';
import { progressCommand } from './commands/progress.js';

const program = new Command();

program
  .name('cam')
  .description('Claude Agent Monitor - Mission Control for Claude Code agents')
  .version('1.0.0');

program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(statusCommand);
program.addCommand(sessionsCommand);
program.addCommand(hooksCommand);
program.addCommand(themeCommand);
program.addCommand(projectCommand);
program.addCommand(sprintCommand);
program.addCommand(tasksCommand);
program.addCommand(progressCommand);

program.parse();
