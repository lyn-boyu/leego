import { getAllLeetCodeProblems } from '../utils/api';
import { logger } from '../utils/logger';

export async function searchByTitle(title: string) {
    try {
        const problems = await getAllLeetCodeProblems()

        // Clean up search term and create regex
        const searchTerm = title.toLowerCase().trim();
        const searchRegex = new RegExp(searchTerm, 'i');

        // Find matching problems
        const matches = problems
            .filter(p => searchRegex.test(p.stat.question__title.toLowerCase()))
            .map(p => ({
                number: p.stat.frontend_question_id,
                title: p.stat.question__title,
                difficulty: p.difficulty.level === 1 ? 'Easy' : p.difficulty.level === 2 ? 'Medium' : 'Hard',
                paid: p.paid_only
            }))
            .sort((a, b) => a.number - b.number);

        if (matches.length === 0) {
            await logger.info('No problems found matching your search.');
            return;
        }

        await logger.info('\nMatching problems:');
        matches.forEach(problem => {
            console.info(
                `#${problem.number.toString().padStart(4, '0')} - ` +
                `${problem.title} ` +
                `[${problem.difficulty}]` +
                `${problem.paid ? ' 🔒' : ''}`
            );
        });

    } catch (error) {
        await logger.error('Error searching problems:', error as Error);
        process.exit(1);
    }
}