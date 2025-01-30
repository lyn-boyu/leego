import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { PROJECT_PATHS } from '../config/constants';
import type { Config, SensitiveConfig } from '../config/constants';
import { getDefaultConfig, getDefaultSensitiveConfig } from '../config/constants';
import { formatDate } from './date';
import { logger } from './logger';

// Project config paths (relative to workspace)
function getProjectPath(type: keyof typeof PROJECT_PATHS): string {
  return path.join(process.cwd(), PROJECT_PATHS[type]);
}

// Generate a temporary file path with optional prefix and extension
export function getTempFilePath(prefix: string = '', extension: string = ''): string {
  const timestamp = formatDate(new Date())
  const random = Math.random().toString(36).substring(2, 6);
  const fileName = `${prefix}${timestamp}-${random}${extension}`;
  return path.join(process.cwd(), PROJECT_PATHS.logs, fileName);
}

export async function createGitignore(): Promise<void> {
  const baseDir = process.cwd();
  const gitignoreContent = `node_modules/
.env
.DS_Store

# leego CLI directories
.leetcode/credentials.json
.leetcode/problems.json
.leetcode/logs/
`;

  await writeFile(path.join(baseDir, '.gitignore'), gitignoreContent);
}

export async function ensureProjectDirectories() {
  const baseDir = process.cwd();
  const directories = [
    PROJECT_PATHS.root,
    PROJECT_PATHS.logs
  ];

  const errors: Error[] = [];

  for (const dir of directories) {
    const fullPath = path.join(baseDir, dir);
    try {
      await mkdir(fullPath, { recursive: true });
    } catch (error) {
      errors.push(new Error(`Failed to create directory ${dir}: ${(error as Error).message}`));
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.map(e => e.message).join('\n'));
  }
}

export async function ensureCookies(): Promise<string> {
  const config = await loadSensitiveConfig();
  if (!config.cookies) {
    throw new Error('LeetCode cookies not found. Please use leego set-cookies first.');
  }
  return config.cookies;
}

// Error handling class
class ConfigError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Base configuration handling
export async function createConfig(config: Partial<Config>): Promise<void> {
  try {
    await ensureProjectDirectories();
    const newConfig = {
      ...getDefaultConfig(),
      ...config
    };
    await writeFile(getProjectPath('config'), JSON.stringify(newConfig, null, 2));
  } catch (error) {
    throw new ConfigError('Failed to create config', error);
  }
}

export async function updateConfig(config: Partial<Config>): Promise<void> {
  try {
    const currentConfig = await loadConfig();
    const newConfig = { ...currentConfig, ...config };
    await writeFile(getProjectPath('config'), JSON.stringify(newConfig, null, 2));
  } catch (error) {
    throw new ConfigError('Failed to update config', error);
  }
}

export async function loadConfig(): Promise<Config> {
  try {
    const data = await readFile(getProjectPath('config'), 'utf8');
    const config = JSON.parse(data);
    return {
      ...getDefaultConfig(),
      ...config
    };
  } catch (error) {
    const defaultConfig = getDefaultConfig();
    await createConfig(defaultConfig);
    return defaultConfig;
  }
}

// Sensitive configuration handling
export async function createSensitiveConfig(config: Partial<SensitiveConfig>): Promise<void> {
  try {
    await ensureProjectDirectories();
    const newConfig = {
      ...getDefaultSensitiveConfig(),
      ...config
    };
    await writeFile(getProjectPath('credentials'), JSON.stringify(newConfig, null, 2));
  } catch (error) {
    throw new ConfigError('Failed to create sensitive config', error);
  }
}

export async function updateSensitiveConfig(config: Partial<SensitiveConfig>): Promise<void> {
  try {
    const currentConfig = await loadSensitiveConfig();
    const newConfig = { ...currentConfig, ...config };

    // Validate AI configuration
    if (newConfig.ai?.activeKey) {
      // Ensure the active key exists in the keys object
      if (!newConfig.ai.keys || !newConfig.ai.keys[newConfig.ai.activeKey]) {
        await logger.warn(`Active key "${newConfig.ai.activeKey}" not found in keys, resetting active key`);
        newConfig.ai.activeKey = null;
      }
    }

    // If there are no keys, reset active key
    if (!newConfig.ai?.keys || Object.keys(newConfig.ai.keys).length === 0) {
      newConfig.ai = {
        activeKey: null,
        keys: {}
      };
    }

    await writeFile(getProjectPath('credentials'), JSON.stringify(newConfig, null, 2));
  } catch (error) {
    throw new ConfigError('Failed to update sensitive config', error);
  }
}

export async function loadSensitiveConfig(): Promise<SensitiveConfig> {
  try {
    const data = await readFile(getProjectPath('credentials'), 'utf8');
    const config = JSON.parse(data);
    return {
      ...getDefaultSensitiveConfig(),
      ...config
    };
  } catch (error) {
    const defaultConfig = getDefaultSensitiveConfig();
    await createSensitiveConfig(defaultConfig);
    return defaultConfig;
  }
}

export async function loadActiveModelName(): Promise<string | null> {
  const config = await loadSensitiveConfig();
  return config.ai.activeKey ? config.ai.keys[config.ai.activeKey]?.model : 'Na';
}