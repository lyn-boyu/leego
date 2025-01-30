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

    // First line: Summary
    const summary = `solve(${metadata.problemNumber}): ${metadata.title} [${metadata.difficulty}]`;

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