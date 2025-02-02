import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { findProblemPath } from '../utils/helpers';
import { formatDate } from '../utils/date';
import { loadConfig, updateConfig } from '../utils/config';
import { updateLearningStreak } from '../utils/streaks';
import { logger } from '../utils/logger';
import type { ProblemMetadata, PracticeLogs } from '../types/practice';

export async function startProblem(problemNumber: string) {
  try {
    const problemPath = await findProblemPath(problemNumber);
    if (!problemPath) {
      throw new Error(`Problem ${problemNumber} not found in workspace`);
    }

    // Read current solution and template
    const currentSolution = await readFile(path.join(problemPath, 'index.ts'), 'utf8');
    const template = await readFile(path.join(problemPath, '.meta', 'template.ts'), 'utf8');

    // Only archive if current solution differs from template
    if (currentSolution !== template) {
      const timestamp = formatDate(new Date());
      const archivePath = path.join(problemPath, '.meta', 'archives', `solution-${timestamp}.ts`);
      await writeFile(archivePath, currentSolution);
      await logger.info(`📦 Current solution archived: ${archivePath}`);
    }

    // Reset index.ts to template
    await writeFile(path.join(problemPath, 'index.ts'), template);

    // Update metadata
    const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
    const metadata: ProblemMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));

    const now = new Date();
    const formattedNow = formatDate(now);

    const practiceLog: PracticeLogs = {
      date: formattedNow,
      action: 'start',
      notes: '🎯 Started a new practice session.',
      startTime: formattedNow,
      problemNumber: metadata.problemNumber,
      title: metadata.title,
      difficulty: metadata.difficulty
    };

    metadata.practiceLogs.push(practiceLog);

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Update global learning progress
    const config = await loadConfig();
    config.learningProgress = updateLearningStreak(config.learningProgress, formattedNow);
    await updateConfig(config);

    await logger.success('\n✨ Problem reset successful!');
    await logger.info('🔄 Starting test watch mode...');

    // Start test watch mode with improved output
    const { spawn } = await import('child_process');
    const testProcess = spawn('bun', ['test', '--watch', path.join(problemPath, 'index.test.ts')], {
      stdio: 'inherit',
      env: {
        ...process.env,
        BUN_TEST_TIMEOUT: '5000', // 5 second timeout for tests
        BUN_TEST_COLOR: '1' // Force colored output
      }
    });

    testProcess.on('error', (error) => {
      logger.error('❌ Error running tests:', error as Error);
    });

  } catch (error) {
    await logger.error('❌ Error starting problem:', error as Error);
    process.exit(1);
  }
}