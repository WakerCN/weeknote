/**
 * CLI 配置管理
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { GeneratorConfig, ModelId } from '@weeknote/core';
import { DEFAULT_MODEL, isValidModelId, MODEL_REGISTRY } from '@weeknote/core';

/**
 * 配置文件路径
 */
const CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * 平台类型
 */
export type Platform = 'siliconflow' | 'deepseek' | 'openai';

/**
 * 配置文件结构（新版）
 */
export interface CLIConfig {
  /** 默认模型 */
  defaultModel?: ModelId;
  /** 各平台 API Key */
  apiKeys?: {
    siliconflow?: string;
    deepseek?: string;
    openai?: string;
  };
  // 兼容旧版配置
  primary?: {
    modelId: ModelId;
    apiKey: string;
  };
  fallback?: Array<{
    modelId: ModelId;
    apiKey: string;
  }>;
}

/**
 * 从模型 ID 获取平台
 */
export function getPlatformFromModelId(modelId: ModelId): Platform {
  if (modelId.startsWith('siliconflow/')) return 'siliconflow';
  if (modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('openai/')) return 'openai';
  return 'siliconflow'; // 默认
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取配置文件
 */
export function loadConfig(): CLIConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // 配置文件损坏，返回空配置
  }
  return {};
}

/**
 * 保存配置文件
 */
export function saveConfig(config: CLIConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * 设置默认模型
 */
export function setDefaultModel(modelId: ModelId): void {
  const config = loadConfig();
  config.defaultModel = modelId;
  saveConfig(config);
}

/**
 * 设置平台 API Key
 */
export function setApiKey(platform: Platform, apiKey: string): void {
  const config = loadConfig();
  if (!config.apiKeys) {
    config.apiKeys = {};
  }
  config.apiKeys[platform] = apiKey;
  saveConfig(config);
}

/**
 * 获取平台 API Key
 */
export function getApiKey(platform: Platform): string | undefined {
  const config = loadConfig();
  return config.apiKeys?.[platform];
}

/**
 * 获取默认模型
 */
export function getDefaultModel(): ModelId {
  const config = loadConfig();
  return config.defaultModel || config.primary?.modelId || DEFAULT_MODEL;
}

/**
 * 设置主模型配置（兼容旧版）
 */
export function setPrimaryConfig(modelId: ModelId, apiKey: string): void {
  const config = loadConfig();
  const platform = getPlatformFromModelId(modelId);

  // 同时更新新版和旧版配置
  config.defaultModel = modelId;
  if (!config.apiKeys) {
    config.apiKeys = {};
  }
  config.apiKeys[platform] = apiKey;

  // 保留旧版格式兼容
  config.primary = { modelId, apiKey };
  saveConfig(config);
}

/**
 * 添加降级模型配置
 */
export function addFallbackConfig(modelId: ModelId, apiKey: string): void {
  const config = loadConfig();
  const platform = getPlatformFromModelId(modelId);

  // 更新 API Key
  if (!config.apiKeys) {
    config.apiKeys = {};
  }
  config.apiKeys[platform] = apiKey;

  // 保留旧版格式
  if (!config.fallback) {
    config.fallback = [];
  }
  const existingIndex = config.fallback.findIndex((f) => f.modelId === modelId);
  if (existingIndex >= 0) {
    config.fallback[existingIndex] = { modelId, apiKey };
  } else {
    config.fallback.push({ modelId, apiKey });
  }
  saveConfig(config);
}

/**
 * 将 CLI 配置转换为 GeneratorConfig
 */
export function toGeneratorConfig(cliConfig: CLIConfig): GeneratorConfig | null {
  const defaultModel = cliConfig.defaultModel || cliConfig.primary?.modelId || DEFAULT_MODEL;
  const platform = getPlatformFromModelId(defaultModel);

  // 优先从新版配置获取 API Key
  let apiKey = cliConfig.apiKeys?.[platform];

  // 兼容旧版配置
  if (!apiKey && cliConfig.primary?.modelId === defaultModel) {
    apiKey = cliConfig.primary.apiKey;
  }

  if (!apiKey) {
    return null;
  }

  // 构建降级模型列表
  const fallback: Array<{ modelId: ModelId; apiKey: string }> = [];

  // 添加其他平台的模型作为降级
  const platforms: Platform[] = ['siliconflow', 'deepseek', 'openai'];
  for (const p of platforms) {
    if (p !== platform && cliConfig.apiKeys?.[p]) {
      // 为每个平台选择一个默认模型
      let fallbackModelId: ModelId;
      if (p === 'siliconflow') fallbackModelId = 'siliconflow/qwen2.5-7b';
      else if (p === 'deepseek') fallbackModelId = 'deepseek/deepseek-chat';
      else fallbackModelId = 'openai/gpt-4o';

      fallback.push({
        modelId: fallbackModelId,
        apiKey: cliConfig.apiKeys[p]!,
      });
    }
  }

  return {
    primary: { modelId: defaultModel, apiKey },
    fallback: fallback.length > 0 ? fallback : undefined,
    enableFallback: fallback.length > 0,
  };
}

/**
 * 从环境变量获取配置
 */
export function getConfigFromEnv(): GeneratorConfig | null {
  const siliconflowKey = process.env.SILICONFLOW_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 优先使用免费模型
  if (siliconflowKey) {
    const configs: Array<{ modelId: ModelId; apiKey: string }> = [
      { modelId: DEFAULT_MODEL, apiKey: siliconflowKey },
    ];

    if (deepseekKey) {
      configs.push({ modelId: 'deepseek/deepseek-chat', apiKey: deepseekKey });
    }
    if (openaiKey) {
      configs.push({ modelId: 'openai/gpt-4o', apiKey: openaiKey });
    }

    const [primary, ...fallback] = configs;
    return {
      primary: { modelId: primary.modelId, apiKey: primary.apiKey },
      fallback: fallback.map((f) => ({ modelId: f.modelId, apiKey: f.apiKey })),
      enableFallback: true,
    };
  }

  if (deepseekKey) {
    return {
      primary: { modelId: 'deepseek/deepseek-chat', apiKey: deepseekKey },
      fallback: openaiKey ? [{ modelId: 'openai/gpt-4o', apiKey: openaiKey }] : [],
      enableFallback: !!openaiKey,
    };
  }

  if (openaiKey) {
    return {
      primary: { modelId: 'openai/gpt-4o', apiKey: openaiKey },
      enableFallback: false,
    };
  }

  return null;
}

/**
 * 获取最终配置（优先级：环境变量 > 配置文件）
 */
export function getEffectiveConfig(): GeneratorConfig | null {
  const envConfig = getConfigFromEnv();
  if (envConfig) {
    return envConfig;
  }

  const fileConfig = loadConfig();
  return toGeneratorConfig(fileConfig);
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * 验证模型 ID
 */
export function validateModelId(modelId: string): ModelId | null {
  if (isValidModelId(modelId)) {
    return modelId;
  }
  return null;
}

/**
 * 获取已配置的平台列表
 */
export function getConfiguredPlatforms(): Platform[] {
  const config = loadConfig();
  const platforms: Platform[] = [];

  if (config.apiKeys?.siliconflow) platforms.push('siliconflow');
  if (config.apiKeys?.deepseek) platforms.push('deepseek');
  if (config.apiKeys?.openai) platforms.push('openai');

  return platforms;
}

/**
 * 获取平台下可用的模型列表
 */
export function getModelsForPlatform(platform: Platform): ModelId[] {
  const models: ModelId[] = [];
  for (const id of Object.keys(MODEL_REGISTRY)) {
    if (id.startsWith(`${platform}/`)) {
      models.push(id as ModelId);
    }
  }
  return models;
}
