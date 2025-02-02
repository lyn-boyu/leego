/**
 * Types related to practice logs and metadata
 */

export type TestStatus = 'passed' | 'failed' | 'timeout';

export interface PracticeLogs {
    // Basic log info
    date: string;
    action: 'start' | 'submit';

    // Problem info
    problemNumber: string;
    title: string;
    difficulty: string;

    // Practice statistics (calculated fields)
    lastPracticed?: string;
    practiceCount?: number;
    totalTimeSpent?: number;

    // Start time for practice sessions (only for 'start' action)
    startTime?: string;

    // Submission details (only for 'submit' action)
    timeSpent?: string;
    approach?: string;
    timeComplexity?: string;
    spaceComplexity?: string;
    status?: TestStatus;
    notes?: string;
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
}