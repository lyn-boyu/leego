import { generateWithAI, initializeAI } from './ai';
import { logger } from './logger';
import { loadSensitiveConfig } from './config';
import { type ProblemDetails as Problem } from './api'


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

Title: ${problem.number.toString().padStart(4, '0')} - ${problem.title} - ${problem.difficulty}
Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}

Problem Description:
${problem.content.replace(/<[^>]*>/g, '')} 

Requirements:
1. Start with comment containing:
   - Problem number, problem title and difficulty
   - Link to the problem
   - Topics covered
   - Problem description including decription, examples and constraints
   - add helpful comments explaining the examples and constraints
2. Export a default function with proper TypeScript type annotations
3. Return the correct type based on the problem requirements
4. Only Add one line comment of a encouraging message containing emoji in the function body

provide ONLY the TypeScript code without any additional formatting or markdown!
provide ONLY the TypeScript code without any additional formatting or markdown!`;

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

Title: ${problem.number.toString().padStart(4, '0')} - ${problem.title} - ${problem.difficulty}
Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}

Problem Description:
${problem.content.replace(/<[^>]*>/g, '')}

Requirements:
1. Provide the most efficient solution possible
2. Use TypeScript with proper type annotations
3. Include brief comments explaining the approach and complexities
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
  solution?: string;      // Current solution being tested
}

export async function generateTest(problem: Problem, context?: TestContext): Promise<string> {
  try {
    const modelName = await getActiveModelName();
    await logger.info(`🤖 Generating test template using ${modelName}...`);

    // Log test generation context to file only

    const contextInfo = {
      problemTitle: problem.title,
      modelName,
      context: context ? {
        hasPreviousTest: !!context.previousTest,
        previousTestLength: context.previousTest?.length || 0,
        hasTestOutput: !!context.testOutput,
        testOutputLength: context.testOutput?.length || 0,
        hasSolution: !!context.solution
      } : 'Initial generation'
    };


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
   - Generate test cases from the problem description and example.
   - Edge cases (null, empty, boundary values)
   - Basic cases (simple inputs)
4. Add helper functions if needed (e.g., for creating test data structures)
5. Add descriptive test names that explain the scenario being tested
6. DO NOT wrap the code in markdown code blocks or any other formatting
`;
    } else {
      // Generate modified test cases based on previous results and current solution
      prompt = `
Please  Delete all failed test cases for the following LeetCode problem:

Title: ${problem.difficulty} ${problem.title}  

Current Solution:
${context.solution || 'Solution not provided'}

Previous Test Code:
${context.previousTest}

Test Execution Output:
${context.testOutput}

Requirements:
1. Delete all failed test cases, keeping only the ones that passed.
2. Ensure all the examples from description has a test case
3. Keep using Use Bun's test framework (import { describe, it, expect } from "bun:test") Import default solution from "./index"
4. DO NOT wrap the code in markdown code blocks

Please provide ONLY the TypeScript code without any additional formatting or markdown.
`;
    }
    await logger.debug(`==== Generating test with prompt ===== \n `);
    await logger.debug(`Generating test with prompt:\n${prompt}`);
    await logger.debug(`==== Generating test with prompt ===== \n `);



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
  const readme = `# ${problem.number.toString().padStart(4, '0')} ${problem.title} - ${problem.difficulty}  
> Link: ${getLeetCodeLink(problem.title)}

${problem.content}

## Topics: ${problem.topicTags.map(tag => tag.name).join(', ')}
`;
  await logger.info('✅ README generated successfully');
  return readme;
}