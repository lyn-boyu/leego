import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { loadConfig } from '../../utils/config';
import { loadProblemTypes } from '../../utils/helpers';
import type { PracticeLogs, ProblemMetadata } from '../../types/practice';

export async function getStats() {
  const baseDir = process.cwd();
  let allLogs: PracticeLogs[] = [];
  
  const config = await loadConfig();
  const problemTypes = await loadProblemTypes();

  for (const type of problemTypes) {
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
            difficulty: metadata.difficulty
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

  return {
    logs: allLogs,
    learningProgress: config.learningProgress,
    weeklyProgress: config.weeklyProgress
  };
}