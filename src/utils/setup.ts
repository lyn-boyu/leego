import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { PROJECT_PATHS, DEFAULT_PROBLEM_TYPES, DEFAULT_APPROACHES } from '../config/constants';
import { logger } from './logger';
import type { LearningPlan } from '../types/study-plan';

/**
 * Ensures all required project directories exist
 */
export async function ensureProjectDirectories(): Promise<void> {
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
            await logger.debug(`📁 Created directory: ${dir}`);
        } catch (e: unknown) {
            if (e instanceof Error) {
                errors.push(new Error(`❌ Failed to create directory ${dir}: ${e.message}`));
            } else {
                errors.push(new Error(`❌ Failed to create directory ${dir}: Unknown error`));
            }
        }
    }

    if (errors.length > 0) {
        throw new Error(errors.map(e => e.message).join('\n'));
    }
}

/**
 * Creates the .gitignore file with project-specific paths
 */
export async function createGitignore(baseDir: string): Promise<void> {
    const gitignoreContent = `node_modules/
.env
.DS_Store

# LeeGo CLI directories
.leetgo/credentials.json
.leetgo/problems.json
.leetgo/logs/
`;

    try {
        await writeFile(path.join(baseDir, '.gitignore'), gitignoreContent);
        await logger.debug('📝 Created .gitignore file');
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new Error(`❌ Failed to create .gitignore: ${e.message}`);
        } else {
            throw new Error('❌ Failed to create .gitignore: Unknown error');
        }
    }
}

/**
 * Creates the default problem types configuration file
 */
export async function createProblemTypesConfig(baseDir: string): Promise<void> {
    try {
        const typesPath = path.join(baseDir, PROJECT_PATHS.problemCategories);
        await writeFile(typesPath, JSON.stringify(DEFAULT_PROBLEM_TYPES, null, 2));
        await logger.debug('📝 Created problem types configuration file');
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new Error(`❌ Failed to create problem types config: ${e.message}`);
        } else {
            throw new Error('❌ Failed to create problem types config: Unknown error');
        }
    }
}

/**
 * Creates the default approaches configuration file
 */
export async function createApproachesConfig(baseDir: string): Promise<void> {
    try {
        const approachesPath = path.join(baseDir, PROJECT_PATHS.approaches);
        await writeFile(approachesPath, JSON.stringify(DEFAULT_APPROACHES, null, 2));
        await logger.debug('📝 Created approaches configuration file');
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new Error(`❌ Failed to create approaches config: ${e.message}`);
        } else {
            throw new Error('❌ Failed to create approaches config: Unknown error');
        }
    }
}

/**
 * Creates the initial study plan file
 */
export async function createStudyPlanConfig(baseDir: string): Promise<void> {
    try {
        const initialPlan: LearningPlan = {
            categoryOrders: {},
            plan: [],
            dailyGoal: 1
        };

        const planPath = path.join(baseDir, PROJECT_PATHS.studyPlan);
        await writeFile(planPath, JSON.stringify(initialPlan, null, 2));
        await logger.debug('📝 Created study plan configuration file');
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new Error(`❌ Failed to create study plan config: ${e.message}`);
        } else {
            throw new Error('❌ Failed to create study plan config: Unknown error');
        }
    }
}

/**
 * Creates the custom LLM implementation template file
 */
export async function createLLMTemplate(baseDir: string): Promise<void> {
    const LLM_TEMPLATE = `/**
 * Custom LLM Implementation for LeeGo
 * 
 * This file allows you to integrate your own LLM implementation with LeeGo.
 * You can use any local or remote LLM service by implementing the generateWithAI function.
 * 
 * Requirements:
 * - Function must be async
 * - Must accept a prompt string parameter
 * - Must return a Promise<string> with the generated text
 * - Should handle errors appropriately
 * 
 * Example integrations:
 * - Local models (e.g., llama.cpp, ggml models)
 * - Self-hosted services
 * - Alternative AI providers
 * - Custom API endpoints
 */

export async function generateWithAI(prompt: string): Promise<string> {
  try {
    // TODO: Implement your custom LLM logic here
    // This is just a placeholder implementation
    throw new Error('Custom LLM not implemented');
    
    // Example implementation:
    // const response = await fetch('your-llm-endpoint', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ prompt })
    // });
    // const data = await response.json();
    // return data.text;
    
  } catch (error) {
    // Always wrap errors to provide context
    throw new Error(\`Custom LLM error: \${error.message}\`);
  }
}
`;

    try {
        const llmPath = path.join(baseDir, '.leetgo', 'llm.ts');
        await writeFile(llmPath, LLM_TEMPLATE);
        await logger.debug('🤖 Created custom LLM template file');
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new Error(`❌ Failed to create LLM template: ${e.message}`);
        } else {
            throw new Error('❌ Failed to create LLM template: Unknown error');
        }
    }
}