import chalk from 'chalk';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import { spawn } from 'child_process';
import { findProblemPath } from '../utils/helpers';
import { formatDate, parseDate } from '../utils/date';
import { loadConfig, updateConfig } from '../utils/config';
import { updateLearningStreak, updateWeeklyProgress } from '../utils/streaks';
import { commitProblemChanges } from '../utils/git';

interface SubmissionMetadata {
  date: string;
  action: 'submit';
  time_spent: string;
  approach: string;
  time_complexity: string;
  space_complexity: string;
  status: 'passed' | 'failed' | 'timeout';
  notes?: string;
}
type SubmissionStatus = 'passed' | 'failed' | 'timeout';

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
  status: SubmissionStatus;
  output: string;
}> {
  console.log(chalk.blue('Running tests...'));

  const testProcess = spawn('bun', ['test', testPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      BUN_TEST_TIMEOUT: '5000',
      BUN_TEST_COLOR: '1'
    }
  });

  let output = '';
  let status: SubmissionStatus = 'failed' as SubmissionStatus;

  const processPromise = new Promise<number>((resolve, reject) => {
    let timeoutId;

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

    // Parse test results
    const statMatch = output.match(/(\d+)\s+pass\s+(\d+)\s+fail/);
    if (statMatch) {
      const [, passCount, failCount] = statMatch.map(Number);

      // Tests pass if we have passing tests and no failures
      if (passCount > 0 && failCount === 0 && exitCode === 0) {
        status = 'passed';
        console.log(chalk.green('\n✔ All tests passed!'));
      } else {
        console.log(chalk.red('\n✖ Tests failed.'));
      }

      console.log('\n' + chalk.gray('Test Summary:'));
      console.log(chalk.gray(`• Tests: ${passCount} passed, ${failCount} failed`));
    }

  } catch (error) {
    if (status !== 'timeout') {
      status = 'failed';
    }
    console.error(chalk.red(
      status === 'timeout'
        ? '\n⚠️ Tests timed out. This might indicate an infinite loop in your solution.'
        : '\n✖ Tests failed with an error.'
    ));
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
      console.log(chalk.yellow(
        status === 'timeout'
          ? '\nPlease check your solution for infinite loops or long-running operations.'
          : '\nPlease fix the failing tests before submitting.'
      ));
      process.exit(1);
    }

    // Read current metadata
    const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

    // Calculate default time spent
    const now = new Date();
    const formattedNow = formatDate(now);
    let defaultTimeSpent = '30m'; // Default if no start time found

    // Find the most recent 'start' action in practice logs
    const lastStartLog = [...metadata.practice_logs].reverse()
      .find(log => log.action === 'start' && log.start_time);

    if (lastStartLog) {
      defaultTimeSpent = calculateTimeSpent(lastStartLog.start_time, formattedNow);
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
    const submission: SubmissionMetadata = {
      date: formattedNow,
      action: 'submit',
      time_spent: timeSpent,
      approach,
      time_complexity: timeComplexity,
      space_complexity: spaceComplexity,
      status: 'passed', // All tests passed at this point
      notes: notes || undefined
    };

    // Update metadata
    metadata.practice_logs.push(submission);
    metadata.last_practice = formattedNow;
    metadata.total_practice_time = (metadata.total_practice_time || 0) + parseInt(timeSpent);

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
        status: 'passed'
      });
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Failed to commit changes to git:', error.message));
    }

    // Show submission summary
    console.log(chalk.green('\n✔ Problem submitted successfully!'));

    console.log(chalk.blue('\nSubmission Summary:'));
    console.log(`Time Spent: ${timeSpent}`);
    console.log(`Approach: ${approach}`);
    console.log(`Time Complexity: ${timeComplexity}`);
    console.log(`Space Complexity: ${spaceComplexity}`);
    console.log(`Status: passed`);
    if (notes) {
      console.log(`Notes: ${notes}`);
    }

    // Show weekly progress with formatted problem numbers
    console.log(chalk.blue('\nWeekly Progress:'));
    console.log(`Problems solved this week: ${config.weeklyProgress.current}/${config.weeklyProgress.target}`);

    // Get formatted problems with proper async handling
    const formattedProblems = await Promise.all(config.weeklyProgress.problems.map(async num => {
      const problemPath = await findProblemPath(num);
      if (problemPath) {
        try {
          const metadataContent = await readFile(path.join(problemPath, '.meta', 'metadata.json'), 'utf8');
          const metadata = JSON.parse(metadataContent);
          return formatProblemWithDifficulty(num, metadata.difficulty);
        } catch (error) {
          console.error(chalk.red(`Error reading metadata for problem ${num}:`, error.message));
          return num;
        }
      }
      return num;
    }));

    console.log(`Problems: ${formattedProblems.join(', ')}`);

    if (config.weeklyProgress.current >= config.weeklyProgress.target) {
      console.log(chalk.green('\n🎉 Congratulations! You\'ve reached your weekly goal!'));
    }

    // Show streak information
    console.log(chalk.blue('\nCurrent Streak:'), `${config.learningProgress.current_streak.days} days`);
    console.log(chalk.blue('Total Problems:'), config.learningProgress.total_problems);

  } catch (error) {
    console.error(chalk.red('Error submitting problem:', error.message));
    process.exit(1);
  }
}