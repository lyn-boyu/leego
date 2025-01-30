import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import { updateSensitiveConfig, loadSensitiveConfig, loadConfig, updateConfig } from '../utils/config';

const LEETCODE_LOGIN = 'https://leetcode.com/accounts/login';

export async function login() {
  console.log(chalk.yellow('\n⚠️  Note: Using cookies is the recommended authentication method.'));
  console.log(chalk.yellow('    Run `leetco set-cookies` instead for a more reliable experience.\n'));

  const questions = [
    {
      type: 'input',
      name: 'username',
      message: 'Enter your LeetCode username:'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter your LeetCode password:'
    }
  ];

  try {
    const credentials = await inquirer.prompt(questions);
    const response = await axios.post(LEETCODE_LOGIN, credentials);
    const cookies = response.headers['set-cookie']?? [];

    await updateSensitiveConfig({ cookies: cookies.join('; ') });
    console.log(chalk.green('Login successful! Session saved.'));
  } catch (error) {
    console.error(chalk.red('Login failed:', error.message));
    console.log(chalk.yellow('\nTip: If login fails, try using cookies instead:'));
    console.log(chalk.blue('1. Log in to LeetCode in Chrome'));
    console.log(chalk.blue('2. Open DevTools (F12)'));
    console.log(chalk.blue('3. Go to Network tab and select "XHR"'));
    console.log(chalk.blue('4. Click any button on leetcode.com'));
    console.log(chalk.blue('5. Find the cookie in request headers'));
    console.log(chalk.blue('6. Run: leetco set-cookies'));
    process.exit(1);
  }
}

export async function setCookies() {
  console.log(chalk.blue('\nHow to get your LeetCode cookies:'));
  console.log('1. Log in to leetcode.com in Chrome/Edge');
  console.log('2. Press F12 to open DevTools');
  console.log('3. Switch to "Network" tab');
  console.log('4. Filter by "XHR" (click XHR at the top)');
  console.log('5. Click any button on leetcode.com to trigger a request');
  console.log('6. Click any request to leetcode.com in the Network panel');
  console.log('7. In the request details, find "Headers" tab');
  console.log('8. Look for "Cookie:" under "Request Headers"');
  console.log('9. Copy the entire cookie string\n');

  console.log(chalk.yellow('Important: The cookie string should contain "cf_clearance="\n'));

  const questions = [
    {
      type: 'password',
      name: 'cookies',
      message: 'Paste your LeetCode cookies:',
      validate: (input: string) => {
        if (!input) return 'Cookies are required';

        // Only check for cf_clearance
        if (!input.includes('cf_clearance=')) {
          return 'Invalid cookie format. Cookie string must contain "cf_clearance="';
        }

        return true;
      }
    }
  ];

  try {
    const { cookies } = await inquirer.prompt(questions);

    // Verify cookies work by making a test request
    try {
      await axios.get('https://leetcode.com/api/problems/all/', {
        headers: { Cookie: cookies }
      });
    } catch (error) {
      throw new Error('Invalid cookies. Please make sure you copied them correctly and are logged in.');
    }

    await updateSensitiveConfig({ cookies });
    console.log(chalk.green('\n✔ Cookies set successfully!'));
    console.log(chalk.blue('You can now use leetco to manage your LeetCode practice.'));
  } catch (error) {
    console.error(chalk.red('\nFailed to set cookies:', error.message));
    process.exit(1);
  }
}

export async function setGithubRepo() {
  try {
    const { owner, name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'owner',
        message: 'Enter GitHub repository owner:',
        default: 'lyn-boyu'
      },
      {
        type: 'input',
        name: 'name',
        message: 'Enter GitHub repository name:',
        default: 'leetcode-template-typescript'
      }
    ]);

    await updateConfig({
      githubRepo: { owner, name }
    });

    console.log(chalk.green('\n✔ GitHub repository configured successfully!'));
    console.log(chalk.blue(`Repository: ${owner}/${name}`));
  } catch (error) {
    console.error(chalk.red('Error setting GitHub repository:', error.message));
    process.exit(1);
  }
}