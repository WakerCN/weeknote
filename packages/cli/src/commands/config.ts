/**
 * config 命令实现
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { MODEL_REGISTRY, getFreeModels, getPaidModels } from '@weeknote/core';
import type { ModelId } from '@weeknote/core';
import {
  loadConfig,
  setPrimaryConfig,
  setDefaultModel,
  setApiKey,
  getApiKey,
  getDefaultModel,
  getConfigPath,
  validateModelId,
  getConfiguredPlatforms,
  getModelsForPlatform,
  getPlatformFromModelId,
  type Platform,
} from '../config.js';

export interface ConfigSetOptions {
  model: string;
  key: string;
}

export interface ConfigKeyOptions {
  platform: string;
  key: string;
}

/**
 * 执行 config set 命令
 */
export function runConfigSet(options: ConfigSetOptions): void {
  const modelId = validateModelId(options.model);
  if (!modelId) {
    console.error(chalk.red(`❌ 无效的模型: ${options.model}`));
    console.log(chalk.gray('\n可用模型:'));
    listModels();
    process.exit(1);
  }

  if (!options.key || options.key.trim() === '') {
    console.error(chalk.red('❌ API Key 不能为空'));
    process.exit(1);
  }

  const meta = MODEL_REGISTRY[modelId];

  setPrimaryConfig(modelId, options.key);
  console.log(chalk.green(`✅ 已设置模型: ${meta.name} (${modelId})`));

  if (meta.isFree) {
    console.log(chalk.cyan('   💡 这是一个免费模型'));
  }

  console.log(chalk.gray(`配置文件: ${getConfigPath()}`));
}

/**
 * 执行 config key 命令 - 设置平台 API Key
 */
export function runConfigKey(options: ConfigKeyOptions): void {
  const platform = options.platform.toLowerCase() as Platform;

  if (!['siliconflow', 'deepseek', 'openai'].includes(platform)) {
    console.error(chalk.red(`❌ 无效的平台: ${options.platform}`));
    console.log(chalk.gray('\n支持的平台:'));
    console.log(chalk.gray('  - siliconflow (硅基流动)'));
    console.log(chalk.gray('  - deepseek (DeepSeek)'));
    console.log(chalk.gray('  - openai (OpenAI)'));
    process.exit(1);
  }

  if (!options.key || options.key.trim() === '') {
    console.error(chalk.red('❌ API Key 不能为空'));
    process.exit(1);
  }

  setApiKey(platform, options.key);

  const platformNames: Record<Platform, string> = {
    siliconflow: '硅基流动',
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
  };

  console.log(chalk.green(`✅ 已设置 ${platformNames[platform]} API Key`));

  const models = getModelsForPlatform(platform);
  console.log(chalk.gray(`\n可使用的模型:`));
  models.forEach((m) => {
    const meta = MODEL_REGISTRY[m];
    const freeTag = meta.isFree ? chalk.green(' [免费]') : '';
    console.log(chalk.gray(`  - ${m}${freeTag}`));
  });
}

/**
 * 交互式选择默认模型
 */
export async function runConfigDefaultInteractive(): Promise<void> {
  const currentDefault = getDefaultModel();
  const configuredPlatforms = getConfiguredPlatforms();

  console.log(chalk.bold('\n🤖 选择默认模型\n'));

  // 构建选项列表
  const freeModels = getFreeModels();
  const paidModels = getPaidModels();

  const choices: Array<{ name: string; value: ModelId | 'separator' }> = [];

  // 免费模型
  freeModels.forEach((m) => {
    const platform = getPlatformFromModelId(m.id);
    const hasKey = configuredPlatforms.includes(platform);
    const keyStatus = hasKey ? chalk.green('✓') : chalk.yellow('⚠ 未配置Key');
    const isDefault = m.id === currentDefault ? chalk.cyan(' ← 当前') : '';

    choices.push({
      name: `${m.name} ${chalk.green('[免费]')} ${keyStatus}${isDefault}`,
      value: m.id,
    });
  });

  // 分隔符
  choices.push(new inquirer.Separator(chalk.gray('─── 收费模型 ───')) as unknown as { name: string; value: 'separator' });

  // 收费模型
  paidModels.forEach((m) => {
    const platform = getPlatformFromModelId(m.id);
    const hasKey = configuredPlatforms.includes(platform);
    const keyStatus = hasKey ? chalk.green('✓') : chalk.yellow('⚠ 未配置Key');
    const isDefault = m.id === currentDefault ? chalk.cyan(' ← 当前') : '';

    choices.push({
      name: `${m.name} ${chalk.yellow('[收费]')} ${keyStatus}${isDefault}`,
      value: m.id,
    });
  });

  try {
    const { selectedModel } = await inquirer.prompt<{ selectedModel: ModelId }>([
      {
        type: 'list',
        name: 'selectedModel',
        message: '请选择默认模型:',
        choices,
        default: currentDefault,
        loop: false,
      },
    ]);

    if (!selectedModel) {
      return;
    }

    const platform = getPlatformFromModelId(selectedModel);
    const hasKey = configuredPlatforms.includes(platform);

    // 如果没有配置 API Key，提示用户输入
    if (!hasKey) {
      const platformNames: Record<Platform, string> = {
        siliconflow: '硅基流动',
        deepseek: 'DeepSeek',
        openai: 'OpenAI',
      };

      console.log(chalk.yellow(`\n⚠️  尚未配置 ${platformNames[platform]} 的 API Key`));

      const { shouldSetKey } = await inquirer.prompt<{ shouldSetKey: boolean }>([
        {
          type: 'confirm',
          name: 'shouldSetKey',
          message: '是否现在设置 API Key?',
          default: true,
        },
      ]);

      if (shouldSetKey) {
        const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
          {
            type: 'input',
            name: 'apiKey',
            message: `请输入 ${platformNames[platform]} API Key:`,
            validate: (value: string) => {
              if (!value.trim()) {
                return 'API Key 不能为空';
              }
              return true;
            },
          },
        ]);

        setApiKey(platform, apiKey);
        console.log(chalk.green(`✅ 已设置 ${platformNames[platform]} API Key`));
      }
    }

    setDefaultModel(selectedModel);
    const meta = MODEL_REGISTRY[selectedModel];
    console.log(chalk.green(`\n✅ 已设置默认模型: ${meta.name} (${selectedModel})`));

    if (meta.isFree) {
      console.log(chalk.cyan('   💡 这是一个免费模型'));
    }
  } catch {
    // 用户按 Ctrl+C 取消
    console.log(chalk.gray('\n已取消'));
  }
}

/**
 * 执行 config default 命令 - 设置默认模型
 */
export async function runConfigDefault(modelIdArg?: string): Promise<void> {
  // 如果没有提供参数，进入交互式选择
  if (!modelIdArg) {
    await runConfigDefaultInteractive();
    return;
  }

  const modelId = validateModelId(modelIdArg);
  if (!modelId) {
    console.error(chalk.red(`❌ 无效的模型: ${modelIdArg}`));
    console.log(chalk.gray('\n可用模型:'));
    listModels();
    process.exit(1);
  }

  const platform = getPlatformFromModelId(modelId);
  const configuredPlatforms = getConfiguredPlatforms();

  if (!configuredPlatforms.includes(platform)) {
    console.log(chalk.yellow(`⚠️  注意: 未配置 ${platform} 的 API Key`));
    console.log(chalk.gray(`  请先运行: weeknote config key -p ${platform} -k <your-key>\n`));
  }

  setDefaultModel(modelId);

  const meta = MODEL_REGISTRY[modelId];
  console.log(chalk.green(`✅ 已设置默认模型: ${meta.name} (${modelId})`));

  if (meta.isFree) {
    console.log(chalk.cyan('   💡 这是一个免费模型'));
  }
}

/**
 * 交互式配置向导
 */
export async function runConfigInit(): Promise<void> {
  console.log(chalk.bold('\n🚀 WeekNote 配置向导\n'));

  const configuredPlatforms = getConfiguredPlatforms();

  // 1. 选择平台
  const platformChoices = [
    {
      name: `硅基流动 ${chalk.green('[推荐，有免费额度]')}${configuredPlatforms.includes('siliconflow') ? chalk.green(' ✓ 已配置') : ''}`,
      value: 'siliconflow' as Platform,
    },
    {
      name: `DeepSeek${configuredPlatforms.includes('deepseek') ? chalk.green(' ✓ 已配置') : ''}`,
      value: 'deepseek' as Platform,
    },
    {
      name: `OpenAI${configuredPlatforms.includes('openai') ? chalk.green(' ✓ 已配置') : ''}`,
      value: 'openai' as Platform,
    },
  ];

  try {
    const { selectedPlatform } = await inquirer.prompt<{ selectedPlatform: Platform }>([
      {
        type: 'list',
        name: 'selectedPlatform',
        message: '选择 AI 服务平台:',
        choices: platformChoices,
      },
    ]);

    const platform = selectedPlatform as Platform;

    // 2. 检查是否已有 Key
    const existingKey = getApiKey(platform);
    let apiKey = existingKey;

    if (existingKey) {
      const { useExisting } = await inquirer.prompt<{ useExisting: boolean }>([
        {
          type: 'confirm',
          name: 'useExisting',
          message: `已有 API Key (${maskApiKey(existingKey)})，是否使用现有的?`,
          default: true,
        },
      ]);

      if (!useExisting) {
        const { newKey } = await inquirer.prompt<{ newKey: string }>([
          {
            type: 'input',
            name: 'newKey',
            message: '请输入新的 API Key:',
            validate: (value: string) => (value.trim() ? true : 'API Key 不能为空'),
          },
        ]);
        apiKey = newKey;
        setApiKey(platform, apiKey);
        console.log(chalk.green('✅ API Key 已更新'));
      }
    } else {
      const platformUrls: Record<Platform, string> = {
        siliconflow: 'https://cloud.siliconflow.cn/',
        deepseek: 'https://platform.deepseek.com/',
        openai: 'https://platform.openai.com/',
      };

      console.log(chalk.gray(`\n获取 API Key: ${platformUrls[platform]}\n`));

      const { newKey } = await inquirer.prompt<{ newKey: string }>([
        {
          type: 'input',
          name: 'newKey',
          message: '请输入 API Key:',
          validate: (value: string) => (value.trim() ? true : 'API Key 不能为空'),
        },
      ]);
      apiKey = newKey;
      setApiKey(platform, apiKey!);
      console.log(chalk.green('✅ API Key 已保存'));
    }

    // 3. 选择默认模型
    const models = getModelsForPlatform(platform);
    const modelChoices = models.map((m) => {
      const meta = MODEL_REGISTRY[m];
      const freeTag = meta.isFree ? chalk.green(' [免费]') : chalk.yellow(' [收费]');
      return {
        name: `${meta.name}${freeTag}`,
        value: m,
      };
    });

    const { selectedModel } = await inquirer.prompt<{ selectedModel: ModelId }>([
      {
        type: 'list',
        name: 'selectedModel',
        message: '选择默认模型:',
        choices: modelChoices,
        default: models[0],
      },
    ]);

    setDefaultModel(selectedModel as ModelId);
    const meta = MODEL_REGISTRY[selectedModel as ModelId];
    console.log(chalk.green(`\n✅ 配置完成！默认模型: ${meta.name}`));

    console.log(chalk.gray('\n现在可以使用以下命令生成周报:'));
    console.log(chalk.cyan('  weeknote generate -f <daily-log.md>'));
  } catch {
    console.log(chalk.gray('\n已取消'));
  }
}

/**
 * 执行 config show 命令
 */
export function runConfigShow(): void {
  const config = loadConfig();

  console.log(chalk.bold('\n📋 当前配置\n'));
  console.log(chalk.gray(`配置文件: ${getConfigPath()}\n`));

  const defaultModel = getDefaultModel();
  const defaultMeta = MODEL_REGISTRY[defaultModel];
  console.log(chalk.cyan('默认模型:'));
  console.log(`  ${chalk.bold(defaultModel)}`);
  if (defaultMeta) {
    const freeTag = defaultMeta.isFree ? chalk.green(' [免费]') : chalk.yellow(' [收费]');
    console.log(`  ${defaultMeta.name}${freeTag}`);
  }

  console.log(chalk.cyan('\nAPI Keys:'));
  const platforms: Array<{ key: Platform; name: string }> = [
    { key: 'siliconflow', name: '硅基流动' },
    { key: 'deepseek', name: 'DeepSeek' },
    { key: 'openai', name: 'OpenAI' },
  ];

  let hasAnyKey = false;
  for (const { key, name } of platforms) {
    const apiKey = config.apiKeys?.[key];
    if (apiKey) {
      hasAnyKey = true;
      console.log(`  ${name}: ${maskApiKey(apiKey)}`);
    }
  }

  if (!hasAnyKey) {
    console.log(chalk.gray('  未配置任何 API Key'));
    console.log(chalk.gray('\n运行以下命令开始配置:'));
    console.log(chalk.gray('  weeknote config init'));
  }

  console.log('');
}

/**
 * 执行 config models 命令 - 显示所有可用模型
 */
export function runConfigModels(): void {
  console.log(chalk.bold('\n📋 可用模型列表\n'));

  const configuredPlatforms = getConfiguredPlatforms();
  const defaultModel = getDefaultModel();

  const freeModels = getFreeModels();
  console.log(chalk.green('免费模型:'));
  freeModels.forEach((m) => {
    const isDefault = m.id === defaultModel ? chalk.cyan(' ★ 默认') : '';
    const platform = getPlatformFromModelId(m.id);
    const hasKey = configuredPlatforms.includes(platform);
    const keyStatus = hasKey ? chalk.green(' ✓') : chalk.gray(' (未配置Key)');
    console.log(`  ${chalk.bold(m.id)}${isDefault}${keyStatus}`);
    console.log(`    ${m.name} - ${m.description}`);
  });

  const paidModels = getPaidModels();
  console.log(chalk.yellow('\n收费模型:'));
  paidModels.forEach((m) => {
    const isDefault = m.id === defaultModel ? chalk.cyan(' ★ 默认') : '';
    const platform = getPlatformFromModelId(m.id);
    const hasKey = configuredPlatforms.includes(platform);
    const keyStatus = hasKey ? chalk.green(' ✓') : chalk.gray(' (未配置Key)');
    console.log(`  ${chalk.bold(m.id)}${isDefault}${keyStatus}`);
    console.log(`    ${m.name} - ${m.description}`);
  });

  console.log(chalk.gray('\n命令:'));
  console.log(chalk.gray('  weeknote config default          交互式选择默认模型'));
  console.log(chalk.gray('  weeknote config init             配置向导'));
  console.log('');
}

/**
 * 列出所有模型（简洁版）
 */
function listModels(): void {
  const freeModels = getFreeModels();
  const paidModels = getPaidModels();

  console.log(chalk.green('  免费:'));
  freeModels.forEach((m) => console.log(`    ${m.id}`));

  console.log(chalk.yellow('  收费:'));
  paidModels.forEach((m) => console.log(`    ${m.id}`));
}

/**
 * 遮蔽 API Key
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return '****';
  }
  return key.slice(0, 4) + '****' + key.slice(-4);
}
