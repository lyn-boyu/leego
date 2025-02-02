import { mkdir } from 'fs/promises';
import path from 'path';
import { PROBLEM_TYPES, getDefaultConfig, getDefaultSensitiveConfig } from '../config/constants';
import { logger } from '../utils/logger';
import { createConfig, createSensitiveConfig } from '../utils/config';
import { ensureProjectDirectories, createGitignore, createLLMTemplate } from '../utils/setup';

/**
 * Sets up the complete project structure
 */
async function setupProject(baseDir: string): Promise<void> {
    try {
        // Ensure project directories exist
        await ensureProjectDirectories();
        await logger.success('📁 Created project directories');

        // Create configuration files and templates sequentially
        await createGitignore(baseDir);
        await createConfig(getDefaultConfig());
        await createSensitiveConfig(getDefaultSensitiveConfig());
        await logger.success('⚙️  Created configuration files');

        await createLLMTemplate(baseDir);
        await logger.success('🤖 Created custom LLM template at .leetcode/llm.ts');

        // Create problem category directories
        for (const type of PROBLEM_TYPES) {
            const typePath = path.join(baseDir, type);
            await mkdir(typePath, { recursive: true });
        }
        await logger.success('📚 Created problem category directories');

        // Initialize Git repository
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            await execAsync('git init', { cwd: baseDir });
            await execAsync('git add .', { cwd: baseDir });
            await execAsync('git commit -m "init: Initialize Leetcode practice workspace using leego"', { cwd: baseDir });
            await logger.success('🔄 Initialized Git repository');
        } catch (error) {
            await logger.warn('⚠️  Failed to initialize Git repository. Please initialize it manually.');
        }
    } catch (error) {
        await logger.error('❌ Error setting up workspace', error as Error);
        throw new Error(`Failed to setup workspace: ${error.message}`);
    }
}

export async function setupProblemStructure() {
    const baseDir = process.cwd();

    try {
        await logger.info('\n🚀 Setting up LeeGo workspace...\n');
        await setupProject(baseDir);
        await logger.success('\n✨ Workspace setup complete!\n');

        await logger.info('📂 Project structure:');
        await logger.info('├── .leetcode/           # Project configuration and logs');
        await logger.info('│   ├── config.json      # General configuration');
        await logger.info('│   ├── credentials.json # API keys and sensitive data');
        await logger.info('│   └── llm.ts          # Custom LLM implementation');
        await logger.info('├── 01-arrays-hashing/   # Problem categories');
        await logger.info('├── 02-two-pointers/');
        await logger.info('├── ...');
        await logger.info('└── package.json\n');

        await logger.info('🎯 Next steps:');
        await logger.info('1️⃣  Configure LeetCode credentials:');
        await logger.info('   leego set-cookies');
        await logger.info('2️⃣  (Optional) Set up AI integration:');
        await logger.info('   leego set-ai-key');
        await logger.info('3️⃣  Start practicing:');
        await logger.info('   leego add\n');

    } catch (error) {
        await logger.error('❌ Error setting up workspace:', error as Error);
        process.exit(1);
    }
}