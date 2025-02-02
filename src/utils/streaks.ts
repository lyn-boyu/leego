import { isToday, isYesterday, startOfWeek, formatDate, parseDate } from './date';

interface LearningProgress {
    currentStreak: {
        days: number;
        startDate: string;
        lastPractice: string;
    };
    bestStreak: {
        days: number;
        startDate: string;
        endDate: string;
    };
    totalDays: number;
    totalProblems: number;
}

interface WeeklyProgress {
    target: number;
    current: number;
    weekStart: string | null;
    problems: string[];
    history: Array<{
        weekStart: string;
        target: number;
        achieved: number;
        problems: string[];
    }>;
}

export function updateLearningStreak(progress: LearningProgress, currentDate: string): LearningProgress {
    const now = parseDate(currentDate);
    const lastPractice = progress.currentStreak.lastPractice
        ? parseDate(progress.currentStreak.lastPractice)
        : null;

    // Update streak
    if (!lastPractice) {
        // First practice ever
        progress.currentStreak = {
            days: 1,
            startDate: currentDate,
            lastPractice: currentDate
        };
        progress.totalDays = 1;
    } else if (isToday(lastPractice, now)) {
        // Already practiced today, just update last practice time
        progress.currentStreak.lastPractice = currentDate;
    } else if (isYesterday(lastPractice, now)) {
        // Continued streak
        progress.currentStreak.days++;
        progress.currentStreak.lastPractice = currentDate;
        progress.totalDays++;
    } else {
        // Streak broken, check if previous streak was best
        if (progress.currentStreak.days > progress.bestStreak.days) {
            progress.bestStreak = {
                days: progress.currentStreak.days,
                startDate: progress.currentStreak.startDate,
                endDate: progress.currentStreak.lastPractice
            };
        }
        // Start new streak
        progress.currentStreak = {
            days: 1,
            startDate: currentDate,
            lastPractice: currentDate
        };
        progress.totalDays++;
    }

    // Update total problems
    progress.totalProblems++;

    return progress;
}

export function updateWeeklyProgress(weeklyProgress: WeeklyProgress, problemNumber: string, currentDate: string): WeeklyProgress {
    const now = parseDate(currentDate);
    const weekStartDate = startOfWeek(now);
    const formattedWeekStart = formatDate(weekStartDate);

    // If this is a new week or first problem ever
    if (!weeklyProgress.weekStart || parseDate(weeklyProgress.weekStart) < weekStartDate) {
        // If there was a previous week, add it to history
        if (weeklyProgress.weekStart) {
            weeklyProgress.history.push({
                weekStart: weeklyProgress.weekStart,
                target: weeklyProgress.target,
                achieved: weeklyProgress.current,
                problems: weeklyProgress.problems
            });
        }

        // Start new week
        weeklyProgress.weekStart = formattedWeekStart;
        weeklyProgress.current = 0;
        weeklyProgress.problems = [];
    }

    // Only increment if we haven't solved this problem this week
    if (!weeklyProgress.problems.includes(problemNumber)) {
        weeklyProgress.current++;
        weeklyProgress.problems.push(problemNumber);
    }

    return weeklyProgress;
}