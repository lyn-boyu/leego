import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { DEFAULT_PROBLEM_TYPES, TAG_TO_TYPE_MAP, PROJECT_PATHS } from '../config/constants';
import { logger } from './logger';
import { getProblemDetailById, type ProblemDetails } from './api';
import { generateWithAI } from './ai';


interface Problem {
  title: string;
  difficulty: string;
  number: string;
}

export function generateProblemFolderName(problem: Problem): string {
  return `${problem.number.padStart(4, '0')}-${problem.title.toLowerCase().replace(/\s+/g, '-')}-${problem.difficulty.toLowerCase()}`;
}

export function generateProblemPath(problemType: string, folderName: string): string {
  return path.join(process.cwd(), problemType, folderName);
}

export async function findProblemPath(problemNumber: string): Promise<string | null> {
  const baseDir = process.cwd();

  // Load problem types from JSON file or use defaults
  const problemTypes = await loadProblemTypes();

  for (const type of problemTypes) {
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
      continue;
    }
  }

  return null;
}

export async function loadProblemTypes(): Promise<string[]> {
  try {
    const typesPath = path.join(process.cwd(), PROJECT_PATHS.problemCategories);
    const content = await readFile(typesPath, 'utf8');
    const types = JSON.parse(content);

    // Validate the loaded types
    if (Array.isArray(types) && types.every(type => typeof type === 'string')) {
      await logger.debug('Loaded custom problem types from problem-categories.json');
      return types;
    } else {
      throw new Error('Invalid problem-categories.json format');
    }
  } catch (error) {
    await logger.debug('Using default problem types');
    return DEFAULT_PROBLEM_TYPES;
  }
}

export async function detectProblemTypeWithLLM(problem: ProblemDetails, problemTypes: string[]): Promise<string | null> {
  try {
    await logger.info('🤖 Using LLM to analyze problem type...');

    const prompt = `
Analyze this LeetCode problem and determine the most appropriate category from the following list:
${problemTypes.map(type => `- ${type}`).join('\n')}

Problem #${problem.number}:
Title: ${problem.title}
Tags: ${problem.topicTags.map(tag => tag.name).join(', ')}

Please respond with ONLY the category name from the list above that best matches this problem.
Do not include any explanation or additional text.`;

    const response = await generateWithAI(prompt);
    const suggestedType = response.trim();

    // Validate the suggested type exists in our list
    if (problemTypes.includes(suggestedType)) {
      await logger.info(`🤖 LLM suggested type: ${suggestedType}`);
      return suggestedType;
    }

    await logger.warn('LLM suggestion was not in valid problem types list');
    return null;
  } catch (error) {
    await logger.error('LLM type detection failed:', error as Error);
    return null;
  }
}

export function getProblemTypeFromTags(tags: { name: string }[]): string {
  // Find the first matching problem type from the tags
  for (const tag of tags) {
    const type = TAG_TO_TYPE_MAP[tag.name.toLowerCase()];
    if (type) {
      return type;
    }
  }
  // Default to arrays-hashing if no matching type found
  return '01-arrays-hashing';
}

export async function detectProblemType(problemNumber: string): Promise<string> {
  try {
    const problemTypes = await loadProblemTypes();
    const problem = await getProblemDetailById(problemNumber);

    // Try LLM-based detection first
    const llmType = await detectProblemTypeWithLLM(problem, problemTypes);
    if (llmType) { return llmType; }

    await logger.warn('Falling back to tag-based detection');
    return getProblemTypeFromTags(problem?.topicTags || []);

  } catch (error) {
    await logger.error('Error detecting problem type:', error as Error);
    return '01-arrays-hashing';
  }
}