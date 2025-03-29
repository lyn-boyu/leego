import { analyzeReviewNeeds } from '../../utils/spaced-repetition';

export async function getReviews() {
  return await analyzeReviewNeeds();
}