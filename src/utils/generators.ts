import { generateWithAI, initializeAI } from './ai';
import { loadActiveModelName } from './config';
import { logger } from './logger';
import chalk from 'chalk';

interface Problem {
  title: string;
  difficulty: string;
  content: string;
  topicTags: { name: string }[];
}

function getLeetCodeLink(title: string): string {
  return `https://leetcode.com/problems/${title.toLowerCase().replace(/\s+/g, '-')}/`;
}

function generateDefaultSolutionTemplate(problem: Problem): string {
  console.log(chalk.yellow('⚠️  Using default solution template'));
  return `/**
 * ${problem.title} - ${problem.difficulty}
 * Link: ${getLeetCodeLink(problem.title)}
 * Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}
 * 
 * Problem Description:
 ${problem.content.replace(/<[^>]*>/g, '')}
 */

export default function solution() {
  // Your implementation here
  return null;
}`;
}

function generateDefaultTest(problem: Problem): string {
  console.log(chalk.yellow('⚠️  Using default test template'));
  return `import { describe, it, expect } from "bun:test";
import solution from "./index";

/**
 * ${problem.title} - ${problem.difficulty}
 * Link: ${getLeetCodeLink(problem.title)}
 */
describe("${problem.title}", () => {
  it("should pass basic test cases", () => {
    // Add test cases based on problem requirements
    expect(true).toBe(true);
  });
});`;
}

function validateTemplate(template: string): boolean {
  // Check for required elements
  const hasExportDefault = /export\s+default\s+function/.test(template);
  const hasJSDoc = /\/\*\*[\s\S]*?\*\//.test(template);
  const hasLink = /\* Link:/.test(template);
  const hasValidStructure = template.includes('function') && template.includes('return');

  return hasExportDefault && hasJSDoc && hasValidStructure;
}

function ensureTemplateFormat(template: string, problem: Problem): string {
  let result = template;

  // Ensure JSDoc comment exists
  if (!result.startsWith('/**')) {
    result = `/**\n * ${problem.title} - ${problem.difficulty}\n */\n${result}`;
  }

  // Ensure Link is present
  if (!result.includes('* Link:')) {
    result = result.replace(
      '/**\n',
      `/**\n * Link: ${getLeetCodeLink(problem.title)}\n`
    );
  }

  // Ensure export default is present
  if (!result.includes('export default')) {
    result = result.replace(
      /^function\s+(\w+)/m,
      'export default function $1'
    );
  }

  return result;
}

export async function generateSolutionTemplate(problem: Problem): Promise<string> {
  try {
    console.log(chalk.blue('🔍 Checking LLM configuration...'));
    await initializeAI();

    console.log(chalk.blue('🤖 Generating solution template using LLM...'));
    const prompt = `
Create a TypeScript solution template for the following LeetCode problem:

Title: ${problem.title} - ${problem.difficulty}
Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}

Problem Description:
${problem.content.replace(/<[^>]*>/g, '')}

Requirements:
1. Start with comment containing:
   - Problem title and difficulty
   - Link to the problem
   - Topics covered
   - Problem description including decription, examples and constraints
2. Export a default function with proper TypeScript type annotations
3. Include helpful comments explaining the approach
4. Return the correct type based on the problem requirements
5. Keep the function body empty and one line comment for the user to implement

Example format:
/**
 * Problem Title - Difficulty
 * Link: https://leetcode.com/problems/...
 * Topics: Array, Hash Table
 * 
 * Problem Description:
 * [Description here]
 */
export default function solution(param: Type): ReturnType {
  // Implementation
  return defaultValue;
}

Please provide ONLY the TypeScript code without any additional formatting or markdown.`;

    let template = await generateWithAI(prompt);

    if (!template || template.trim().length === 0) {
      console.log(chalk.red('❌ LLM generated an empty template'));
      await logger.warn('LLM generated an empty template, falling back to default');
      return generateDefaultSolutionTemplate(problem);
    }

    // Clean up the template
    template = template.trim();

    // Validate the template
    if (!validateTemplate(template)) {
      console.log(chalk.red('❌ LLM template missing required elements'));
      await logger.warn('LLM template missing required elements, attempting to fix...');

      // Try to fix the template
      template = ensureTemplateFormat(template, problem);

      // Validate again after fixing
      if (!validateTemplate(template)) {
        console.log(chalk.red('❌ Could not fix LLM template'));
        await logger.warn('Could not fix LLM template, falling back to default');
        return generateDefaultSolutionTemplate(problem);
      }
    }

    const modelName = await loadActiveModelName();
    console.log(chalk.green('✅ Successfully generated solution template by using LLM: ' + modelName));
    return template;
  } catch (error) {
    console.log(chalk.red(`❌ LLM template generation failed: ${(error as Error).message}`));
    await logger.error('LLM template generation failed', error as Error);

    if ((error as Error).message.includes('LLM configuration not found')) {
      console.log(chalk.yellow('⚠️  No LLM configuration found'));
      return generateDefaultSolutionTemplate(problem);
    }

    console.log(chalk.yellow('⚠️  Falling back to default template'));
    await logger.warn(`Falling back to default template due to error: ${(error as Error).message}`);
    return generateDefaultSolutionTemplate(problem);
  }
}

export async function generateTest(problem: Problem): Promise<string> {
  try {
    console.log(chalk.blue('🔍 Checking LLM configuration...'));
    await initializeAI();

    console.log(chalk.blue('🤖 Generating test template using LLM...'));
    const prompt = `
Create a comprehensive test suite using Bun test for the following LeetCode problem:

Title: ${problem.title}

Problem Description:
${problem.content.replace(/<[^>]*>/g, '')}

Requirements:
1. Use Bun's test framework (import { describe, it, expect } from "bun:test")
2. Import default solution from "./index"
3. Include test cases for:
   - Edge cases
   - Basic cases
   - Complex cases
4. Add helper functions if needed (e.g., for creating test data structures)
5. Add descriptive test names
6. DO NOT wrap the code in markdown code blocks or any other formatting
`;

    let test = await generateWithAI(prompt);

    if (!test || test.trim().length === 0) {
      console.log(chalk.red('❌ AI generated empty test'));
      await logger.warn('AI generated empty test, falling back to default');
      return generateDefaultTest(problem);
    }

    if (!test.includes('describe') || !test.includes('expect')) {
      console.log(chalk.red('❌ AI test missing required elements'));
      await logger.warn('AI test missing required elements, falling back to default');
      return generateDefaultTest(problem);
    }

    if (!test.includes('Link:')) {
      test = `/**
 * ${problem.title} - ${problem.difficulty}
 * Link: ${getLeetCodeLink(problem.title)}
 */
${test}`;
    }
    const modelName = await loadActiveModelName();
    console.log(chalk.green('✅ Successfully generated test cases by using LLM: ' + modelName));
    return test;
  } catch (error) {
    console.log(chalk.red(`❌ AI test generation failed: ${(error as Error).message}`));
    await logger.error('AI test generation failed', error as Error);

    if ((error as Error).message.includes('AI configuration not found')) {
      console.log(chalk.yellow('⚠️  No AI configuration found'));
      return generateDefaultTest(problem);
    }

    console.log(chalk.yellow('⚠️  Falling back to default test'));
    await logger.warn(`Falling back to default test due to error: ${(error as Error).message}`);
    return generateDefaultTest(problem);
  }
}

export function generateReadme(problem: Problem): string {
  console.log(chalk.blue('📝 Generating README...'));
  const readme = `# ${problem.title} - ${problem.difficulty}  
> Link: ${getLeetCodeLink(problem.title)}

${problem.content}

##### Topics:
> ${problem.topicTags.map(tag => tag.name).join(', ')}
 
`;
  console.log(chalk.green('✅ README generated successfully'));
  return readme;
}