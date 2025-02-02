import inquirer from 'inquirer';
import path from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { fetchProblemDetails } from '../utils/api';
import { generateSolutionTemplate, generateTest, generateReadme, generateSolution } from '../utils/generators';
import { detectProblemType, generateProblemFolderName, generateProblemPath } from '../utils/helpers';
import { findTemplates } from '../utils/github';
import { loadConfig } from '../utils/config';
import { LANGUAGE_FILES } from '../config/constants';
import { formatDate } from '../utils/date';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import type { ProblemMetadata, PracticeLogs } from '../types/practice';

async function validateTests(problemPath: string, language: keyof typeof LANGUAGE_FILES): Promise<{ passed: boolean, output: string }> {
  return new Promise((resolve) => {
    const fileConfig = LANGUAGE_FILES[language];
    const testProcess = spawn('bun', ['test', path.join(problemPath, fileConfig.testFileName)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BUN_TEST_TIMEOUT: '15000', // 15 second timeout for tests
        BUN_TEST_COLOR: '1', // Force colored output
        FORCE_COLOR: '3'  // Force maximum color support
      }
    });

    let output = '';
    let timeoutId;

    // Set timeout to 15 seconds
    timeoutId = setTimeout(() => {
      testProcess.kill();
      resolve({
        passed: false,
        output: output + '\nTest execution timed out after 15 seconds'
      });
    }, 15000);

    // Pipe test output directly to maintain colors
    testProcess.stdout.pipe(process.stdout);
    testProcess.stderr.pipe(process.stderr);

    // Also collect output for analysis
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    testProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      // Parse test results
      const failMatch = output.match(/(\d+) fail/);
      const failCount = failMatch ? parseInt(failMatch[1]) : 0;
      const hasFailures = failCount > 0;

      if (hasFailures) {
        resolve({
          passed: false,
          output
        });
      } else if (code !== 0) {
        resolve({
          passed: false,
          output
        });
      } else {
        resolve({
          passed: true,
          output
        });
      }
    });
  });
}

export async function addProblem(problemNumber: string) {
  try {
    // If problem number is not provided, prompt for it
    if (!problemNumber) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'problemNumber',
          message: 'Please enter the problem number:',
          validate: (input) => !isNaN(parseInt(input))
        }
      ]);
      problemNumber = answer.problemNumber;
    }

    // Load language from config
    const config = await loadConfig();
    const language = config.language;
    const fileConfig = LANGUAGE_FILES[language];

    // Fetch problem details
    const problem = await fetchProblemDetails(problemNumber);

    // Confirm problem details
    const { confirmDetails } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDetails',
        message: `Problem detected: ${problem.title} (${problem.difficulty})\nIs this correct?`,
        default: true
      }
    ]);

    if (!confirmDetails) {
      const { customTitle, customDifficulty } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customTitle',
          message: 'Please enter the correct problem name:'
        },
        {
          type: 'list',
          name: 'customDifficulty',
          message: 'Please select the correct difficulty:',
          choices: ['Easy', 'Medium', 'Hard']
        }
      ]);
      problem.title = customTitle;
      problem.difficulty = customDifficulty;
    }

    // Detect problem type based on tags
    const problemType = await detectProblemType(problemNumber);

    // Check GitHub for existing templates
    await logger.info('🔍 Checking for existing templates in your leego workspace...');
    const existingTemplates = await findTemplates(problemNumber, language);

    let initialSolution: string;
    let test: string;
    let readme: string;
    let solution: string;

    // Generate folder name and path using utility functions
    const folderName = generateProblemFolderName({
      number: problemNumber,
      title: problem.title,
      difficulty: problem.difficulty
    });
    const problemPath = generateProblemPath(problemType, folderName);

    // Create directory structure
    await mkdir(path.join(problemPath, '.meta', 'archives'), { recursive: true });

    if (existingTemplates) {
      initialSolution = existingTemplates.solution || await generateSolutionTemplate(problem);
      test = existingTemplates.test || await generateTest(problem);
      readme = existingTemplates.readme || await generateReadme(problem);
      solution = existingTemplates.optimalSolution || await generateSolution(problem);
      await logger.success('✨ Found existing templates in leego workspace');
    } else {
      await logger.info('🔨 No existing templates found. Generating new ones for your leego workspace...');

      // Generate solution first
      solution = await generateSolution(problem);
      initialSolution = await generateSolutionTemplate(problem);

      // Generate and validate test cases
      let testValidated = false;
      let attempts = 0;
      let testOutput = '';
      let previousTest = '';

      while (!testValidated && attempts < 5) {
        attempts++;
        await logger.info(`🧪 Generating test cases for leego (attempt ${attempts}/5)...`);

        // Create temporary directory for validation in .meta folder
        const tempDir = path.join(problemPath, '.meta', 'temp-validation');
        await mkdir(tempDir, { recursive: true });

        // Write temporary files for validation using language-specific extensions
        const solutionFile = path.join(tempDir, fileConfig.solutionFileName);
        const testFile = path.join(tempDir, fileConfig.testFileName);

        await writeFile(solutionFile, solution);
        test = await generateTest(problem, {
          previousTest,
          solution,
          testOutput
        });
        previousTest = test; // Save current test case code
        await writeFile(testFile, test);

        // Validate tests
        const { passed, output } = await validateTests(tempDir, language);
        testOutput = output;

        if (passed) {
          testValidated = true;
          await logger.success('✅ Test cases validated successfully for your leetcode solution');
        } else {
          await logger.warn(`⚠️ Test validation failed (attempt ${attempts}/5)`);
          if (attempts === 5) {
            await logger.warn('❌ Could not generate valid test cases after 5 attempts');
            await logger.warn('⚠️ Using the last generated test cases - please review them carefully');
          }
        }
      }

      readme = await generateReadme(problem);
    }

    // Get current timestamp
    const timestamp = formatDate(new Date());

    // Create initial practice log
    const practiceLog: PracticeLogs = {
      date: timestamp,
      action: 'start',
      startTime: timestamp,
      notes: 'Initial problem setup in leego workspace',
      problemNumber: problemNumber,
      title: problem.title,
      difficulty: problem.difficulty
    };

    // Create metadata
    const metadata: ProblemMetadata = {
      practiceLogs: [practiceLog],
      problemNumber: problemNumber,
      title: problem.title,
      difficulty: problem.difficulty,
      language,
      totalPracticeTime: 0,
      lastPractice: timestamp
    };

    // Write files with language-specific extensions
    await Promise.all([
      writeFile(path.join(problemPath, fileConfig.solutionFileName), initialSolution),
      writeFile(path.join(problemPath, fileConfig.testFileName), test!),
      writeFile(path.join(problemPath, 'README.md'), readme),
      writeFile(path.join(problemPath, '.meta', fileConfig.templateFileName), initialSolution),
      writeFile(path.join(problemPath, '.meta', `solution${fileConfig.extension}`), solution),
      writeFile(path.join(problemPath, '.meta', 'metadata.json'), JSON.stringify(metadata, null, 2))
    ]);

    await logger.success(`\n🎉 Problem ${problemNumber} setup complete in your leego workspace!`);
    await logger.info(`\n📁 Problem folder created: ${problemPath}`);
  } catch (error) {
    await logger.error('❌ Error adding problem to leego workspace:', error as Error);
    process.exit(1);
  }
}