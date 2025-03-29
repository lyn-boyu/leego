
import type { StudyItem, LearningPlan } from '../../types/study-plan';
import { formatDate } from '../../utils/date';
import { getLearningPlan, saveLearningPlan } from '../../utils/plan';


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

function initializeStudyItem(item: Partial<StudyItem>): StudyItem {
  return {
    id: item.id || crypto.randomUUID(),
    title: item.title || '',
    difficulty: item.difficulty || 'Medium',
    slug: item.slug || '',
    category: item.category || 'Uncategorized',
    order: item.order || 0,
    custom: item.custom || false,
    note: sanitizeNote(item.note || ''),
    tags: item.tags || [],
    link: item.link || '',
    addedAt: formatDate(new Date()),
    completedAt: null,
    status: 'pending'
  };
}

export async function addStudyItem(item: Partial<StudyItem>): Promise<LearningPlan> {
  const plan = await getLearningPlan();
  const newItem = initializeStudyItem(item);
  plan.plan.push(newItem);
  await saveLearningPlan(plan);
  return getLearningPlan();
}

export async function updateStudyItem(id: string, updates: Partial<StudyItem>): Promise<LearningPlan> {
  const plan = await getLearningPlan();
  const itemIndex = plan.plan.findIndex(item => item.id === id);

  if (itemIndex === -1) {
    throw new Error(`Item with ID "${id}" not found`);
  }


  // Sanitize note if present in updates
  if (updates.note !== undefined) {
    updates.note = sanitizeNote(updates.note);
  }

  plan.plan[itemIndex] = { ...plan.plan[itemIndex], ...updates };
  await saveLearningPlan(plan);
  return getLearningPlan();
}

export async function deleteStudyItem(id: string): Promise<LearningPlan> {
  const plan = await getLearningPlan();
  const initialLength = plan.plan.length;

  plan.plan = plan.plan.filter(item => item.id !== id);

  if (plan.plan.length === initialLength) {
    throw new Error(`Item with ID "${id}" not found`);
  }

  await saveLearningPlan(plan);
  return getLearningPlan();
}

export async function updateCategoryOrders(orders: Record<string, number>): Promise<LearningPlan> {
  const plan = await getLearningPlan();
  plan.categoryOrders = {
    ...plan.categoryOrders,
    ...orders
  };
  await saveLearningPlan(plan);
  return getLearningPlan();
}

export async function reorderStudyItems(itemOrders: Array<{ id: string; order: number }>): Promise<LearningPlan> {
  const plan = await getLearningPlan();

  for (const { id, order } of itemOrders) {
    const item = plan.plan.find(item => item.id === id);
    if (item) {
      item.order = order;
    }
  }

  await saveLearningPlan(plan);
  return getLearningPlan();
}

export async function updateDailyGoal(goal: number): Promise<LearningPlan> {
  if (goal < 1) {
    throw new Error('Daily goal must be at least 1');
  }

  const plan = await getLearningPlan();
  plan.dailyGoal = goal;
  await saveLearningPlan(plan);
  return getLearningPlan();
}

export async function getDailyGoal(): Promise<number> {
  const plan = await getLearningPlan();
  return plan.dailyGoal;
}