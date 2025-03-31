/**
 * Types related to practice logs and metadata
 */

export type TestStatus = 'passed' | 'failed' | 'timeout';

/**
 * Feedback levels for spaced repetition:
 * 0 - Completely forgot (Reset interval)
 * 1 - Difficult recall (Reduce interval)
 * 2 - Good recall (Increase interval)
 * 3 - Very easy (Extend interval)
 */
export type FeedbackType = 0 | 1 | 2 | 3;

/**
 * Parameters for spaced repetition review calculations
 */
export interface ReviewParams {
    ef: number;           // Easiness Factor
    interval: number;     // Current interval in days
    reps: number;        // Number of successful repetitions
    dueDate: Date;       // Next review due date
}

/**
 * Metadata for spaced repetition review tracking
 */
export interface ReviewMetadata {
    ef: number;           // Current Easiness Factor
    interval: number;     // Current interval in days
    reps: number;        // Number of successful repetitions
    nextReviewDate: string; // Next review date in YY-MM-DD HH:mm:ss format
}

export interface PracticeLogs {
    // Basic log info
    date: string;
    action: 'start' | 'submit' | 'review';  // Added 'review' action type

    // Problem info
    problemNumber: string;
    title: string;
    difficulty: string;

    // Practice statistics (calculated fields)
    lastPracticed?: string;
    practiceCount?: number;
    totalTimeSpent?: number;

    // Spaced repetition tracking
    ef?: number;           // Current Easiness Factor after this practice
    interval?: number;     // Current interval in days after this practice
    nextReviewDate?: string; // Next scheduled review date

    // Start time for practice sessions (only for 'start' action)
    startTime?: string;

    // Submission details (only for 'submit' action)
    timeSpent?: string;
    approach?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
    status?: TestStatus;
    notes?: string;
    feedback?: FeedbackType;
}

export interface ProblemMetadata {
    // Problem identification
    problemNumber: string;
    title: string;
    difficulty: string;

    // Practice history
    practiceLogs: PracticeLogs[];

    // Configuration
    language: string;

    // Statistics
    totalPracticeTime: number;
    lastPractice: string;
    nextReviewDate: string;

    // Spaced repetition metadata
    ef?: number;         // Easiness Factor
    interval?: number;   // Current interval in days
    reps?: number;      // Number of successful repetitions
}

/**
 * Review problem data structure for displaying review information
 */
export interface ReviewProblem {
    problemNumber: string;
    title: string;
    difficulty: string;
    lastPracticed: string;
    practiceCount: number;
    approach?: string;
    notes?: string;
    nextReviewDate?: string;
}