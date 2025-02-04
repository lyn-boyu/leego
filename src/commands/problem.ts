import chalk from 'chalk';
import { fetchProblemDetails } from '../utils/api';

export async function getProblemDetails(problemNumber: string) {
  try {
    const problem = await fetchProblemDetails(problemNumber);

    console.log(chalk.blue('\nProblem Details:'));
    console.log(chalk.yellow('Title:'), problem.title);
    console.log(chalk.yellow('Difficulty:'), problem.difficulty);
    console.log(chalk.yellow('Topics:'), problem.topicTags.map(tag => tag.name).join(', '));
    console.log(chalk.yellow('\nDescription:'));
    // Remove HTML tags for better CLI display
    console.log(problem.content.replace(/<[^>]*>/g, ''));

  } catch (error) {
    console.error(chalk.red('Error fetching problem details:', error.message));
    process.exit(1);
  }
}