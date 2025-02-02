#!/usr/bin/env bun
import { program } from 'commander';
import { addProblem } from './commands/add';
import { submitProblem } from './commands/submit';
import { startProblem } from './commands/start';
import { login, setCookies, setGithubRepo } from './commands/auth';
import { getProblemDetails } from './commands/problem';
import { showStats } from './commands/stats';
import { setApiKey } from './commands/ai';
import { setWeeklyGoals } from './commands/goals';
import { setupProblemStructure } from './commands/setup';
import { logger } from './utils/logger';

// Global debug option
program
  .option('-d, --debug', 'enable debug mode')
  .option('--log-retention <days>', 'set log retention period in days', '7')
  .option('-s, --silent', 'disable terminal output');

// Initialize logger based on global options
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts();
  logger.setDebug(!!opts.debug);
  logger.setLogRetention(parseInt(opts.logRetention));
  logger.setSilent(!!opts.silent);
});

// Add version and description
program
  .version('1.0.0')
  .description('LeetCode CLI Tool for managing practice sessions');

program
  .command('setup')
  .description('Setup initial problem structure and directories')
  .action(setupProblemStructure);

program
  .command('add [problemNumber]')
  .description('Add a new LeetCode problem')
  .action(addProblem);

program
  .command('submit <problemNumber>')
  .description('Submit a solution for a problem')
  .action(submitProblem);

program
  .command('start <problemNumber>')
  .description('Start practice for a problem')
  .action(startProblem);

program
  .command('login')
  .description('Login to LeetCode')
  .action(login);

program
  .command('set-cookies')
  .description('Set LeetCode cookies manually')
  .action(setCookies);

program
  .command('set-github')
  .description('Set GitHub repository for templates')
  .action(setGithubRepo);

program
  .command('problem <problemNumber>')
  .description('Get problem details')
  .action(getProblemDetails);

program
  .command('stats')
  .description('Show practice statistics in browser')
  .action(showStats);

program
  .command('set-ai-key')
  .description('Set AI provider and API key')
  .action(setApiKey);

program
  .command('set-goals')
  .description('Set weekly practice goals')
  .action(setWeeklyGoals);

program.parse(process.argv);