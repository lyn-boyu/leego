import axios from 'axios';
import chalk from 'chalk';
import { loadConfig } from './config';
import { LANGUAGE_FILES } from '../config/constants';
import { logger } from './logger';

const GITHUB_API = 'https://api.github.com';

interface GithubFile {
  name: string;
  path: string;
  content?: string;
}

interface TemplateFiles {
  solution?: string;
  test?: string;
  readme?: string;
}

type Language = keyof typeof LANGUAGE_FILES;

/**
 * Checks if a repository exists and is accessible
 */
async function checkRepository(owner: string, repoName: string): Promise<boolean> {
  try {
    await axios.get(`${GITHUB_API}/repos/${owner}/${repoName}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        await logger.info(`Repository ${owner}/${repoName} not found`);
        return false;
      }
      if (error.response?.status === 403) {
        await logger.info('GitHub API rate limit exceeded');
        return false;
      }
    }
    await logger.info(`Error checking repository: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Fetches file content from GitHub
 */
async function fetchFileContent(owner: string, repoName: string, path: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repoName}/contents/${path}`,
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );

    if (response.data.content) {
      return Buffer.from(response.data.content, 'base64').toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Finds and returns template files for a given problem number
 */
export async function findTemplates(
  problemNumber: string,
  language: Language = 'typescript'
): Promise<TemplateFiles | null> {
  const config = await loadConfig();
  const fileConfig = LANGUAGE_FILES[language];

  if (!config.githubRepo) {
    await logger.info('GitHub repository not configured, skipping template search');
    return null;
  }

  const { owner, name: repoName } = config.githubRepo;

  try {
    await logger.info(`Searching for templates in ${owner}/${repoName}`);

    // Check if repository exists and is accessible
    const repoExists = await checkRepository(owner, repoName);
    if (!repoExists) {
      return null;
    }

    // List repository contents
    const response = await axios.get(`${GITHUB_API}/repos/${owner}/${repoName}/contents`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });

    // Find problem directory
    const problemDirs = response.data.filter((item: GithubFile) =>
      item.name.startsWith(problemNumber.padStart(4, '0') + '-')
    );

    if (problemDirs.length === 0) {
      await logger.info(`No templates found for problem ${problemNumber}`);
      return null;
    }

    // Get directory contents
    const dirPath = problemDirs[0].path;
    await logger.info(`Found template directory: ${dirPath}`);

    // Fetch all template files
    const templates: TemplateFiles = {};

    // Solution file
    const solution = await fetchFileContent(owner, repoName, `${dirPath}/${fileConfig.solutionFileName}`);
    if (solution) {
      templates.solution = solution;
      await logger.info('Found solution template');
    }

    // Test file
    const test = await fetchFileContent(owner, repoName, `${dirPath}/${fileConfig.testFileName}`);
    if (test) {
      templates.test = test;
      await logger.info('Found test template');
    }

    // README file
    const readme = await fetchFileContent(owner, repoName, `${dirPath}/README.md`);
    if (readme) {
      templates.readme = readme;
      await logger.info('Found README template');
    }

    // Return null if no templates were found
    if (!templates.solution && !templates.test && !templates.readme) {
      await logger.info('No template files found in directory');
      return null;
    }

    return templates;
  } catch (error) {
    // Log error but don't throw
    await logger.info(`Error during template search: ${(error as Error).message}`);
    return null;
  }
}