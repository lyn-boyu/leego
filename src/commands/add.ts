import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { fetchProblemDetails } from '../utils/api';
import { generateSolutionTemplate, generateTest, generateReadme } from '../utils/generators';
import { detectProblemType, generateProblemFolderName, generateProblemPath } from '../utils/helpers';
import { findTemplates } from '../utils/github';
import { loadConfig } from '../utils/config';
import { LANGUAGE_FILES } from '../config/constants';
import { formatDate } from '../utils/date';

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
    console.log(chalk.blue('Checking for existing templates...'));
    const existingTemplates = await findTemplates(problemNumber, language);

    let template: string;
    let test: string;
    let readme: string;

    if (existingTemplates) {
      template = existingTemplates.solution || await generateSolutionTemplate(problem);
      test = existingTemplates.test || await generateTest(problem);
      readme = existingTemplates.readme || generateReadme(problem);
      console.log(chalk.green('Using existing templates from GitHub'));
    } else {
      template = await generateSolutionTemplate(problem);
      test = await generateTest(problem);
      readme = generateReadme(problem);
      console.log(chalk.blue(`No existing templates found. Generating new ones...`));
    }

    // Generate folder name and path using utility functions
    const folderName = generateProblemFolderName({
      number: problemNumber,
      title: problem.title,
      difficulty: problem.difficulty
    });
    const problemPath = generateProblemPath(problemType, folderName);

    // Create directory structure
    await mkdir(path.join(problemPath, '.meta', 'archives'), { recursive: true });

    // Get current timestamp
    const timestamp = formatDate(new Date());

    // Write files
    await Promise.all([
      writeFile(path.join(problemPath, fileConfig.solutionFileName), template),
      writeFile(path.join(problemPath, fileConfig.testFileName), test),
      writeFile(path.join(problemPath, 'README.md'), readme),
      writeFile(path.join(problemPath, '.meta', fileConfig.templateFileName), template),
      writeFile(path.join(problemPath, '.meta', 'metadata.json'), JSON.stringify({
        practice_logs: [{
          date: timestamp,
          action: 'start',
          start_time: timestamp,
          notes: 'Initial problem setup'
        }],
        title: problem.title,
        difficulty: problem.difficulty,
        language,
        total_practice_time: 0,
        last_practice: timestamp
      }, null, 2))
    ]);

    console.log(chalk.green(`\n✔ Problem ${problemNumber} setup complete!`));
    console.log(chalk.blue(`\nFolder created: ${problemPath}`));
  } catch (error) {
    console.error(chalk.red('Error adding problem:', error.message));
    process.exit(1);
  }
}