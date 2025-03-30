import path from 'path';
import inquirer from 'inquirer';
import { findProblemPath } from '../utils/helpers';
import { formatDate } from '../utils/date';
import { logger } from '../utils/logger';
import type { FeedbackType } from '../types/practice';
import { createPracticeLog, addPracticeLog, loadProblemMetadata } from '../utils/practice-logs';

interface ReviewOptions {
    feedback?: FeedbackType;
}

const FEEDBACK_CHOICES = [
    {
        name: '🧠 Completely forgot (Reset interval)',
        value: 0,
        description: 'Could not solve or recall the solution at all'
    },
    {
        name: '⚠️ Difficult recall (Reduce interval)',
        value: 1,
        description: 'Eventually solved but took significant effort'
    },
    {
        name: '✅ Good recall (Increase interval)',
        value: 2,
        description: 'Solved with some thought, remembered key concepts'
    },
    {
        name: '⭐ Very easy (Extend interval)',
        value: 3,
        description: 'Solved immediately, perfect recall'
    }
];

export async function setInterviewReview(problemNumbers: string[], options: ReviewOptions = {}): Promise<void> {
    try {
        const now = new Date();
        const currentDate = formatDate(now);

        for (const problemNumber of problemNumbers) {
            const problemPath = await findProblemPath(problemNumber);
            if (!problemPath) {
                await logger.warn(`Problem ${problemNumber} not found, skipping...`);
                continue;
            }

            // Load metadata
            const metadata = await loadProblemMetadata(problemPath);

            // Find the last actual practice time
            const lastSubmit = metadata.practiceLogs
                .filter(log => log.action === 'submit' && log.timeSpent)
                .pop();

            // Create a review log
            const practiceLog = createPracticeLog('review', metadata, {
                timeSpent: lastSubmit?.timeSpent || '30m',
                notes: '🎯 Marked for interview review',
                feedback: options.feedback ?? 2, // Default to "Good recall" if not specified
                nextReviewDate: currentDate // Force next review to today
            });

            // Add log to metadata
            const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
            await addPracticeLog(metadata, practiceLog, metadataPath);

            await logger.success(`✅ Problem ${problemNumber} marked for review`);

            // Show next review date
            if (practiceLog.nextReviewDate) {
                await logger.info(`📅 Next review scheduled for: ${practiceLog.nextReviewDate}`);
                if (practiceLog.ef && practiceLog.interval) {
                    await logger.info(`📊 Current EF: ${practiceLog.ef.toFixed(2)}, Interval: ${practiceLog.interval} days`);
                }
            }
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
                    const numbers = input.split(',').map((n: string) => n.trim());
                    return numbers.every((n: string) => !isNaN(parseInt(n))) || 'Please enter valid numbers';
                }
            },
            {
                type: 'list',
                name: 'feedback',
                message: 'How well do you remember this problem?',
                choices: FEEDBACK_CHOICES.map(choice => ({
                    name: `${choice.name}\n   ${choice.description}`,
                    value: choice.value
                })),
                default: 2,
                pageSize: 8
            }
        ]);

        const numbers = problemNumbers.split(',').map(n => n.trim());
        await setInterviewReview(numbers, { feedback: feedback as FeedbackType });

    } catch (error) {
        await logger.error('Error marking problems for interview:', error as Error);
        process.exit(1);
    }
}