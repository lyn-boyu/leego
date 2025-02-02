import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { loadSensitiveConfig } from './config';
import { logger } from './logger';
import path from 'path';


export async function initializeAI(): Promise<void> {
  const config = await loadSensitiveConfig();
  if (!config.ai.activeKey || !config.ai.keys[config.ai.activeKey]) {
    throw new Error('AI configuration not found. Please configure AI settings using `leego set-ai-key`');
  }
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const config = await loadSensitiveConfig();
  const activeKey = config.ai.activeKey;
  if (!activeKey || !config.ai.keys[activeKey]) {
    throw new Error('OpenAI API key not configured');
  }

  const keyConfig = config.ai.keys[activeKey];
  if (keyConfig.provider !== 'openai') {
    throw new Error('Active key is not configured for OpenAI');
  }

  const openai = new OpenAI({ apiKey: keyConfig.apiKey });

  const response = await openai.chat.completions.create({
    model: keyConfig.model,
    messages: [
      { role: "system", content: "You are an expert programmer helping to generate code for LeetCode problems." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  return response.choices[0]?.message?.content || '';
}

async function generateWithClaude(prompt: string): Promise<string> {
  const config = await loadSensitiveConfig();
  const activeKey = config.ai.activeKey;
  if (!activeKey || !config.ai.keys[activeKey]) {
    throw new Error('Anthropic API key not configured');
  }

  const keyConfig = config.ai.keys[activeKey];
  if (keyConfig.provider !== 'anthropic') {
    throw new Error('Active key is not configured for Anthropic');
  }

  const anthropic = new Anthropic({
    apiKey: keyConfig.apiKey
  });

  try {
    const response = await anthropic.messages.create({
      model: keyConfig.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: "You are an expert programmer helping to generate code for LeetCode problems."
    });

    if (response.content && Array.isArray(response.content)) {
      const textContent = response.content.find(block => block.type === 'text');
      if (textContent && 'text' in textContent) {
        return textContent.text;
      }
    }

    throw new Error('Unexpected response format from Anthropic API');
  } catch (error) {
    await logger.error('Anthropic API error details:', error as Error);
    throw error;
  }
}

async function generateWithDeepSeek(prompt: string): Promise<string> {
  const config = await loadSensitiveConfig();
  const activeKey = config.ai.activeKey;
  if (!activeKey || !config.ai.keys[activeKey]) {
    throw new Error('DeepSeek API key not configured');
  }

  const keyConfig = config.ai.keys[activeKey];
  if (keyConfig.provider !== 'deepseek') {
    throw new Error('Active key is not configured for DeepSeek');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keyConfig.apiKey}`
    },
    body: JSON.stringify({
      model: keyConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DeepSeek API error: ${error.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function generateWithCustomLLM(prompt: string): Promise<string> {
  try {
    const customLLMPath = path.join(process.cwd(), '.leetcode', 'llm.ts');
    const { generateWithAI: customGenerateWithAI } = await import(customLLMPath);

    if (typeof customGenerateWithAI !== 'function') {
      throw new Error('Custom LLM implementation must export a function named generateWithAI');
    }

    return await customGenerateWithAI(prompt);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error('Custom LLM implementation not found. Please create .leetcode/llm.ts');
    }
    throw error;
  }
}

export async function generateWithAI(prompt: string): Promise<string> {
  const config = await loadSensitiveConfig();
  const activeKey = config.ai.activeKey;
  if (!activeKey) throw new Error('No active AI key configured');

  const keyConfig = config.ai.keys[activeKey];

  try {
    switch (keyConfig.provider) {
      case 'openai':
        return await generateWithOpenAI(prompt);
      case 'anthropic':
        return await generateWithClaude(prompt);
      case 'deepseek':
        return await generateWithDeepSeek(prompt);
      case 'custom':
        return await generateWithCustomLLM(prompt);
      default:
        throw new Error(`Unsupported AI provider: ${keyConfig.provider}`);
    }
  } catch (error) {
    await logger.error('API error details:', error as Error);
    throw new Error(`${keyConfig.provider} API error: ${(error as Error).message}`);
  }
}