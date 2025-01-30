import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadSensitiveConfig, updateSensitiveConfig } from '../utils/config';
import { AI_PROVIDERS, type AIProvider, type AIModel } from '../config/constants';

export async function setApiKey() {
  try {
    const config = await loadSensitiveConfig();

    // Get list of existing keys
    const existingKeys = Object.entries(config.ai.keys).map(([name, conf]) => ({
      name: `${name} (${AI_PROVIDERS[conf.provider].name} - ${conf.model})`,
      value: name
    }));

    // Ask if user wants to use existing key or add new one
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Add new API key', value: 'add' },
          ...(existingKeys.length > 0 ? [
            { name: 'Switch active key', value: 'switch' },
            { name: 'Remove existing key', value: 'remove' }
          ] : [])
        ]
      }
    ]);

    if (action === 'switch' && existingKeys.length > 0) {
      const { keyName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'keyName',
          message: 'Select the key to make active:',
          choices: existingKeys
        }
      ]);

      config.ai.activeKey = keyName;
      await updateSensitiveConfig(config);
      console.log(chalk.green(`\n✔ Switched to ${keyName}`));
      return;
    }

    if (action === 'remove' && existingKeys.length > 0) {
      const { keyName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'keyName',
          message: 'Select the key to remove:',
          choices: existingKeys
        }
      ]);

      delete config.ai.keys[keyName];
      if (config.ai.activeKey === keyName) {
        config.ai.activeKey = Object.keys(config.ai.keys)[0] || null;
      }
      await updateSensitiveConfig(config);
      console.log(chalk.green(`\n✔ Removed ${keyName}`));
      return;
    }

    // Select provider from the three supported options
    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select AI provider:',
        choices: [
          { name: 'OpenAI', value: 'openai' },
          { name: 'Anthropic', value: 'anthropic' },
          { name: 'DeepSeek', value: 'deepseek' }
        ]
      }
    ]);

    // Create model choices including a custom option
    const modelChoices = [
      ...AI_PROVIDERS[provider].models.map(model => ({
        name: model.name,
        value: model.id
      })),
      { name: 'Custom model', value: 'custom' }
    ];

    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: 'Select model:',
        choices: modelChoices
      }
    ]);

    let model: AIModel;
    if (selectedModel === 'custom') {
      const { customModel } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customModel',
          message: 'Enter custom model name:',
          validate: (input: string) => {
            if (!input) return 'Model name is required';
            return true;
          }
        }
      ]);
      model = customModel;
    } else {
      model = selectedModel;
    }

    // Generate key name based on provider and model
    const keyName = selectedModel === 'custom'
      ? `${provider}-custom`.toLowerCase()
      : `${provider}-${model}`.toLowerCase();

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key:',
        validate: (input) => {
          if (!input) return 'API key is required';
          if (input.length < 20) return 'API key seems too short';
          return true;
        }
      }
    ]);

    // Add new key to configuration
    config.ai.keys[keyName] = {
      provider,
      model,
      apiKey
    };

    // If this is the first key or no active key is set, make it active
    if (!config.ai.activeKey) {
      config.ai.activeKey = keyName;
    } else {
      // Ask if user wants to make this the active key
      const { makeActive } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'makeActive',
          message: 'Would you like to make this the active key?',
          default: true
        }
      ]);

      if (makeActive) {
        config.ai.activeKey = keyName;
      }
    }

    await updateSensitiveConfig(config);

    console.log(chalk.green(`\n✔ API key "${keyName}" saved successfully!`));
    if (config.ai.activeKey === keyName) {
      console.log(chalk.blue('This key is now active.'));
    }

    // Provider-specific instructions
    console.log(chalk.blue(`\nNOTE: This key will be used with ${provider} (${model}) for generating solutions and tests.`));

  } catch (error) {
    console.error(chalk.red('Error setting API key:', error.message));
    process.exit(1);
  }
}