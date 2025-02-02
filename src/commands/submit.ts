import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { findProblemPath } from '../utils/helpers';
import { formatDate, parseDate } from '../utils/date';
import { loadConfig, updateConfig } from '../utils/config';
import { updateLearningStreak, updateWeeklyProgress } from '../utils/streaks';
import { commitProblemChanges } from '../utils/git';
import { logger } from '../utils/logger';
import type { ProblemMetadata, TestStatus, PracticeLogs } from '../types/practice';

function calculateTimeSpent(startTime: string, endTime: string): string {
  const start = parseDate(startTime);
  const end = parseDate(endTime);
  const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  return `${diffMinutes}m`;
}

function formatProblemWithDifficulty(problemNumber: string, difficulty: string): string {
  const difficultyMap: Record<string, string> = {
    'easy': 'E',
    'medium': 'M',
    'hard': 'H'
  };
  return `${problemNumber}${difficultyMap[difficulty.toLowerCase()] || ''}`;
}

async function runTests(testPath: string): Promise<{
  status: TestStatus;
  output: string;
}> {
  await logger.info('🧪 Running tests...');

  const testProcess = spawn('bun', ['test', testPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      BUN_TEST_TIMEOUT: '5000',
      BUN_TEST_COLOR: '1'
    }
  });

  let output = '';
  let status: TestStatus = 'failed' as TestStatus;

  const processPromise = new Promise<number>((resolve, reject) => {
    let timeoutId: Timer

    testProcess.on('exit', (code) => {
      clearTimeout(timeoutId);
      resolve(code ?? 1);
    });

    testProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });

    timeoutId = setTimeout(() => {
      testProcess.kill('SIGTERM');
      status = 'timeout' as TestStatus;
      reject(new Error('Test execution timed out'));
    }, 15000);
  });

  const outputPromise = new Promise<string>((resolve) => {
    testProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    testProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    testProcess.on('close', () => resolve(output));
  });

  try {
    const [exitCode] = await Promise.all([processPromise, outputPromise]);

    // Parse test results using fail count
    const failMatch = output.match(/(\d+) fail/);
    const failCount = failMatch ? parseInt(failMatch[1]) : 0;
    const hasFailures = failCount > 0;

    if (!hasFailures && exitCode === 0) {
      status = 'passed' as TestStatus;
      await logger.success('\n✅ All tests passed!');
    } else {
      await logger.error('\n❌ Tests failed.');
    }

    await logger.info('\n📊 Test Summary:');
    await logger.info(`📈 Tests: ${hasFailures ? `${failCount} failed` : 'all passed'}`);

  } catch (error) {
    if (status !== 'timeout') {
      status = 'failed' as TestStatus;
    }
    await logger.error(
      status === 'timeout'
        ? '\n⚠️ Tests timed out. This might indicate an infinite loop in your solution.'
        : '\n❌ Tests failed with an error.'
    );
  }

  return { status, output };
}

export async function submitProblem(problemNumber: string) {
  try {
    if (!problemNumber) {
      const answer = await inquirer.prompt([{
        type: 'input',
        name: 'problemNumber',
        message: 'Enter the problem number:',
        validate: (input: string) => {
          if (!input) return 'Problem number is required';
          if (isNaN(parseInt(input))) return 'Please enter a valid number';
          return true;
        }
      }]);
      problemNumber = answer.problemNumber;
    }

    const problemPath = await findProblemPath(problemNumber);
    if (!problemPath) {
      throw new Error(`Problem ${problemNumber} not found in workspace`);
    }

    // Run tests
    const testPath = path.join(problemPath, 'index.test.ts');
    const { status, output } = await runTests(testPath);

    // Handle test results
    if (status !== 'passed') {
      await logger.warn(
        status === 'timeout'
          ? '\n⚠️ Please check your solution for infinite loops or long-running operations.'
          : '\n⚠️ Please fix the failing tests before submitting.'
      );
      process.exit(1);
    }

    // Read current metadata
    const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
    const metadata: ProblemMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));

    // Calculate default time spent
    const now = new Date();
    const formattedNow = formatDate(now);
    let defaultTimeSpent = '30m'; // Default if no start time found

    // Find the most recent 'start' action in practice logs
    const lastStartLog = [...metadata.practiceLogs].reverse()
      .find(log => log.action === 'start' && log.startTime);

    if (lastStartLog?.startTime) {
      defaultTimeSpent = calculateTimeSpent(lastStartLog.startTime, formattedNow);
    }

    // Get submission details from user
    const { timeSpent, notes, approach, timeComplexity, spaceComplexity } = await inquirer.prompt([
      {
        type: 'input',
        name: 'timeSpent',
        message: 'How long did you spend on this problem (in minutes)?',
        default: defaultTimeSpent.toString(),
        validate: (input) => !isNaN(parseInt(input))
      },
      {
        type: 'input',
        name: 'notes',
        message: 'Any notes about your solution? (optional)'
      },
      {
        type: 'list',
        name: 'approach',
        message: 'What approach did you use?',
        choices: [
          'Brute Force',
          'Two Pointers',
          'Sliding Window',
          'Binary Search',
          'Hash Table',
          'Dynamic Programming',
          'DFS',
          'BFS',
          'Other'
        ]
      },
      {
        type: 'input',
        name: 'timeComplexity',
        message: 'What is the time complexity? (e.g., O(n))',
        default: 'O(n)'
      },
      {
        type: 'input',
        name: 'spaceComplexity',
        message: 'What is the space complexity? (e.g., O(1))',
        default: 'O(1)'
      }
    ]);

    // Create submission record
    const submission: PracticeLogs = {
      date: formattedNow,
      action: 'submit',
      timeSpent,
      approach,
      timeComplexity,
      spaceComplexity,
      status: 'passed' as TestStatus, // All tests passed at this point
      notes: notes || undefined,
      problemNumber,
      title: metadata.title,
      difficulty: metadata.difficulty
    };

    // Update metadata
    metadata.practiceLogs.push(submission);
    metadata.lastPractice = formattedNow;
    metadata.totalPracticeTime = (metadata.totalPracticeTime || 0) + parseInt(timeSpent);

    // Save metadata
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Update global learning progress
    const config = await loadConfig();
    config.learningProgress = updateLearningStreak(config.learningProgress, formattedNow);
    config.weeklyProgress = updateWeeklyProgress(config.weeklyProgress, problemNumber, formattedNow);
    await updateConfig(config);

    // Commit changes to git
    try {
      await commitProblemChanges(problemPath, {
        problemNumber,
        title: metadata.title || `Problem ${problemNumber}`,
        difficulty: metadata.difficulty || 'Unknown',
        timeSpent,
        approach,
        timeComplexity,
        spaceComplexity,
        status: 'passed' as TestStatus
      });
    } catch (error) {
      await logger.warn('\n⚠️ Failed to commit changes to git:', error as Error);
    }

    // Show submission summary
    await logger.success('\n✨ Problem submitted successfully!');

    await logger.info('\n📝 Submission Summary:');
    await logger.info(`⏱️  Time Spent: ${timeSpent}`);
    await logger.info(`🔍 Approach: ${approach}`);
    await logger.info(`⚡ Time Complexity: ${timeComplexity}`);
    await logger.info(`💾 Space Complexity: ${spaceComplexity}`);
    await logger.info(`✅ Status: passed`);
    if (notes) {
      await logger.info(`📌 Notes: ${notes}`);
    }

    // Show weekly progress
    await logger.info('\n📊 Weekly Progress:');
    await logger.info(`📈 Problems solved this week: ${config.weeklyProgress.current}/${config.weeklyProgress.target}`);

    // Get formatted problems with proper async handling
    const formattedProblems = await Promise.all(config.weeklyProgress.problems.map(async num => {
      const problemPath = await findProblemPath(num);
      if (problemPath) {
        try {
          const metadataContent = await readFile(path.join(problemPath, '.meta', 'metadata.json'), 'utf8');
          const metadata: ProblemMetadata = JSON.parse(metadataContent);
          return formatProblemWithDifficulty(num, metadata.difficulty);
        } catch (error) {
          await logger.error(`❌ Error reading metadata for problem ${num}:`, error as Error);
          return num;
        }
      }
      return num;
    }));

    await logger.info(`📋 Problems: ${formattedProblems.join(', ')}`);

    if (config.weeklyProgress.current >= config.weeklyProgress.target) {
      await logger.success('\n🎉 Congratulations! You\'ve reached your weekly goal!');
    }

    // Show streak information
    await logger.info('\n🔥 Current Streak:', `${config.learningProgress.currentStreak.days} days`);
    await logger.info('📚 Total Problems:', config.learningProgress.totalProblems);

  } catch (error) {
    await logger.error('❌ Error submitting problem:', error as Error);
    process.exit(1);
  }
}