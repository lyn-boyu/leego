import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ProblemMetadata, PracticeLogs, TestStatus, FeedbackType } from '../types/practice';
import { formatDate, parseDate, calculateTimeSpent } from './date';
import { updateReview, type ReviewParams } from './spaced-repetition';
import { logger } from './logger';

/**
 * Get sorted submit logs with optional filters
 */
function getSortedSubmitLogs(logs: PracticeLogs[], options: {
    requireFeedback?: boolean;
    limit?: number;
} = {}): PracticeLogs[] {
    let filteredLogs = logs.filter(log => log.action === 'submit');

    if (options.requireFeedback) {
        filteredLogs = filteredLogs.filter(log => log.feedback !== undefined);
    }

    const sortedLogs = filteredLogs.sort((a, b) =>
        parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );

    return options.limit ? sortedLogs.slice(0, options.limit) : sortedLogs;
}

function getInitialReviewParams(difficulty: string): ReviewParams {
    const baseEF = {
        'easy': 2.6,
        'medium': 2.5,
        'hard': 2.4
    }[difficulty.toLowerCase()] || 2.5;

    return {
        ef: baseEF,
        interval: 1,
        reps: 0,
        dueDate: new Date()
    };
}

function calculateRepsFromLogs(logs: PracticeLogs[]): number {
    const submits = getSortedSubmitLogs(logs, { requireFeedback: true });

    let consecutiveSuccesses = 0;
    for (const log of submits) {
        if (log.feedback && log.feedback > 1) { // Count only good (2) and very easy (3) as successes
            consecutiveSuccesses++;
        } else {
            break;
        }
    }
    return consecutiveSuccesses;
}

function calculateIntervalFromLogs(logs: PracticeLogs[]): number {
    const lastTwo = getSortedSubmitLogs(logs, { limit: 2 });

    if (lastTwo.length < 2) {
        return 1;
    }

    const daysBetween = Math.round(
        (parseDate(lastTwo[0].date).getTime() - parseDate(lastTwo[1].date).getTime())
        / (1000 * 60 * 60 * 24)
    );

    return Math.max(1, daysBetween);
}

/**
 * Create a new practice log entry
 */
export function createPracticeLog(
    action: 'start' | 'submit' | 'review',
    metadata: ProblemMetadata,
    options: {
        timeSpent?: string;
        approach?: string;
        timeComplexity?: string;
        spaceComplexity?: string;
        status?: TestStatus;
        notes?: string;
        feedback?: FeedbackType;
        startTime?: string;
        nextReviewDate?: string;
    } = {}
): PracticeLogs {
    const now = new Date();
    const formattedNow = formatDate(now);

    const log: PracticeLogs = {
        date: formattedNow,
        action,
        problemNumber: metadata.problemNumber,
        title: metadata.title,
        difficulty: metadata.difficulty,
        ...options
    };

    // Only calculate review parameters for submit actions with feedback
    if (action === 'submit' && options.feedback !== undefined) {
        // Get current review params or initialize new ones
        const currentParams: ReviewParams = {
            ef: metadata.ef || getInitialReviewParams(metadata.difficulty).ef,
            interval: metadata.interval || calculateIntervalFromLogs(metadata.practiceLogs),
            reps: metadata.reps || calculateRepsFromLogs(metadata.practiceLogs),
            dueDate: parseDate(metadata.nextReviewDate || formattedNow)
        };

        // Update review parameters based on feedback
        const updatedParams = updateReview(currentParams, options.feedback, now);

        // Add spaced repetition tracking to the log
        log.ef = updatedParams.ef;
        log.interval = updatedParams.interval;
        log.nextReviewDate = formatDate(updatedParams.dueDate);
    }

    // For review action, use provided nextReviewDate
    if (action === 'review' && options.nextReviewDate) {
        log.nextReviewDate = options.nextReviewDate;
    }

    return log;
}

/**
 * Add a practice log to metadata and update related fields
 */
export async function addPracticeLog(
    metadata: ProblemMetadata,
    log: PracticeLogs,
    metadataPath: string
): Promise<void> {
    // Update metadata fields
    metadata.practiceLogs.push(log);
    metadata.lastPractice = log.date;

    if (log.timeSpent && log.action === 'submit') {
        const minutes = parseInt(log.timeSpent);
        metadata.totalPracticeTime = (metadata.totalPracticeTime || 0) + minutes;
    }

    // Update spaced repetition metadata if the log contains review data
    if (log.action === 'submit' && log.ef !== undefined && log.interval !== undefined && log.nextReviewDate) {
        metadata.ef = log.ef;
        metadata.interval = log.interval;
        metadata.nextReviewDate = log.nextReviewDate;
        metadata.reps = calculateRepsFromLogs(metadata.practiceLogs);
    } else if (log.action === 'review' && log.nextReviewDate) {
        metadata.nextReviewDate = log.nextReviewDate;
    }

    // Save updated metadata
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Find the last practice session
 */
export function findLastPracticeSession(logs: PracticeLogs[]): PracticeLogs | undefined {
    const submits = getSortedSubmitLogs(logs);
    return submits.find(log => log.timeSpent);
}

/**
 * Calculate time spent in current session
 */
export function calculateSessionTimeSpent(logs: PracticeLogs[]): string {
    const lastStart = [...logs]
        .reverse()
        .find(log => log.action === 'start' && log.startTime);

    if (lastStart?.startTime) {
        return calculateTimeSpent(lastStart.startTime, formatDate(new Date()));
    }

    return '30m'; // Default time if no start time found
}

/**
 * Get practice count for a problem
 */
export function getPracticeCount(logs: PracticeLogs[]): number {
    return getSortedSubmitLogs(logs).length;
}

/**
 * Load problem metadata from file
 */
export async function loadProblemMetadata(problemPath: string): Promise<ProblemMetadata> {
    const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
    const content = await readFile(metadataPath, 'utf8');
    return JSON.parse(content);
}

/**
 * Save problem metadata to file
 */
export async function saveProblemMetadata(
    problemPath: string,
    metadata: ProblemMetadata
): Promise<void> {
    const metadataPath = path.join(problemPath, '.meta', 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Archive current solution if different from template
 */
export async function archiveCurrentSolution(
    problemPath: string,
    currentSolution: string,
    template: string
): Promise<string | null> {
    if (currentSolution === template) {
        return null;
    }

    const timestamp = formatDate(new Date());
    const archivePath = path.join(problemPath, '.meta', 'archives', `solution-${timestamp}.ts`);
    await writeFile(archivePath, currentSolution);
    return archivePath;
}