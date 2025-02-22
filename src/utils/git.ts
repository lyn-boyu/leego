import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { formatDate } from './date';

const execAsync = promisify(exec);

interface CommitMetadata {
    problemNumber: string;
    title: string;
    difficulty: string;
    timeSpent: string;
    approach: string;
    timeComplexity: string;
    spaceComplexity: string;
    status: 'passed' | 'failed' | 'timeout';
}

export async function commitProblemChanges(problemPath: string, metadata: CommitMetadata): Promise<void> {
    try {
        // add  .leetcode/config.json to git 
        const configPath = path.join(process.cwd(), '.leetcode', 'config.json');
        await execAsync(`git add ${configPath}`);

        // Get the relative path from the project root
        const relativePath = path.relative(process.cwd(), problemPath);

        // Add all changes in the problem directory
        await execAsync(`git add ${relativePath}`);

        // Create commit message with metadata
        const commitMsg = generateCommitMessage(metadata);

        // Commit the changes
        await execAsync(`git commit -m "${commitMsg}"`);
    } catch (error) {
        throw new Error(`Failed to commit changes: ${error.message}`);
    }
}

function generateCommitMessage(metadata: CommitMetadata): string {
    const timestamp = formatDate(new Date());


    // Format problem number with difficulty
    const difficultyMap: Record<string, string> = {
        'easy': 'E',
        'medium': 'M',
        'hard': 'H'
    };
    const commitScope = `${metadata.problemNumber.padStart(4, '0')}${difficultyMap[metadata.difficulty.toLowerCase()]}`;

    // First line: Summary
    const summary = `solve(${commitScope}): ${metadata.title} [${metadata.difficulty}]`;

    // Details section
    const details = [
        `Status: ${metadata.status}`,
        `Time Spent: ${metadata.timeSpent}`,
        `Approach: ${metadata.approach}`,
        `Time Complexity: ${metadata.timeComplexity}`,
        `Space Complexity: ${metadata.spaceComplexity}`,
        `Timestamp: ${timestamp}`
    ];

    // Combine summary and details
    return `${summary}\n\n${details.join('\n')}`;
}