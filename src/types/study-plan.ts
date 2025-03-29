export type StudyItem = {
    id: string;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    slug: string;
    category: string;
    order: number;
    custom: boolean;
    note: string;
    tags: string[];
    link: string;
    addedAt: string;
    completedAt: string | null;
    status: "pending" | "completed";
};

export type LearningPlan = {
    categoryOrders: Record<string, number>;
    plan: StudyItem[];
    dailyGoal: number; // Number of problems to solve per day
};