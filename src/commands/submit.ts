
import path from 'path';
import inquirer from 'inquirer';
import inquirerPromptAutocomplete from 'inquirer-autocomplete-prompt';
import { spawn } from 'child_process';
import { findProblemPath } from '../utils/helpers';
import { formatDate } from '../utils/date';
import { loadConfig, updateConfig } from '../utils/config';
import { updateLearningStreak, updateWeeklyProgress } from '../utils/streaks';
import { commitProblemChanges } from '../utils/git';
import { logger } from '../utils/logger';
import type { TestStatus, FeedbackType } from '../types/practice';
import { loadApproaches, fuzzySearch } from '../utils/approaches';
import {
  createPracticeLog,
  addPracticeLog,
  loadProblemMetadata,
  calculateSessionTimeSpent,
} from '../utils/practice-logs';
import { completeStudyPlanItem } from '../utils/plan';

// Register the autocomplete prompt
inquirer.registerPrompt('autocomplete', inquirerPromptAutocomplete);

const FEEDBACK_CHOICES = [
  {
    name: '🧠 Completely forgot (Reset interval)',
    value: '0',
    description: 'Could not solve or recall the solution at all'
  },
  {
    name: '⚠️ Difficult recall (Reduce interval)',
    value: '1',
    description: 'Eventually solved but took significant effort'
  },
  {
    name: '✅ Good recall (Increase interval)',
    value: '2',
    description: 'Solved with some thought, remembered key concepts'
  },
  {
    name: '⭐ Very easy (Extend interval)',
    value: '3',
    description: 'Solved immediately, perfect recall'
  }
];

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
  let status: TestStatus = 'failed';

  const processPromise = new Promise<number>((resolve, reject) => {
    let timeoutId: Timer;

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
      status = 'timeout';
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
      status = 'failed';
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

    // Load metadata
    const metadata = await loadProblemMetadata(problemPath);

    // Calculate default time spent
    const defaultTimeSpent = calculateSessionTimeSpent(metadata.practiceLogs);

    const isReview = metadata.practiceLogs.length >= 2;

    // Load available approaches
    const approaches = await loadApproaches();

    // Create fuzzy search function for approaches
    const searchApproaches = async (answers: any, input: string = '') => {
      return fuzzySearch(input, approaches);
    };

    const questions: any[] = [
      {
        type: 'input',
        name: 'timeSpent',
        message: 'How long did you spend on this problem (in minutes)?',
        default: defaultTimeSpent,
        validate: (input: string) => !isNaN(parseInt(input))
      },
      {
        type: 'input',
        name: 'notes',
        message: 'Any notes about your solution? (optional)'
      },
      {
        type: 'autocomplete',
        name: 'approach',
        message: 'What approach did you use? (Type to search)',
        source: searchApproaches,
        pageSize: 10,
        emptyText: 'No matching approaches found',
        searchText: 'Searching...'
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
      },
    ]
    if (isReview) {
      questions.push({
        type: 'list',
        name: 'feedback',
        message: 'How well did you remember this problem?',
        choices: FEEDBACK_CHOICES.map(choice => ({
          name: `${choice.name}\n   ${choice.description}`,
          value: choice.value
        })),
        default: '2',
        pageSize: 8
      })
    }
    // Get submission details from user
    const { timeSpent, notes, approach, timeComplexity, spaceComplexity, feedback = 2 } = await inquirer.prompt(questions);

    // Create submission log
    const practiceLog = createPracticeLog('submit', metadata, {
      timeSpent,
      approach,
      timeComplexity,
      spaceComplexity,
      status: 'passed',
      notes: notes || undefined,
      feedback: Number.parseInt(feedback) as FeedbackType
    });

    // Add log to metadata
    const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
    await addPracticeLog(metadata, practiceLog, metadataPath);
    await completeStudyPlanItem(problemNumber)


    // Update global learning progress
    const config = await loadConfig();
    config.learningProgress = updateLearningStreak(config.learningProgress, formatDate(new Date()));
    config.weeklyProgress = updateWeeklyProgress(config.weeklyProgress, problemNumber, formatDate(new Date()));
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
        status: 'passed'
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

    // Show spaced repetition info
    if (practiceLog.nextReviewDate) {
      await logger.info(`📅 Next review scheduled for: ${practiceLog.nextReviewDate}`);
      if (practiceLog.ef && practiceLog.interval) {
        await logger.info(`📊 Current EF: ${practiceLog.ef.toFixed(2)}, Interval: ${practiceLog.interval} days`);
      }
    }

    // Show weekly progress
    await logger.info('\n📊 Weekly Progress:');
    await logger.info(`📈 Problems solved this week: ${config.weeklyProgress.current}/${config.weeklyProgress.target}`);

    const formattedProblems = await Promise.all(config.weeklyProgress.problems.map(async num => {
      const problemPath = await findProblemPath(num);
      if (problemPath) {
        try {
          const metadata = await loadProblemMetadata(problemPath);
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

function formatProblemWithDifficulty(problemNumber: string, difficulty: string): string {
  const difficultyMap: Record<string, string> = {
    'easy': 'E',
    'medium': 'M',
    'hard': 'H'
  };
  return `${problemNumber}${difficultyMap[difficulty.toLowerCase()] || ''}`;
}