import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEFAULT_SERVER_PORT, DEFAULT_DASHBOARD_PORT } from '@claudecam/shared';

export interface CamConfig {
  serverPort: number;
  dashboardPort: number;
  theme: string;
  activeProjectId?: string;
}

const CONFIG_FILE_NAME = 'cam.config.json';
const CLAUDE_DIR = '.claude';
const CLAUDE_SETTINGS_FILE = 'settings.json';

export function getProjectRoot(): string {
  return process.cwd();
}

export function getClaudeDir(): string {
  return join(getProjectRoot(), CLAUDE_DIR);
}

export function getClaudeSettingsPath(): string {
  return join(getClaudeDir(), CLAUDE_SETTINGS_FILE);
}

export function claudeSettingsExist(): boolean {
  return existsSync(getClaudeSettingsPath());
}

export function ensureClaudeDir(): void {
  const dir = getClaudeDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readClaudeSettings(): Record<string, unknown> {
  const settingsPath = getClaudeSettingsPath();
  if (!existsSync(settingsPath)) {
    return {};
  }
  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function writeClaudeSettings(settings: Record<string, unknown>): void {
  ensureClaudeDir();
  const settingsPath = getClaudeSettingsPath();
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

export function getConfigPath(): string {
  return join(getProjectRoot(), CONFIG_FILE_NAME);
}

export function readConfig(): CamConfig {
  const configPath = getConfigPath();
  const defaults: CamConfig = {
    serverPort: DEFAULT_SERVER_PORT,
    dashboardPort: DEFAULT_DASHBOARD_PORT,
    theme: 'modern',
  };

  if (!existsSync(configPath)) {
    return defaults;
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CamConfig>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function writeConfig(config: Partial<CamConfig>): void {
  const current = readConfig();
  const merged = { ...current, ...config };
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

export function resolveFilePath(filePath: string): string {
  return resolve(getProjectRoot(), filePath);
}
