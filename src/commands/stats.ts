import { serve } from "bun";
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeReviewNeeds } from '../utils/spaced-repetition';
import { PROBLEM_TYPES } from '../config/constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function showStats() {
  const server = serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/') {
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

      if (url.pathname === '/api/stats') {
        try {
          const baseDir = process.cwd();
          let allLogs = [] as string[];

          for (const type of PROBLEM_TYPES) {
            const typePath = path.join(baseDir, type);
            try {
              const problems = await readdir(typePath);
              for (const problem of problems) {
                const metadataPath = path.join(typePath, problem, '.meta', 'metadata.json');
                try {
                  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
                  // Extract problem number and title from directory name
                  const [number, ...titleParts] = problem.split('-');
                  const title = titleParts.slice(0, -1).join('-').replace(/-/g, ' ');
                  const difficulty = titleParts[titleParts.length - 1];

                  // Add problem details to each log entry
                  const logsWithDetails = metadata.practice_logs.map(log => ({
                    ...log,
                    problemNumber: number,
                    title,
                    difficulty
                  }));

                  allLogs = allLogs.concat(logsWithDetails);
                } catch (e) {
                  continue;
                }
              }
            } catch (e) {
              continue;
            }
          }

          return new Response(JSON.stringify(allLogs), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
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
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(`Server running at http://localhost:${server.port}`);

  // Open the browser
  const { default: open } = await import('open');
  await open(`http://localhost:${server.port}`);
}