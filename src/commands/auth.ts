import inquirer from 'inquirer';
import axios from 'axios';
import { updateSensitiveConfig, loadSensitiveConfig, loadConfig, updateConfig } from '../utils/config';
import { logger } from '../utils/logger';

const LEETCODE_LOGIN = 'https://leetcode.com/accounts/login';

export async function login() {
  await logger.warn('\n⚠️  Note: Using cookies is the recommended authentication method.');
  await logger.warn('    Run `leetco set-cookies` instead for a more reliable experience.\n');

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
    const cookies = response.headers['set-cookie'] ?? [];

    await updateSensitiveConfig({ cookies: cookies.join('; ') });
    await logger.success('🔑 Login successful! Session saved.');
  } catch (error) {
    await logger.error('❌ Login failed:', error as Error);
    await logger.info('\n💡 Tip: If login fails, try using cookies instead:');
    await logger.info('1. 🌐 Log in to LeetCode in Chrome');
    await logger.info('2. 🔧 Open DevTools (F12)');
    await logger.info('3. 🔍 Go to Network tab and select "XHR"');
    await logger.info('4. 🖱️  Click any button on leetcode.com');
    await logger.info('5. 🔎 Find the cookie in request headers');
    await logger.info('6. ⌨️  Run: leetco set-cookies');
    process.exit(1);
  }
}

export async function setCookies() {
  await logger.info('\n🔑 How to get your LeetCode cookies:');
  await logger.info('1. 🌐 Log in to leetcode.com in Chrome/Edge');
  await logger.info('2. 🔧 Press F12 to open DevTools');
  await logger.info('3. 🔍 Switch to "Network" tab');
  await logger.info('4. 🔎 Filter by "XHR" (click XHR at the top)');
  await logger.info('5. 🖱️  Click any button on leetcode.com to trigger a request');
  await logger.info('6. 📋 Click any request to leetcode.com in the Network panel');
  await logger.info('7. 🔍 In the request details, find "Headers" tab');
  await logger.info('8. 🔎 Look for "Cookie:" under "Request Headers"');
  await logger.info('9. 📝 Copy the entire cookie string\n');

  await logger.warn('⚠️  Important: The cookie string should contain "cf_clearance="\n');

  const questions = [
    {
      type: 'password',
      name: 'cookies',
      message: 'Paste your LeetCode cookies:',
      validate: (input: string) => {
        if (!input) return 'Cookies are required';

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
    await logger.success('\n✅ Cookies set successfully!');
    await logger.info('🚀 You can now use leetco to manage your LeetCode practice.');
  } catch (error) {
    await logger.error('\n❌ Failed to set cookies:', error as Error);
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

    await logger.success('\n✅ GitHub repository configured successfully!');
    await logger.info(`📦 Repository: ${owner}/${name}`);
  } catch (error) {
    await logger.error('❌ Error setting GitHub repository:', error as Error);
    process.exit(1);
  }
}