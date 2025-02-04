import axios from 'axios';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { loadSensitiveConfig } from './config';
import { PROJECT_PATHS } from '../config/constants';
import { logger } from './logger';


export interface ProblemDetails {
  questionId: string
  questionFrontendId: string
  title: string
  difficulty: string
  content: string
  topicTags: { name: string }[];
  number: string;
}


export interface LeetCodeProblem {
  stat: Stat
  status: any
  difficulty: Difficulty
  paid_only: boolean
  is_favor: boolean
  frequency: number
  progress: number
}

export interface Stat {
  question_id: number
  question__article__live: any
  question__article__slug: any
  question__article__has_video_solution: any
  question__title: string
  question__title_slug: string
  question__hide: boolean
  total_acs: number
  total_submitted: number
  frontend_question_id: number
  is_new_question: boolean
}

export interface Difficulty {
  level: number
}


export interface ProblemCache {
  timestamp: number;
  problems: LeetCodeProblem[];
}


const LEETCODE_API = 'https://leetcode.com/graphql';


/**
 * Get problem details from LeetCode GraphQL API
 */
export async function fetchProblemDetails(titleSlug: string): Promise<ProblemDetails> {
  const config = await loadSensitiveConfig();
  const response = await axios.post(
    LEETCODE_API,
    {
      query: `
        query getProblem($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            questionFrontendId
            title
            difficulty
            content
            topicTags {
              name
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
  const question = response.data.data.question
  question.number = question.questionFrontendId + '';
  return question as ProblemDetails;
}



// valid for 4 weeks ( 4 * 7 * 24 * 60 * 60 * 1000 = 604800000 ms)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

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

export async function getAllLeetCodeProblems(): Promise<LeetCodeProblem[]> {
  const cache = await loadProblemCache();

  let problems: LeetCodeProblem[];

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    await logger.info('Using cached problem list');
    problems = cache.problems;

  } else {
    await logger.info('Fetching fresh problem list');
    const config = await loadSensitiveConfig();
    // 发送请求获取最新问题列表
    const response = await axios.get('https://leetcode.com/api/problems/all/', {
      headers: {
        Cookie: config.cookies
      }
    });
    problems = response.data.stat_status_pairs;

    // 保存新获取的数据到缓存中
    await saveProblemCache(problems);
  }

  return problems;
}



/**
 * Get problem data with caching
 */
export async function getProblemDetailById(problemNumber: string): Promise<ProblemDetails> {
  try {
    const problem = await getProblemMetaById(problemNumber)

    // Fetch additional details if needed
    return await fetchProblemDetails(problem.stat.question__title_slug);
  } catch (error) {
    await logger.error(`Failed to get problem data: ${(error as Error).message}`);
    throw error;
  }
}

export async function getProblemMetaById(problemNumber: string): Promise<LeetCodeProblem> {
  await logger.debug(`Getting data for problem ${problemNumber}`);
  const problems = await getAllLeetCodeProblems();

  // Find the specific problem
  const problem = problems.find(
    p => p.stat.frontend_question_id === parseInt(problemNumber)
  );

  if (!problem) {
    throw new Error(`Problem ${problemNumber} not found`);
  }

  return problem
}