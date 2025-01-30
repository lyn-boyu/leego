import { isToday, isYesterday, startOfWeek, formatDate, parseDate } from './date';

interface LearningProgress {
    current_streak: {
        days: number;
        start_date: string;
        last_practice: string;
    };
    best_streak: {
        days: number;
        start_date: string;
        end_date: string;
    };
    total_days: number;
    total_problems: number;
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
    const lastPractice = progress.current_streak.last_practice
        ? parseDate(progress.current_streak.last_practice)
        : null;

    // Update streak
    if (!lastPractice) {
        // First practice ever
        progress.current_streak = {
            days: 1,
            start_date: currentDate,
            last_practice: currentDate
        };
        progress.total_days = 1;
    } else if (isToday(lastPractice, now)) {
        // Already practiced today, just update last practice time
        progress.current_streak.last_practice = currentDate;
    } else if (isYesterday(lastPractice, now)) {
        // Continued streak
        progress.current_streak.days++;
        progress.current_streak.last_practice = currentDate;
        progress.total_days++;
    } else {
        // Streak broken, check if previous streak was best
        if (progress.current_streak.days > progress.best_streak.days) {
            progress.best_streak = {
                days: progress.current_streak.days,
                start_date: progress.current_streak.start_date,
                end_date: progress.current_streak.last_practice
            };
        }
        // Start new streak
        progress.current_streak = {
            days: 1,
            start_date: currentDate,
            last_practice: currentDate
        };
        progress.total_days++;
    }

    // Update total problems
    progress.total_problems++;

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