import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import { findProblemPath } from '../utils/helpers';
import { formatDate } from '../utils/date';
import { logger } from '../utils/logger';
import type { ProblemMetadata, PracticeLogs, FeedbackType } from '../types/practice';

interface ReviewOptions {
    feedback?: FeedbackType;
}

export async function setInterviewReview(problemNumbers: string[], options: ReviewOptions = {}): Promise<void> {
    try {
        const now = new Date();
        const formattedNow = formatDate(now);

        for (const problemNumber of problemNumbers) {
            const problemPath = await findProblemPath(problemNumber);
            if (!problemPath) {
                await logger.warn(`Problem ${problemNumber} not found, skipping...`);
                continue;
            }

            // Read current metadata
            const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
            const metadata: ProblemMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));

            // Find the last actual practice time
            const lastSubmit = metadata.practiceLogs
                .filter(log => log.action === 'submit' && log.timeSpent)
                .pop();

            // Create a special review log
            const reviewLog: PracticeLogs = {
                date: formattedNow,
                action: 'submit',
                timeSpent: lastSubmit?.timeSpent || '30m', // Use last practice time or default
                notes: '🎯 Marked for interview review',
                problemNumber,
                title: metadata.title,
                difficulty: metadata.difficulty,
                feedback: options.feedback || 'good', // Use provided feedback or default to 'good'
                nextReviewDate: formattedNow // Set review date to now to make it appear in needs review
            };

            // Add the review log without modifying existing logs
            metadata.practiceLogs.push(reviewLog);

            // Update metadata
            metadata.nextReviewDate = formattedNow;

            // Save metadata
            await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            await logger.success(`✅ Problem ${problemNumber} marked for review`);
        }

        await logger.info('\n📝 Run `leego stats` to see your review list');
    } catch (error) {
        await logger.error('Error setting interview review:', error as Error);
        process.exit(1);
    }
}

export async function addReview() {
    try {
        const { problemNumbers, feedback } = await inquirer.prompt([
            {
                type: 'input',
                name: 'problemNumbers',
                message: 'Enter problem numbers to review (comma separated):',
                validate: (input) => {
                    if (!input) return 'Please enter at least one problem number';
                    const numbers = input.split(',').map(n => n.trim());
                    return numbers.every(n => !isNaN(parseInt(n))) || 'Please enter valid numbers';
                }
            },
            {
                type: 'list',
                name: 'feedback',
                message: 'How well do you remember this problem?',
                choices: [
                    { name: '🟢 Good (Well mastered)', value: 'good' },
                    { name: '🟡 Medium (Partially forgotten)', value: 'medium' },
                    { name: '🔴 Poor (Not mastered at all)', value: 'poor' }
                ],
                default: 'good'
            }
        ]);

        const numbers = problemNumbers.split(',').map(n => n.trim());
        await setInterviewReview(numbers, { feedback: feedback as FeedbackType });

    } catch (error) {
        await logger.error('Error marking problems for interview:', error as Error);
        process.exit(1);
    }
}