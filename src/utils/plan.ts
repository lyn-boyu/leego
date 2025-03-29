
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { PROJECT_PATHS } from '../config/constants';
import type { LearningPlan } from '../types/study-plan';
import { loadProblemTypes } from '../utils/helpers';
import { formatDate } from './date';
import { logger } from './logger';

export async function saveLearningPlan(plan: LearningPlan): Promise<void> {
    const planPath = path.join(process.cwd(), PROJECT_PATHS.studyPlan);
    await writeFile(planPath, JSON.stringify(plan, null, 2));
}

function sanitizeNote(note: string): string {
    // Ensure note is a string
    note = String(note || '');

    // Limit length
    note = note.slice(0, 2000);

    // Check if quotes are already escaped
    if (!/\\"/g.test(note)) {
        // Only escape unescaped quotes
        note = note.replace(/(?<!\\)"/g, '\\"');
    }

    return note;
}

export async function getLearningPlan(): Promise<LearningPlan> {
    try {
        const planPath = path.join(process.cwd(), PROJECT_PATHS.studyPlan);
        const content = await readFile(planPath, 'utf8');
        const plan = JSON.parse(content);

        // Ensure dailyGoal has a default value
        if (typeof plan.dailyGoal !== 'number') {
            plan.dailyGoal = 1;
        }

        // Initialize category orders if empty
        if (!plan.categoryOrders || Object.keys(plan.categoryOrders).length === 0) {
            const problemTypes = await loadProblemTypes();
            plan.categoryOrders = problemTypes.reduce((acc, type, index) => {
                // Higher index = higher priority (reverse order)
                acc[type] = problemTypes.length - index;
                return acc;
            }, {} as Record<string, number>);

            // Save the updated plan with initialized category orders
            await saveLearningPlan(plan);
        }

        return plan;
    } catch {
        return { categoryOrders: {}, plan: [], dailyGoal: 1 };
    }
}



export async function completeStudyPlanItem(id: string): Promise<void> {
    try {
        const data = await getLearningPlan();
        const itemIndex = data.plan.findIndex(item => item.id === id)
        const idx = itemIndex !== -1 ? itemIndex : data.plan.findIndex(item => item.id === id.padStart(4, '0'));

        if (idx !== -1 && data.plan[idx].status !== 'completed') {
            data.plan[idx] = {
                ...data.plan[idx], status: 'completed', completedAt: formatDate(new Date())
            };
            await saveLearningPlan(data);
            await logger.success('\n✅ Problem successfully marked as completed in your study plan!');
        }
    } catch (error) {
        //@ts-expect-error
        logger.error('Error completing study plan item:', error.message);
    }

}

