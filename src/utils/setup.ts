import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { PROJECT_PATHS } from '../config/constants';

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
        } catch (error) {
            errors.push(new Error(`Failed to create directory ${dir}: ${(error as Error).message}`));
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
.leetcode/credentials.json
.leetcode/problems.json
.leetcode/logs/
`;

    await writeFile(path.join(baseDir, '.gitignore'), gitignoreContent);
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
        const llmPath = path.join(baseDir, '.leetcode', 'llm.ts');
        await writeFile(llmPath, LLM_TEMPLATE);
    } catch (error) {
        throw new Error(`Failed to create LLM template: ${(error as Error).message}`);
    }
}