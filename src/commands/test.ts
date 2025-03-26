import { spawn } from 'child_process';
import path from 'path';
import { findProblemPath } from '../utils/helpers';
import { logger } from '../utils/logger';

interface TestOptions {
    watch?: boolean;
}

export async function testProblem(problemNumber: string, options: TestOptions = {}) {
    try {
        // Find problem path
        const problemPath = await findProblemPath(problemNumber);
        if (!problemPath) {
            throw new Error(`Problem ${problemNumber} not found in workspace`);
        }

        const testPath = path.join(problemPath, 'index.test.ts');
        await logger.info(`🧪 Running tests for problem ${problemNumber}...`);

        // Prepare test command arguments
        const args = ['test'];
        if (options.watch) {
            args.push('--watch');
        }
        args.push(testPath);

        // Run tests
        const testProcess = spawn('bun', args, {
            stdio: 'inherit',
            env: {
                ...process.env,
                BUN_TEST_TIMEOUT: '5000', // 5 second timeout for tests
                BUN_TEST_COLOR: '1' // Force colored output
            }
        });

        testProcess.on('error', (error) => {
            logger.error('Error running tests:', error as Error);
            process.exit(1);
        });

    } catch (error) {
        await logger.error('Error running tests:', error as Error);
        process.exit(1);
    }
}