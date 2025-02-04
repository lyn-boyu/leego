import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { generateWithAI } from './ai';
import { PROBLEM_TYPES, TAG_TO_TYPE_MAP } from '../config/constants';
import { logger } from './logger';
import { getProblemDetailById, type ProblemDetails } from './api';




export function generateProblemFolderName(problem: ProblemDetails): string {
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

export async function loadCustomProblemTypes(): Promise<string[]> {
  try {
    const customConstantsPath = path.join(process.cwd(), '.leetcode', 'constants.ts');
    const content = await readFile(customConstantsPath, 'utf8');

    // Simple regex to extract PROBLEM_TYPES array
    const match = content.match(/PROBLEM_TYPES\s*=\s*\[([\s\S]*?)\]/);
    if (match) {
      const types = match[1]
        .split(',')
        .map(type => type.trim().replace(/['"]/g, ''))
        .filter(type => type); // Remove empty strings

      return types;
    }
  } catch (error) {
    // If file doesn't exist or can't be parsed, return default types
    await logger.debug('No custom problem types found, using defaults');
  }

  return PROBLEM_TYPES as unknown as string[];
}

export async function detectProblemTypeWithLLM(problem: ProblemDetails, problemTypes: string[]): Promise<string | null> {
  try {
    await logger.info('🤖 Using LLM to analyze problem type...');

    const prompt = `
Analyze this LeetCode problem and determine the most appropriate category from the following list:
${problemTypes.map(type => `- ${type}`).join('\n')}

Problem #${problem.number}:
Title: ${problem.title}
Tags: ${problem.topicTags.map((tag: any) => tag.name).join(', ')}

Please respond with ONLY the category name from the list above that best matches this problem.
Do not include any explanation or additional text.
`;

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

    const problemTypes = await loadCustomProblemTypes();
    const problem = await getProblemDetailById(problemNumber);

    // Try LLM-based detection first
    const llmType = await detectProblemTypeWithLLM(problem, problemTypes);
    if (llmType) { return llmType; }

    await logger.warn('Falling back to tag-based detection');
    return getProblemTypeFromTags(problem?.topicTags || []);

  } catch (error) {
    console.error('Error detecting problem type:', error.message);
    return '01-arrays-hashing';
  }
}