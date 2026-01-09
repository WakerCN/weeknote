/**
 * AI 生成器类型定义
 */

/**
 * 模型 ID 类型
 * 格式: 平台/模型简称
 */
export type ModelId =
  // 豆包（火山方舟）
  | 'doubao/seed-1.8' // 推理模型
  | 'doubao/seed-1.6' // 推理模型
  // DeepSeek 官方
  | 'deepseek/deepseek-chat'
  | 'deepseek/deepseek-reasoner' // 推理模型
  // OpenAI
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  // 硅基流动免费模型
  | 'siliconflow/qwen2.5-7b'
  | 'siliconflow/glm-4-9b'
  | 'siliconflow/glm-z1-9b';

/**
 * 模型元信息
 */
export interface ModelMeta {
  /** 模型 ID */
  id: ModelId;
  /** 显示名称 */
  name: string;
  /** 实际 API 模型名称 */
  apiModel: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 是否免费 */
  isFree: boolean;
  /** 描述 */
  description: string;
}

/**
 * 所有支持的模型配置
 */
export const MODEL_REGISTRY: Record<ModelId, ModelMeta> = {
  // 豆包（火山方舟）- Seed 推理模型（需要思考时间）
  'doubao/seed-1.8': {
    id: 'doubao/seed-1.8',
    name: '豆包 Seed 1.8 (推理)',
    apiModel: 'doubao-seed-1.8',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    isFree: false,
    description: '推理模型，深度思考后输出，延迟较高',
  },
  'doubao/seed-1.6': {
    id: 'doubao/seed-1.6',
    name: '豆包 Seed 1.6 (推理)',
    apiModel: 'doubao-seed-1.6',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    isFree: false,
    description: '推理模型，支持分档思考长度',
  },
  // DeepSeek 官方
  'deepseek/deepseek-chat': {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    apiModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    isFree: false,
    description: 'DeepSeek 官方 API，性价比高',
  },
  'deepseek/deepseek-reasoner': {
    id: 'deepseek/deepseek-reasoner',
    name: 'DeepSeek R1 (推理)',
    apiModel: 'deepseek-reasoner',
    baseUrl: 'https://api.deepseek.com',
    isFree: false,
    description: '推理模型，深度思考后输出，效果更好',
  },
  // OpenAI
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    apiModel: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    isFree: false,
    description: 'OpenAI 最强模型，效果最好',
  },
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    apiModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    isFree: false,
    description: 'OpenAI 轻量模型，速度快',
  },
  // 硅基流动免费模型
  'siliconflow/qwen2.5-7b': {
    id: 'siliconflow/qwen2.5-7b',
    name: '通义千问 2.5 (7B)',
    apiModel: 'Qwen/Qwen2.5-7B-Instruct',
    baseUrl: 'https://api.siliconflow.cn/v1',
    isFree: true,
    description: '阿里通义千问开源模型，适合日常使用',
  },
  'siliconflow/glm-4-9b': {
    id: 'siliconflow/glm-4-9b',
    name: '智谱 GLM-4 (9B)',
    apiModel: 'THUDM/glm-4-9b-chat',
    baseUrl: 'https://api.siliconflow.cn/v1',
    isFree: true,
    description: '智谱 AI 开源模型，中文能力强',
  },
  'siliconflow/glm-z1-9b': {
    id: 'siliconflow/glm-z1-9b',
    name: '智谱 GLM-Z1 (9B)',
    apiModel: 'THUDM/GLM-Z1-9B-0414',
    baseUrl: 'https://api.siliconflow.cn/v1',
    isFree: true,
    description: '智谱 AI 最新开源模型',
  },
};

/**
 * 默认模型
 */
export const DEFAULT_MODEL: ModelId = 'siliconflow/qwen2.5-7b';

/**
 * 获取免费模型列表
 */
export function getFreeModels(): ModelMeta[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.isFree);
}

/**
 * 获取收费模型列表
 */
export function getPaidModels(): ModelMeta[] {
  return Object.values(MODEL_REGISTRY).filter((m) => !m.isFree);
}

/**
 * 获取模型元信息
 */
export function getModelMeta(modelId: ModelId): ModelMeta | undefined {
  return MODEL_REGISTRY[modelId];
}

/**
 * 检查模型 ID 是否有效
 */
export function isValidModelId(modelId: string): modelId is ModelId {
  return modelId in MODEL_REGISTRY;
}

/**
 * 思考模式类型（适用于推理模型：豆包 Seed、DeepSeek R1）
 */
export type ThinkingMode = 'enabled' | 'disabled' | 'auto';

/**
 * 检查模型是否支持推理模式
 */
export function isReasoningModel(modelId: ModelId): boolean {
  return modelId.startsWith('doubao/seed-') || modelId === 'deepseek/deepseek-reasoner';
}

/**
 * 流式生成回调选项
 */
export interface StreamCallbacks {
  /** 内容块回调 */
  onChunk: (chunk: string) => void;
  /** 思考过程回调（仅推理模型支持） */
  onThinking?: (thinking: string) => void;
}

/**
 * 模型配置
 */
export interface ModelConfig {
  /** 模型 ID */
  modelId: ModelId;
  /** API 密钥 */
  apiKey: string;
  /** 自定义 API 地址（可选，覆盖默认） */
  baseUrl?: string;
  /** 生成温度参数（可选，默认 0.3） */
  temperature?: number;
  /** 接入点 ID（火山方舟/豆包必需，格式如 ep-xxxxx） */
  endpointId?: string;
  /** 思考模式（推理模型支持：豆包 Seed、DeepSeek R1，默认 auto） */
  thinkingMode?: ThinkingMode;
}

/**
 * 生成器配置
 */
export interface GeneratorConfig {
  /** 模型配置 */
  primary: ModelConfig;
  /** 超时时间（毫秒），默认 60000 */
  timeout?: number;
}

/**
 * 生成错误类型
 */
export type GeneratorErrorType =
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

/**
 * 生成器错误
 */
export class GeneratorError extends Error {
  constructor(
    public type: GeneratorErrorType,
    message: string,
    public modelId?: ModelId,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GeneratorError';
  }
}

/**
 * 聊天消息格式
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM Provider 接口
 */
export interface LLMProvider {
  /** 模型 ID */
  modelId: ModelId;
  /** 生成回复 */
  generate(messages: ChatMessage[], config: ModelConfig): Promise<string>;
  /** 流式生成回复（支持思考过程回调） */
  generateStream(
    messages: ChatMessage[],
    config: ModelConfig,
    callbacks: StreamCallbacks | ((chunk: string) => void)
  ): Promise<string>;
}

// 兼容旧版类型
/** @deprecated 使用 ModelId */
export type ModelProvider = 'openai' | 'deepseek' | 'siliconflow';

/** @deprecated 使用 MODEL_REGISTRY */
export const PROVIDER_DEFAULTS = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', name: 'OpenAI' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', name: 'DeepSeek' },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    name: '硅基流动',
  },
};
