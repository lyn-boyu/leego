import { getAllLeetCodeProblems, getProblemDetailById } from '../../utils/api';
import { loadProblemTypes } from '../../utils/helpers';
import { logger } from '../../utils/logger';

interface SearchResult {
  number: string;
  title: string;
  difficulty: string;
  isPremium: boolean;
  slug: string;
  questionFrontendId: string;
  topicTags: { name: string }[];
}

export async function searchProblems(keyword: string): Promise<SearchResult[]> {
  try {
    const problems = await getAllLeetCodeProblems();
    const searchTerm = keyword.toLowerCase().trim();
    const isNumeric = /^\d+$/.test(searchTerm);

    // Create regex for fuzzy matching
    const searchRegex = new RegExp(searchTerm.split('').join('.*'), 'i');

    // Find matching problems
    const matches = problems
      .filter(p => {
        const title = p.stat.question__title.toLowerCase();
        const slug = p.stat.question__title_slug.toLowerCase();
        const number = p.stat.frontend_question_id.toString();

        if (isNumeric) {
          // For numeric search, check exact and partial number matches
          return number === searchTerm || number.startsWith(searchTerm);
        }

        return searchRegex.test(title) || searchRegex.test(slug);
      })
      .map(p => ({
        number: p.stat.frontend_question_id.toString(),
        questionFrontendId: p.stat.frontend_question_id.toString().padStart(4, '0'),
        title: p.stat.question__title,
        difficulty: p.difficulty.level === 1 ? 'Easy' :
          p.difficulty.level === 2 ? 'Medium' : 'Hard',
        isPremium: p.paid_only,
        slug: p.stat.question__title_slug,
        topicTags: []
      }))
      .sort((a, b) => {
        if (isNumeric) {
          // For numeric search, prioritize exact matches
          const aExact = a.number === searchTerm;
          const bExact = b.number === searchTerm;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          // Then prioritize matches that start with the search term
          const aStarts = a.number.startsWith(searchTerm);
          const bStarts = b.number.startsWith(searchTerm);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
        } else {
          // For text search, prioritize exact title matches
          const aExact = a.title.toLowerCase().includes(searchTerm);
          const bExact = b.title.toLowerCase().includes(searchTerm);
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
        }

        // Finally sort by problem number
        return parseInt(a.number) - parseInt(b.number);
      })
      .slice(0, 10); // Limit to 10 results

    return matches;
  } catch (error) {
    await logger.error('Error searching problems:', error as Error);
    throw error;
  }
}

export async function getProblemTypes(): Promise<string[]> {
  try {
    return await loadProblemTypes();
  } catch (error) {
    await logger.error('Error getting problem types:', error as Error);
    throw error;
  }
}

export async function detectProblemType(problemNumber: string): Promise<string> {
  try {
    const problem = await getProblemDetailById(problemNumber);
    const problemTypes = await loadProblemTypes();

    // Try to find a matching type based on problem tags
    for (const tag of problem.topicTags) {
      const tagName = tag.name.toLowerCase();
      for (const type of problemTypes) {
        if (type.toLowerCase().includes(tagName)) {
          return type;
        }
      }
    }

    // Default to first type if no match found
    return problemTypes[0];
  } catch (error) {
    await logger.error('Error detecting problem type:', error as Error);
    throw error;
  }
}