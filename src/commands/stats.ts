import { serve } from "bun";
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeReviewNeeds } from '../utils/spaced-repetition';
import { PROBLEM_TYPES } from '../config/constants';
import { loadConfig } from '../utils/config';
import { logger } from '../utils/logger';
import type { PracticeLogs, ProblemMetadata } from '../types/practice';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function showStats() {
  const server = serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);

      // Serve HTML pages
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const htmlContent = await readFile(path.join(__dirname, '../public/index.html'), 'utf8');
        return new Response(htmlContent, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.pathname === '/timeline') {
        const htmlContent = await readFile(path.join(__dirname, '../public/timeline.html'), 'utf8');
        return new Response(htmlContent, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Serve CSS files
      if (url.pathname === '/index.css') {
        const cssContent = await readFile(path.join(__dirname, '../public/index.css'), 'utf8');
        return new Response(cssContent, {
          headers: { 'Content-Type': 'text/css' },
        });
      }

      if (url.pathname === '/timeline.css') {
        const cssContent = await readFile(path.join(__dirname, '../public/timeline.css'), 'utf8');
        return new Response(cssContent, {
          headers: { 'Content-Type': 'text/css' },
        });
      }

      // Serve JavaScript files
      if (url.pathname === '/script.js') {
        const jsContent = await readFile(path.join(__dirname, '../public/script.js'), 'utf8');
        return new Response(jsContent, {
          headers: { 'Content-Type': 'application/javascript' },
        });
      }

      if (url.pathname === '/timeline.js') {
        const jsContent = await readFile(path.join(__dirname, '../public/timeline.js'), 'utf8');
        return new Response(jsContent, {
          headers: { 'Content-Type': 'application/javascript' },
        });
      }

      // API endpoints
      if (url.pathname === '/api/stats') {
        try {
          const baseDir = process.cwd();
          let allLogs: PracticeLogs[] = [];

          // Load config for learning progress
          const config = await loadConfig();

          for (const type of PROBLEM_TYPES) {
            const typePath = path.join(baseDir, type);
            try {
              const problems = await readdir(typePath);
              for (const problem of problems) {
                const metadataPath = path.join(typePath, problem, '.meta', 'metadata.json');
                try {
                  const metadata: ProblemMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
                  const logsWithDetails = metadata.practiceLogs.map(log => ({
                    ...log,
                    problemNumber: metadata.problemNumber,
                    title: metadata.title,
                    difficulty: metadata.difficulty,
                  }));

                  allLogs = allLogs.concat(logsWithDetails);
                } catch (e) {
                  await logger.debug(`⚠️ Skipping metadata for ${problem}: ${e.message}`);
                  continue;
                }
              }
            } catch (e) {
              await logger.debug(`⚠️ Skipping directory ${type}: ${e.message}`);
              continue;
            }
          }

          return new Response(JSON.stringify({
            logs: allLogs,
            learningProgress: config.learningProgress,
            weeklyProgress: config.weeklyProgress
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          await logger.error('❌ Error fetching stats:', error as Error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.pathname === '/api/reviews') {
        try {
          const reviewData = await analyzeReviewNeeds();
          return new Response(JSON.stringify(reviewData), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          await logger.error('❌ Error fetching review data:', error as Error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  await logger.info(`🚀 Server running at http://localhost:${server.port}`);

  // Open the browser
  const { default: open } = await import('open');
  await open(`http://localhost:${server.port}`);
}