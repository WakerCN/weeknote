/**
 * 模型管理器
 * 负责模型调用
 */

import type { ChatMessage, ModelConfig, ModelId, StreamCallbacks, StreamOptions } from './types.js';
import { GeneratorError, MODEL_REGISTRY } from './types.js';
import { createProvider } from './providers/index.js';

/**
 * 模型管理器配置
 */
export interface ModelManagerConfig {
  /** 模型配置 */
  primary: ModelConfig;
}

/**
 * 模型管理器
 */
export class ModelManager {
  private config: ModelConfig;

  constructor(config: ModelManagerConfig) {
    this.config = config.primary;
  }

  /**
   * 生成回复
   */
  async generate(messages: ChatMessage[]): Promise<{ content: string; modelId: ModelId }> {
    const meta = MODEL_REGISTRY[this.config.modelId];
    const displayName = meta?.name || this.config.modelId;

    try {
      console.log(`[ModelManager] 尝试使用 ${displayName}`);
      const provider = createProvider(this.config.modelId);
      const content = await provider.generate(messages, this.config);
      console.log(`[ModelManager] ${displayName} 生成成功`);
      return { content, modelId: this.config.modelId };
    } catch (error) {
      if (error instanceof GeneratorError) {
        console.warn(`[ModelManager] ${displayName} 失败: ${error.message}`);
        throw error;
      }
      console.warn(`[ModelManager] ${displayName} 未知错误:`, error);
      throw new GeneratorError('UNKNOWN', `${displayName} 未知错误`, this.config.modelId);
    }
  }

  /**
   * 流式生成回复（支持思考过程回调）
   */
  async generateStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks | ((chunk: string) => void),
    options?: StreamOptions
  ): Promise<{ content: string; modelId: ModelId }> {
    const meta = MODEL_REGISTRY[this.config.modelId];
    const displayName = meta?.name || this.config.modelId;

    try {
      console.log(`[ModelManager] 尝试使用 ${displayName} (流式)`);
      const provider = createProvider(this.config.modelId);
      const content = await provider.generateStream(messages, this.config, callbacks, options);
      console.log(`[ModelManager] ${displayName} 流式生成成功`);
      return { content, modelId: this.config.modelId };
    } catch (error) {
      if (error instanceof GeneratorError) {
        console.warn(`[ModelManager] ${displayName} 失败: ${error.message}`);
        throw error;
      }
      console.warn(`[ModelManager] ${displayName} 未知错误:`, error);
      throw new GeneratorError('UNKNOWN', `${displayName} 未知错误`, this.config.modelId);
    }
  }

  /**
   * 获取当前模型配置
   */
  getModel(): ModelConfig {
    return this.config;
  }
}
