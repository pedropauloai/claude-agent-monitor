import { Command } from 'commander';
import chalk from 'chalk';
import { DEFAULT_SERVER_PORT } from '@claudecam/shared';
import { logger } from '../utils/logger.js';
import { readConfig, writeConfig } from '../utils/config.js';

const VALID_THEMES = ['pixel', 'modern', 'terminal'] as const;
type Theme = (typeof VALID_THEMES)[number];

export const themeCommand = new Command('theme')
  .description('Switch dashboard theme')
  .argument('[name]', 'Theme name: pixel, modern, terminal')
  .action(async (name?: string) => {
    logger.blank();

    if (!name) {
      // Show current theme and available themes
      const config = readConfig();
      logger.section('Dashboard Theme');
      logger.blank();
      logger.keyValue('Current', chalk.cyan(config.theme));
      logger.blank();
      logger.section('Available themes:');
      for (const theme of VALID_THEMES) {
        const marker = theme === config.theme ? chalk.green(' (active)') : '';
        const description = getThemeDescription(theme);
        logger.item(`${chalk.white(theme)}${marker} ${chalk.gray(`- ${description}`)}`);
      }
      logger.blank();
      logger.info(`Usage: ${chalk.cyan('cam theme <name>')}`);
      logger.blank();
      return;
    }

    if (!VALID_THEMES.includes(name as Theme)) {
      logger.error(`Invalid theme: "${name}"`);
      logger.info(`Valid themes: ${VALID_THEMES.map((t) => chalk.cyan(t)).join(', ')}`);
      logger.blank();
      process.exit(1);
    }

    writeConfig({ theme: name });
    logger.success(`Theme set to ${chalk.cyan(name)}`);

    // Try to notify the server about theme change
    const config = readConfig();
    try {
      await fetch(`http://localhost:${config.serverPort || DEFAULT_SERVER_PORT}/api/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: name }),
      });
      logger.info('Dashboard will update automatically.');
    } catch {
      logger.info('Theme will be applied on next server start.');
    }

    logger.blank();
  });

function getThemeDescription(theme: Theme): string {
  switch (theme) {
    case 'pixel':
      return 'Retro pixel art RPG style with sprites and animations';
    case 'modern':
      return 'Clean, minimal dashboard inspired by Linear/Vercel';
    case 'terminal':
      return 'Hacker-style terminal with keyboard navigation';
  }
}
