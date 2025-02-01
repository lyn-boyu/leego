import { generateWithAI, initializeAI } from './ai';
import { logger } from './logger';
import { loadSensitiveConfig } from './config';

interface Problem {
  title: string;
  difficulty: string;
  content: string;
  topicTags: { name: string }[];
}

function getLeetCodeLink(title: string): string {
  return `https://leetcode.com/problems/${title.toLowerCase().replace(/\s+/g, '-')}/`;
}

async function getActiveModelName(): Promise<string> {
  const config = await loadSensitiveConfig();
  const activeKey = config.ai.activeKey;
  if (!activeKey || !config.ai.keys[activeKey]) {
    return 'Unknown Model';
  }
  return config.ai.keys[activeKey].model;
}

export async function generateSolutionTemplate(problem: Problem): Promise<string> {
  try {
    const modelName = await getActiveModelName();
    await logger.info(`🤖 Generating solution template using ${modelName}...`);
    const prompt = `
Create a TypeScript solution template for the following LeetCode problem:

Title: ${problem.title} - ${problem.difficulty}
Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}

Problem Description:
${problem.content.replace(/<[^>]*>/g, '')}

Requirements:
1. Create a basic template with the correct function signature
2. Use TypeScript with proper type annotations
3. Include placeholder implementation (e.g., return empty array, 0, or null)
4. Add brief comments explaining what needs to be implemented
5. Return the correct type based on the problem requirements
6. The template should compile without errors

Please provide ONLY the TypeScript code without any additional formatting or markdown.`;

    let template = await generateWithAI(prompt);

    if (!template || template.trim().length === 0) {
      await logger.error(`❌ ${modelName} generated an empty template`);
      throw new Error('LLM generated an empty template');
    }

    // Clean up the template
    template = template.trim();

    // Basic validation
    if (!template.includes('export default') || !template.includes('function')) {
      template = `export default ${template}`;
    }

    await logger.info(`✅ Successfully generated solution template with ${modelName}`);
    return template;
  } catch (error) {
    await logger.error(`❌ Template generation with ${await getActiveModelName()} failed: ${(error as Error).message}`);
    throw error;
  }
}

export async function generateSolution(problem: Problem): Promise<string> {
  try {
    const modelName = await getActiveModelName();
    await logger.info(`🤖 Generating optimal solution using ${modelName}...`);
    const prompt = `
Create a TypeScript solution for the following LeetCode problem:

Title: ${problem.title} - ${problem.difficulty}
Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}

Problem Description:
${problem.content.replace(/<[^>]*>/g, '')}

Requirements:
1. Provide the most efficient solution possible
2. Use TypeScript with proper type annotations
3. Include brief comments explaining the approach
4. Focus on optimal time and space complexity
5. Return the correct type based on the problem requirements
6. The solution should be complete and ready to pass all test cases

Please provide ONLY the TypeScript code without any additional formatting or markdown.`;

    let solution = await generateWithAI(prompt);

    if (!solution || solution.trim().length === 0) {
      await logger.error(`❌ ${modelName} generated an empty solution`);
      throw new Error('LLM generated an empty solution');
    }

    // Clean up the solution
    solution = solution.trim();

    // Basic validation
    if (!solution.includes('export default') || !solution.includes('function')) {
      solution = `export default ${solution}`;
    }

    await logger.info(`✅ Successfully generated optimal solution with ${modelName}`);
    return solution;
  } catch (error) {
    await logger.error(`❌ Solution generation with ${await getActiveModelName()} failed: ${(error as Error).message}`);
    throw error;
  }
}

interface TestContext {
  previousTest?: string;  // Previous test case code
  testOutput?: string;    // Test execution results
}

export async function generateTest(problem: Problem, context?: TestContext): Promise<string> {
  try {
    const modelName = await getActiveModelName();
    await logger.info(`🤖 Generating test template using ${modelName}...`);

    // Log test generation context to file only
    if (logger.debug) {
      const contextInfo = {
        problemTitle: problem.title,
        modelName,
        context: context ? {
          hasPreviousTest: !!context.previousTest,
          previousTestLength: context.previousTest?.length || 0,
          hasTestOutput: !!context.testOutput,
          testOutputLength: context.testOutput?.length || 0
        } : 'Initial generation'
      };
      await logger.debug(`Test Generation Context: ${JSON.stringify(contextInfo, null, 2)}`);

      if (context?.previousTest) {
        await logger.debug(`Previous Test Code:\n${context.previousTest}`);
      }
      if (context?.testOutput) {
        await logger.debug(`Test Execution Output:\n${context.testOutput}`);
      }
    }

    let prompt: string;

    if (!context || (!context.previousTest && !context.testOutput)) {
      // First time generating test cases
      prompt = `
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
    } else {
      // Generate modified test cases based on previous results
      prompt = `
Please fix/improve the test cases for the following LeetCode problem based on the previous test execution results:

Title: ${problem.title}

Previous Test Code:
${context.previousTest}

Test Execution Output:
${context.testOutput}

Requirements:
1. Analyze the test failures and error messages
2. Keep the working test cases
3. Fix or replace the failing test cases
4. Add any missing edge cases
5. Ensure all test cases are valid and match the problem requirements
6. Keep using Bun's test framework
7. DO NOT wrap the code in markdown code blocks

Please provide the complete, corrected test suite.`;
    }

    await logger.debug(`Generating test with prompt:\n${prompt}`);

    let test = await generateWithAI(prompt);

    if (!test || test.trim().length === 0) {
      const error = `${modelName} generated empty test`;
      await logger.error(error);
      throw new Error('LLM generated empty test');
    }

    if (!test.includes('describe') || !test.includes('expect')) {
      const error = `${modelName} test missing required elements`;
      await logger.error(error);
      throw new Error('LLM test missing required elements');
    }

    if (!test.includes('Link:')) {
      test = `/**
 * ${problem.title} - ${problem.difficulty}
 * Link: ${getLeetCodeLink(problem.title)}
 */
${test}`;
    }

    await logger.debug(`Generated test code:\n${test}`);
    await logger.info(`✅ Successfully generated test template with ${modelName}`);
    return test;
  } catch (error) {
    await logger.error(`Test generation failed: ${error}`);
    throw error;
  }
}

export async function generateReadme(problem: Problem): Promise<string> {
  await logger.info('📝 Generating README...');
  const readme = `# ${problem.title} - ${problem.difficulty}  
> Link: ${getLeetCodeLink(problem.title)}

${problem.content}

## Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}
`;
  await logger.info('✅ README generated successfully');
  return readme;
}