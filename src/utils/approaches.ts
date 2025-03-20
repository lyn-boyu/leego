import { readFile } from 'fs/promises';
import path from 'path';
import { PROJECT_PATHS, DEFAULT_APPROACHES } from '../config/constants';
import { logger } from './logger';

/**
 * Load approaches from configuration file or use defaults
 */
export async function loadApproaches(): Promise<string[]> {
    try {
        const approachesPath = path.join(process.cwd(), PROJECT_PATHS.approaches);
        const content = await readFile(approachesPath, 'utf8');
        const approaches = JSON.parse(content);

        // Validate the loaded approaches
        if (Array.isArray(approaches) && approaches.every(approach => typeof approach === 'string')) {
            await logger.debug('Loaded custom approaches from approaches.json');
            return approaches;
        } else {
            throw new Error('Invalid approaches.json format');
        }
    } catch (error) {
        await logger.debug('Using default approaches');
        return DEFAULT_APPROACHES as any as string[];
    }
}

/**
 * Fuzzy search through approaches
 */
export function fuzzySearch(query: string, approaches: string[]): string[] {
    const normalizedQuery = query.toLowerCase();
    return approaches
        .filter(approach => approach.toLowerCase().includes(normalizedQuery))
        .sort((a, b) => {
            // Prioritize matches that start with the query
            const aStartsWith = a.toLowerCase().startsWith(normalizedQuery);
            const bStartsWith = b.toLowerCase().startsWith(normalizedQuery);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return a.localeCompare(b);
        });
}