import { serve } from "bun";
import { router } from './routes';
import { json } from './router';
import { logger } from '../utils/logger';

export async function createServer() {
  return serve({
    port: 3000,
    async fetch(req) {
      try {
        return await router.handle(req);
      } catch (error) {
        await logger.error('Server error:', error as Error);
        return json({ error: 'Internal server error' }, 500);
      }
    }
  });
}