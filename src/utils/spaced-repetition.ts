import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { parseDate } from './date';
import { loadProblemTypes } from './helpers';
import { logger } from './logger';
import type { FeedbackType } from '../types/practice';
import type { ProblemMetadata, ReviewProblem } from '../types/practice';

export interface ReviewParams {
  ef: number;           // Easiness Factor
  interval: number;     // Current interval in days
  reps: number;        // Number of successful repetitions
  dueDate: Date;       // Next review due date
}

/**
 * Update review parameters based on feedback
 */
export function updateReview(params: ReviewParams, feedback: FeedbackType, currentDate: Date): ReviewParams {
  // Calculate new EF using SuperMemo 2 algorithm
  const newEF = Math.max(1.3, params.ef + (0.1 - (5 - feedback) * (0.08 + (5 - feedback) * 0.02)));

  // Calculate new interval
  let newInterval: number;
  if (feedback < 2) { // If difficult or completely forgot
    newInterval = 1; // Reset to 1 day
    params.reps = 0; // Reset repetition count
  } else {
    // Initial intervals follow 1,3,7 pattern
    if (params.reps === 0) {
      newInterval = 1;
    } else if (params.reps === 1) {
      newInterval = 3;
    } else if (params.reps === 2) {
      newInterval = 7;
    } else {
      // After the initial pattern, use the SuperMemo algorithm
      newInterval = Math.round(params.interval * newEF);
    }
    params.reps++;
  }

  // Calculate next review date
  const dueDate = new Date(currentDate);
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    ef: newEF,
    interval: newInterval,
    reps: params.reps,
    dueDate
  };
}

/**
 * Calculate next review date based on practice count
 */
export function getNextReviewDate(lastPracticeDate: string, practiceCount: number): Date {
  const intervals = [1, 3, 7, 14, 30, 90, 180]; // Review intervals in days
  const intervalIndex = Math.min(practiceCount - 1, intervals.length - 1);
  const nextDate = new Date(parseDate(lastPracticeDate));
  nextDate.setDate(nextDate.getDate() + intervals[Math.max(0, intervalIndex)]);
  return nextDate;
}

/**
 * Get the next review date from practice logs
 */
export function getNextReviewDateFromLogs(problem: ProblemMetadata): Date {
  // Get latest review and submit logs with nextReviewDate
  const lastReviewLog = problem.practiceLogs
    .filter(log => log.action === 'review' && log.nextReviewDate)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())[0];

  const lastSubmitLog = problem.practiceLogs
    .filter(log => log.action === 'submit' && log.nextReviewDate)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())[0];

  // Compare dates and use the most recent nextReviewDate
  if (lastReviewLog?.nextReviewDate && lastSubmitLog?.nextReviewDate) {
    const reviewDate = parseDate(lastReviewLog.nextReviewDate);
    const submitDate = parseDate(lastSubmitLog.nextReviewDate);
    return reviewDate > submitDate ? reviewDate : submitDate;
  }

  // If only one type exists, use that
  if (lastReviewLog?.nextReviewDate) {
    return parseDate(lastReviewLog.nextReviewDate);
  }

  if (lastSubmitLog?.nextReviewDate) {
    return parseDate(lastSubmitLog.nextReviewDate);
  }

  // Fall back to calculating based on practice count
  const submitCount = problem.practiceLogs.filter(log => log.action === 'submit').length;
  return getNextReviewDate(problem.lastPractice, submitCount);
}

/**
 * Calculate retention rate based on practice history
 */
export function calculateRetentionRate(problem: ProblemMetadata): number {
  const now = new Date();
  const baseRate = 0.9; // Base retention rate

  // Get the next review date
  const nextReviewDate = getNextReviewDateFromLogs(problem);

  // Calculate days since last practice
  const lastPracticeDate = parseDate(problem.lastPractice);
  const daysSinceLastPractice = Math.max(0, (now.getTime() - lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate days until next review
  const daysUntilReview = Math.max(0, (nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Get practice count and use it as a factor in retention
  const practiceCount = problem.practiceLogs.filter(log => log.action === 'submit').length;
  const practiceFactor = Math.min(1, practiceCount / 5); // Max out at 5 practices

  // Calculate time decay based on practice interval
  const timeDecay = Math.exp(-daysSinceLastPractice / (daysUntilReview + 1));

  // Calculate final retention rate
  const retention = baseRate * practiceFactor * timeDecay;

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, retention));
}

/**
 * Load all problem metadata from workspace
 */
async function loadAllProblemMetadata(): Promise<ProblemMetadata[]> {
  const baseDir = process.cwd();
  const allProblems: ProblemMetadata[] = [];

  try {
    const problemTypes = await loadProblemTypes();

    for (const type of problemTypes) {
      const typePath = path.join(baseDir, type);
      try {
        const problems = await readdir(typePath);

        for (const problem of problems) {
          try {
            const metadataPath = path.join(typePath, problem, '.meta', 'metadata.json');
            const metadata: ProblemMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));

            // Extract problem number and details from folder name
            const [number, ...titleParts] = problem.split('-');
            const title = titleParts.slice(0, -1).join('-').replace(/-/g, ' ');
            const difficulty = titleParts[titleParts.length - 1];

            allProblems.push({
              ...metadata,
              problemNumber: number,
              title,
              difficulty
            });
          } catch (error) {
            //@ts-expect-error
            await logger.debug(`⚠️ Skipping metadata for ${problem}: ${error.message}`);
            continue;
          }
        }
      } catch (error) {
        //@ts-expect-error
        await logger.debug(`⚠️ Skipping directory ${type}: ${error.message}`);
        continue;
      }
    }
  } catch (error) {
    await logger.error('Error loading problem metadata:', error as Error);
  }

  return allProblems;
}

/**
 * Convert ProblemMetadata to ReviewProblem format
 */
function toReviewProblem(problem: ProblemMetadata): ReviewProblem {
  // Get the last submit log with an approach
  const lastSubmitWithApproach = [...problem.practiceLogs]
    .reverse()
    .find(log => log.action === 'submit' && log.approach);

  // Get the last submit log with notes
  const lastSubmitWithNotes = [...problem.practiceLogs]
    .reverse()
    .find(log => log.action === 'submit' && log.notes);

  return {
    problemNumber: problem.problemNumber,
    title: problem.title,
    difficulty: problem.difficulty,
    lastPracticed: problem.lastPractice,
    practiceCount: problem.practiceLogs.filter(log => log.action === 'submit').length,
    approach: lastSubmitWithApproach?.approach,
    notes: lastSubmitWithNotes?.notes
  };
}

/**
 * Analyze review needs for all problems
 */
export async function analyzeReviewNeeds() {
  const now = new Date();
  const needsReview: ReviewProblem[] = [];
  const upcomingReviews: ReviewProblem[] = [];
  const retentionRates: Record<string, number> = {};

  try {
    const problems = await loadAllProblemMetadata();

    problems.forEach(problem => {
      // Only consider problems with at least 2 complete practice sessions
      const submitCount = problem.practiceLogs.filter(log => log.action === 'submit').length;
      if (submitCount > 1) {
        retentionRates[problem.problemNumber] = calculateRetentionRate(problem);

        // Get next review date
        const nextReviewDate = getNextReviewDateFromLogs(problem);

        // Check if review is needed
        const daysUntilReview = (nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysUntilReview <= 0) {
          needsReview.push(toReviewProblem(problem));
        } else if (daysUntilReview <= 7) { // Show upcoming reviews for next 7 days
          upcomingReviews.push(toReviewProblem(problem));
        }
      }
    });

    // Sort by retention rate (ascending) and due date
    needsReview.sort((a, b) => {
      const retentionDiff = (retentionRates[a.problemNumber] || 0) - (retentionRates[b.problemNumber] || 0);
      if (Math.abs(retentionDiff) > 0.1) return retentionDiff;
      return parseDate(a.lastPracticed).getTime() - parseDate(b.lastPracticed).getTime();
    });

    upcomingReviews.sort((a, b) =>
      parseDate(a.lastPracticed).getTime() - parseDate(b.lastPracticed).getTime()
    );

  } catch (error) {
    await logger.error('Error analyzing review needs:', error as Error);
  }

  return {
    needsReview,
    upcomingReviews,
    retentionRates
  };
}