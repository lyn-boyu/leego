import inquirer from 'inquirer';
import Anthropic from '@anthropic-ai/sdk';
import { loadSensitiveConfig, updateSensitiveConfig } from '../utils/config';
import { AI_PROVIDERS, type AIProvider, type AIModel } from '../config/constants';
import { logger } from '../utils/logger';

async function fetchOpenAIModels(apiKey: string): Promise<Array<{ id: string, name: string }>> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    return data.data
      .filter((model: any) =>
        model.id.includes('gpt') &&
        !model.id.includes('instruct') &&
        model.id.startsWith('gpt-')
      )
      .map((model: any) => ({
        id: model.id,
        name: model.id.split('-').slice(1).join(' ').toUpperCase()
      }))
      .sort((a: any, b: any) => b.id.localeCompare(a.id));
  } catch (error) {
    logger.error('❌ Error fetching OpenAI models:', error as Error);
    return AI_PROVIDERS.openai.models as any as Array<{ id: string, name: string }>;
  }
}

async function fetchAnthropicModels(apiKey: string): Promise<Array<{ id: string, name: string }>> {
  try {
    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    const response = await anthropic.models.list();

    return response.data
      .filter((model: any) => model.id.includes('claude'))
      .map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id.split('-').join(' ').toUpperCase()
      }))
      .sort((a: any, b: any) => b.id.localeCompare(a.id));
  } catch (error) {
    logger.error('❌ Error fetching Anthropic models:', error as Error);
    return AI_PROVIDERS.anthropic.models as any as Array<{ id: string, name: string }>;
  }
}

export async function setApiKey() {
  try {
    const config = await loadSensitiveConfig();

    const existingKeys = Object.entries(config.ai.keys).map(([name, conf]) => ({
      name: `🔑 ${name} (${AI_PROVIDERS[conf.provider].name} - ${conf.model})`,
      value: name
    }));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '🤔 What would you like to do?',
        choices: [
          { name: '🆕 Add new API key', value: 'add' },
          ...(existingKeys.length > 0 ? [
            { name: '🔄 Switch active key', value: 'switch' },
            { name: '🗑️ Remove existing key', value: 'remove' }
          ] : [])
        ]
      }
    ]);

    if (action === 'switch' && existingKeys.length > 0) {
      const { keyName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'keyName',
          message: '🔄 Select the key to make active:',
          choices: existingKeys
        }
      ]);

      config.ai.activeKey = keyName;
      await updateSensitiveConfig(config);
      logger.success(`🔄 Switched to ${keyName}`);
      return;
    }

    if (action === 'remove' && existingKeys.length > 0) {
      const { keyName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'keyName',
          message: '🗑️ Select the key to remove:',
          choices: existingKeys
        }
      ]);

      delete config.ai.keys[keyName];
      if (config.ai.activeKey === keyName) {
        config.ai.activeKey = Object.keys(config.ai.keys)[0] || null;
      }
      await updateSensitiveConfig(config);
      logger.success(`🗑️ Removed ${keyName}`);
      return;
    }

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: '🤖 Select AI provider:',
        choices: [
          { name: '🟢 OpenAI', value: 'openai' },
          { name: '🟣 Anthropic', value: 'anthropic' },
          { name: '🔵 DeepSeek', value: 'deepseek' },
          { name: '🔧 Custom LLM', value: 'custom' }
        ]
      }
    ]);

    let apiKey = '';
    if (provider !== 'custom') {
      const { key } = await inquirer.prompt([
        {
          type: 'password',
          name: 'key',
          message: '🔑 Enter your API key:',
          validate: (input) => {
            if (!input) return '❌ API key is required';
            if (input.length < 20) return '⚠️ API key seems too short';
            return true;
          }
        }
      ]);
      apiKey = key;
    }

    let modelChoices;
    if (provider === 'custom') {
      modelChoices = [{ name: '🔧 Custom Implementation', value: 'custom' }];
      logger.info(`
📝 To use a custom LLM implementation:

1. open config file at .leetcode/llm.ts
2. Export an async function with this signature:
   export async function generateWithAI(prompt: string): Promise<string>
3. Your implementation should:
   - Accept a prompt string
   - Return the generated text
   - Handle any errors appropriately
   - Use your preferred local or remote LLM

Example implementation:

export async function generateWithAI(prompt: string): Promise<string> {
  try {
    // Your custom LLM logic here
    // For example, calling a local model or different API
    const response = await yourLLMImplementation(prompt);
    return response;
  } catch (error) {
    throw new Error(\`Custom LLM error: \${error.message}\`);
  }
}
`);
    } else if (provider === 'openai') {
      logger.info('🔄 Fetching available OpenAI models...');
      logger.info('💰 Check OpenAI pricing at: https://platform.openai.com/docs/pricing');
      const availableModels = await fetchOpenAIModels(apiKey);
      modelChoices = [
        ...availableModels.map(model => ({
          name: `🧠 ${model.name}`,
          value: model.id
        })),
        { name: '⚙️ Custom model', value: 'custom' }
      ];
    } else if (provider === 'anthropic') {
      logger.info('🔄 Fetching available Anthropic models...');
      const availableModels = await fetchAnthropicModels(apiKey);
      modelChoices = [
        ...availableModels.map(model => ({
          name: `🧠 ${model.name}`,
          value: model.id
        })),
        { name: '⚙️ Custom model', value: 'custom' }
      ];
    } else {
      modelChoices = [
        ...(AI_PROVIDERS[provider].models).map(model => ({
          name: `🧠 ${model.name}`,
          value: model.id
        })),
        { name: '⚙️ Custom model', value: 'custom' }
      ];
    }

    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: '🧠 Select model:',
        choices: modelChoices
      }
    ]);

    let model: AIModel = selectedModel;
    if (selectedModel === 'custom' && provider !== 'custom') {
      const { customModel } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customModel',
          message: '⚙️ Enter custom model name:',
          validate: (input: string) => {
            if (!input) return '❌ Model name is required';
            return true;
          }
        }
      ]);
      model = customModel;
    }

    const keyName = provider === 'custom'
      ? 'custom-llm'
      : selectedModel === 'custom'
        ? `${provider}-custom`.toLowerCase()
        : `${provider}-${model}`.toLowerCase();

    config.ai.keys[keyName] = {
      provider,
      model,
      apiKey
    };

    if (!config.ai.activeKey) {
      config.ai.activeKey = keyName;
    } else {
      const { makeActive } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'makeActive',
          message: '🌟 Would you like to make this the active key?',
          default: true
        }
      ]);

      if (makeActive) {
        config.ai.activeKey = keyName;
      }
    }

    await updateSensitiveConfig(config);

    logger.success(`🎉 ${provider === 'custom' ? 'Custom LLM' : 'API key'} "${keyName}" saved successfully!`);
    if (config.ai.activeKey === keyName) {
      logger.info('⭐ This configuration is now active.');
    }

    if (provider === 'custom') {
      logger.info('\n📝 Remember to implement your custom LLM in .leetgo/llm.ts');
    } else {
      logger.info(`\n📝 NOTE: This key will be used with ${provider} (${model}) for generating solutions and tests.`);
    }

  } catch (error) {
    logger.error('❌ Error setting AI configuration:', error as Error);
    process.exit(1);
  }
}