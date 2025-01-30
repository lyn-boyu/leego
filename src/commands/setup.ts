import { mkdir } from 'fs/promises';
import path from 'path';
import { PROBLEM_TYPES, getDefaultConfig, getDefaultSensitiveConfig, PROJECT_PATHS } from '../config/constants';
import { logger } from '../utils/logger';
import { updateConfig, updateSensitiveConfig, ensureProjectDirectories, createGitignore } from '../utils/config';
import chalk from 'chalk';

export async function setupProblemStructure() {
    const baseDir = process.cwd();

    try {
        console.log(chalk.blue('\n📦 Setting up LeetCode workspace...\n'));

        // Ensure project directories exist
        await ensureProjectDirectories();
        console.log(chalk.green('✔ Created project directories'));

        // Create base configuration files
        await Promise.all([
            // Create .gitignore with project-specific paths
            createGitignore(),

            // Create configs using utilities
            updateConfig(getDefaultConfig()),
            updateSensitiveConfig(getDefaultSensitiveConfig())
        ]);

        await logger.info('Created configuration files');
        console.log(chalk.green('✔ Created configuration files'));

        // Create problem type directories
        for (const type of PROBLEM_TYPES) {
            const typePath = path.join(baseDir, type);
            await mkdir(typePath, { recursive: true });
            await logger.info(`Created problem type directory: ${type}`);
        }
        console.log(chalk.green('✔ Created problem category directories'));

        // Initialize Git repository
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        try {
            await execAsync('git init');
            await execAsync('git add .');
            await execAsync('git commit -m "init: Initialize LeetCode practice workspace"');
            await logger.info('Initialized Git repository');
            console.log(chalk.green('✔ Initialized Git repository'));
        } catch (error) {
            await logger.warn('Failed to initialize Git repository. Please initialize it manually.');
            console.log(chalk.yellow('⚠ Failed to initialize Git repository. Please initialize it manually.'));
        }

        console.log(chalk.green('\n✅ Workspace setup complete!\n'));
        console.log(chalk.blue('Project structure:'));
        console.log(chalk.gray('├── .leetcode/           # Project configuration and logs'));
        console.log(chalk.gray('├── 01-arrays-hashing/   # Problem categories'));
        console.log(chalk.gray('├── 02-two-pointers/'));
        console.log(chalk.gray('├── ...'));
        console.log(chalk.gray('└── package.json\n'));

        console.log(chalk.yellow('Next steps:'));
        console.log(chalk.blue('1. Configure LeetCode credentials:'));
        console.log(chalk.gray('   leego set-cookies'));
        console.log(chalk.blue('\n2. (Optional) Set up AI integration:'));
        console.log(chalk.gray('   leego set-ai-key'));
        console.log(chalk.blue('\n3. Start practicing:'));
        console.log(chalk.gray('   leego add\n'));

    } catch (error) {
        await logger.error('Error setting up workspace', error as Error);
        throw new Error(`Failed to setup workspace: ${error.message}`);
    }
}