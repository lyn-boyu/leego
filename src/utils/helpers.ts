import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { loadSensitiveConfig } from './config';
import { PROBLEM_TYPES, TAG_TO_TYPE_MAP, PROJECT_PATHS } from '../config/constants';
import { logger } from './logger';

interface Problem {
  title: string;
  difficulty: string;
  number: string;
}

interface ProblemCache {
  timestamp: number;
  problems: any[];
}

// 缓存有效期为一周 (7 * 24 * 60 * 60 * 1000 = 604800000 ms)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

async function loadProblemCache(): Promise<ProblemCache | null> {
  try {
    const cachePath = path.join(process.cwd(), PROJECT_PATHS.problems);
    const data = await readFile(cachePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveProblemCache(problems: any[]): Promise<void> {
  try {
    const cachePath = path.join(process.cwd(), PROJECT_PATHS.problems);
    const cache: ProblemCache = {
      timestamp: Date.now(),
      problems
    };
    await writeFile(cachePath, JSON.stringify(cache, null, 2));
  } catch (error) {
    await logger.error('Failed to save problem cache', error as Error);
  }
}

export function generateProblemFolderName(problem: Problem): string {
  return `${problem.number.padStart(4, '0')}-${problem.title.toLowerCase().replace(/\s+/g, '-')}-${problem.difficulty.toLowerCase()}`;
}

export function generateProblemPath(problemType: string, folderName: string): string {
  return path.join(process.cwd(), problemType, folderName);
}

export async function findProblemPath(problemNumber: string): Promise<string | null> {
  const baseDir = process.cwd();

  for (const type of PROBLEM_TYPES) {
    const typePath = path.join(baseDir, type);
    try {
      const entries = await readdir(typePath);
      const problemDir = entries.find(entry =>
        entry.startsWith(problemNumber.padStart(4, '0') + '-')
      );

      if (problemDir) {
        return path.join(typePath, problemDir);
      }
    } catch (error) {
      // Directory doesn't exist, continue to next type
      continue;
    }
  }

  return null;
}

export async function detectProblemType(problemNumber: string): Promise<string> {
  const config = await loadSensitiveConfig();

  try {
    // 先尝试从缓存加载
    const cache = await loadProblemCache();
    let problems;

    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      await logger.info('Using cached problem list');
      problems = cache.problems;
    } else {
      await logger.info('Fetching fresh problem list');
      // 获取新数据
      const response = await axios.get(`https://leetcode.com/api/problems/all/`, {
        headers: {
          Cookie: config.cookies
        }
      });
      problems = response.data.stat_status_pairs;

      // 保存到缓存
      await saveProblemCache(problems);
    }

    const problem = problems.find(
      (p: any) => p.stat.frontend_question_id === parseInt(problemNumber)
    );

    if (!problem) {
      throw new Error('Problem not found');
    }

    const titleSlug = problem.stat.question__title_slug;

    // Then fetch problem details to get tags
    const result = await axios.post(
      'https://leetcode.com/graphql',
      {
        query: `
          query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              topicTags {
                name
                slug
              }
            }
          }
        `,
        variables: { titleSlug }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: config.cookies
        }
      }
    );

    const tags = result.data.data.question.topicTags;

    // Find the first matching problem type from the tags
    for (const tag of tags) {
      const type = TAG_TO_TYPE_MAP[tag.name.toLowerCase()];
      if (type) {
        return type;
      }
    }

    // Default to arrays-hashing if no matching type found
    return '01-arrays-hashing';
  } catch (error) {
    console.error('Error detecting problem type:', error.message);
    return '01-arrays-hashing';
  }
}