import { createServer } from '../services/server';
import { logger } from '../utils/logger';
import open from 'open';

export async function showStats() {
  const server = await createServer();

  await logger.success(`\n🚀 Stats dashboard running at http://localhost:3000`);
  await logger.info('Press Ctrl+C to stop the server\n');

  // Open the browser
  await open('http://localhost:3000');
}