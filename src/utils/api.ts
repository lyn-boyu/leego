import axios from 'axios';
import { ensureCookies } from './config';

const LEETCODE_API = 'https://leetcode.com/graphql';

export async function fetchProblemDetails(problemNumber: string) {
  const cookies = await ensureCookies();

  const query = `
    query getProblem($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        difficulty
        content
        topicTags {
          name
        }
      }
    }
  `;

  try {
    // First get the title slug
    const response = await axios.get(`https://leetcode.com/api/problems/all/`, {
      headers: {
        Cookie: cookies
      }
    });

    const problem = response.data.stat_status_pairs.find(
      (p: any) => p.stat.frontend_question_id === parseInt(problemNumber)
    );

    if (!problem) {
      throw new Error('Problem not found');
    }

    const titleSlug = problem.stat.question__title_slug;

    // Then fetch problem details
    const result = await axios.post(
      LEETCODE_API,
      {
        query,
        variables: { titleSlug }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookies
        }
      }
    );

    return result.data.data.question;
  } catch (error) {
    throw new Error(`Failed to fetch problem details: ${error.message}`);
  }
}