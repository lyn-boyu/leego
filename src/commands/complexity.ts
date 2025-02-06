import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { findProblemPath } from '../utils/helpers';
import { generateWithAI } from '../utils/ai';
import { logger } from '../utils/logger';

export async function generateComplexityReport(problemNumber: string) {
    try {
        // Find problem path
        const problemPath = await findProblemPath(problemNumber);
        if (!problemPath) {
            throw new Error(`Problem ${problemNumber} not found in workspace`);
        }

        // Read the solution file
        const solutionPath = path.join(problemPath, 'index.ts');
        const solutionCode = await readFile(solutionPath, 'utf8');

        await logger.info('🔍 Analyzing code complexity...');

        // Generate analysis using LLM
        const prompt = `
Please add structured, line-by-line comments within the code to analyze the time and space complexity of each logical step. Requirements:

- Clearly indicate the complexity for each key operation such as loops, recursion, sorting, etc.
- Provide detailed analysis for operations that are not O(1) (e.g., traversals, sorting, array shift/unshift, recursive calls, etc.).
- For operations with O(1) space complexity that occur only once, detailed analysis can be omitted.
- Finally, include a summary of the overall complexity, covering both total time and space complexity.

Here's the code to analyze:

${solutionCode}

Please provide the analysis in markdown format with:
1. The original code with added complexity comments
2. A detailed explanation of the approach
3. A comprehensive complexity analysis summary
4. Ignore comments outside the function code
`;

        const analysis = await generateWithAI(prompt);

        // Save the analysis
        const reportPath = path.join(problemPath, '.meta', 'complexity-report.md');
        await writeFile(reportPath, analysis);

        await logger.success(`✨ Complexity analysis saved to: ${reportPath}`);

    } catch (error) {
        await logger.error('Error analyzing problem:', error as Error);
        process.exit(1);
    }
}