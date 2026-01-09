/**
 * AI 周报生成模块
 * 支持多模型和自动降级
 */

// 类型导出
export type {
  ModelId,
  ModelMeta,
  ModelConfig,
  GeneratorConfig,
  GeneratorErrorType,
  ChatMessage,
  LLMProvider,
  ThinkingMode,
  StreamCallbacks,
} from './types.js';

export {
  GeneratorError,
  MODEL_REGISTRY,
  DEFAULT_MODEL,
  getFreeModels,
  getPaidModels,
  getModelMeta,
  isValidModelId,
  isReasoningModel,
  // 兼容旧版
  PROVIDER_DEFAULTS,
} from './types.js';

// Provider 导出
export { OpenAICompatibleProvider, createProvider } from './providers/index.js';

// 模型管理器导出
export { ModelManager } from './model-manager.js';

// 生成器核心导出
export type { GenerateResult, GenerateOptions } from './generator.js';
export { generateReport, generateReportStream } from './generator.js';
