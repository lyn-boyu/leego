import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { PROBLEM_TYPES } from '../config/constants';
import { parseDate, formatDate } from './date';
import { logger } from './logger';

interface ProblemMeta {
  problemNumber: string;
  title: string;
  difficulty: string;
  lastPracticed: string;
  practiceCount: number;
  timeSpent: number;
  approach: string;
  notes?: string;
}

interface ReviewAnalysis {
  needsReview: ProblemMeta[];
  upcomingReviews: ProblemMeta[];
  retentionRates: Map<string, number>;
}

// Ebbinghaus Forgetting Curve intervals (in days)
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 90, 180];

function calculateRetentionRate(daysSinceLastReview: number, practiceCount: number): number {
  // Base retention rate using the forgetting curve formula: R = e^(-t/S)
  // where t is time since last review and S is stability factor
  const stabilityFactor = Math.pow(1.5, practiceCount); // Increases with more practice
  const retention = Math.exp(-daysSinceLastReview / stabilityFactor);
  return Math.max(0, Math.min(1, retention));
}

function getNextReviewDate(lastPracticed: string, practiceCount: number): Date {
  const lastPracticedDate = parseDate(lastPracticed);
  const intervalIndex = Math.min(practiceCount - 1, REVIEW_INTERVALS.length - 1);
  const interval = REVIEW_INTERVALS[Math.max(0, intervalIndex)];

  const nextReview = new Date(lastPracticedDate);
  nextReview.setDate(nextReview.getDate() + interval);

  return nextReview;
}

function isWithinNextWeek(date: Date): boolean {
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  return date >= now && date <= weekFromNow;
}

function findLastPracticeDate(practiceLogs: any[]): string | null {
  // Filter for submit actions and sort by date descending
  const submits = practiceLogs
    .filter(log => log.action === 'submit')
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  return submits.length > 0 ? submits[0].date : null;
}

export async function analyzeReviewNeeds(): Promise<ReviewAnalysis> {
  const baseDir = process.cwd();
  const needsReview: ProblemMeta[] = [];
  const upcomingReviews: ProblemMeta[] = [];
  const retentionRates = new Map<string, number>();

  await logger.info(`Starting review analysis at ${new Date().toISOString()}`);

  for (const type of PROBLEM_TYPES) {
    const typePath = path.join(baseDir, type);

    try {
      const problems = await readdir(typePath).catch(() => []);

      for (const problem of problems) {
        const problemPath = path.join(typePath, problem);
        const metadataPath = path.join(problemPath, '.meta', 'metadata.json');

        try {
          const metadataContent = await readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);

          if (!metadata.practice_logs || metadata.practice_logs.length === 0) {
            continue;
          }

          // Find the last practice date from practice logs
          const lastPracticed = findLastPracticeDate(metadata.practice_logs);
          if (!lastPracticed) {
            continue;
          }

          const problemNumber = problem.split('-')[0];
          const lastPracticedDate = parseDate(lastPracticed);
          const now = new Date();
          const daysSinceLastReview = Math.floor((now.getTime() - lastPracticedDate.getTime()) / (1000 * 60 * 60 * 24));

          // Count only submit actions for practice count
          const practiceCount = metadata.practice_logs.filter(log => log.action === 'submit').length;

          const problemMeta: ProblemMeta = {
            problemNumber,
            title: problem.split('-').slice(1, -1).join('-').replace(/-/g, ' '),
            difficulty: problem.split('-').pop()!,
            lastPracticed,
            practiceCount,
            timeSpent: metadata.total_practice_time || 0,
            approach: metadata.practice_logs[metadata.practice_logs.length - 1].approach || 'Not specified',
            notes: metadata.practice_logs[metadata.practice_logs.length - 1].notes
          };

          // Calculate retention rate
          const retentionRate = calculateRetentionRate(daysSinceLastReview, practiceCount);
          retentionRates.set(problemNumber, retentionRate);

          // Calculate next review date
          const nextReviewDate = getNextReviewDate(lastPracticed, practiceCount);

          await logger.debug(`Problem ${problemNumber}:
            Last practiced: ${lastPracticed}
            Days since review: ${daysSinceLastReview}
            Practice count: ${practiceCount}
            Next review: ${formatDate(nextReviewDate)}
            Retention rate: ${(retentionRate * 100).toFixed(1)}%`);

          if (nextReviewDate <= now) {
            // Problem needs review now
            needsReview.push(problemMeta);
            await logger.debug(`Added to needs review`);
          } else if (isWithinNextWeek(nextReviewDate)) {
            // Problem will need review within the next week
            upcomingReviews.push(problemMeta);
            await logger.debug(`Added to upcoming reviews`);
          }
        } catch (error) {
          await logger.error(`Error processing ${problem}`, error as Error);
          continue;
        }
      }
    } catch (error) {
      await logger.error(`Error reading directory ${type}`, error as Error);
      continue;
    }
  }

  // Sort by retention rate (ascending) and next review date
  needsReview.sort((a, b) => {
    const rateA = retentionRates.get(a.problemNumber) || 0;
    const rateB = retentionRates.get(b.problemNumber) || 0;
    return rateA - rateB;
  });

  upcomingReviews.sort((a, b) => {
    const dateA = getNextReviewDate(a.lastPracticed, a.practiceCount);
    const dateB = getNextReviewDate(b.lastPracticed, b.practiceCount);
    return dateA.getTime() - dateB.getTime();
  });

  await logger.info(`Analysis complete:
    Needs review: ${needsReview.length} problems
    Upcoming reviews: ${upcomingReviews.length} problems
    Total problems analyzed: ${retentionRates.size}`);

  return { needsReview, upcomingReviews, retentionRates };
}