/**
 * 模型管理器
 * 负责模型选择、自动降级
 */

import type { ChatMessage, ModelConfig, ModelId } from './types.js';
import { GeneratorError, MODEL_REGISTRY } from './types.js';
import { createProvider } from './providers/index.js';

/**
 * 模型管理器配置
 */
export interface ModelManagerConfig {
  /** 主模型配置 */
  primary: ModelConfig;
  /** 备用模型列表 */
  fallback?: ModelConfig[];
  /** 是否启用自动降级 */
  enableFallback?: boolean;
}

/**
 * 模型管理器
 */
export class ModelManager {
  private primary: ModelConfig;
  private fallbackList: ModelConfig[];
  private enableFallback: boolean;

  constructor(config: ModelManagerConfig) {
    this.primary = config.primary;
    this.fallbackList = config.fallback || [];
    this.enableFallback = config.enableFallback ?? true;
  }

  /**
   * 生成回复（带自动降级）
   */
  async generate(messages: ChatMessage[]): Promise<{ content: string; modelId: ModelId }> {
    const configs = [this.primary, ...this.fallbackList];
    const errors: GeneratorError[] = [];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const isMain = i === 0;
      const isFallback = i > 0;

      // 如果不启用降级且不是主模型，跳过
      if (isFallback && !this.enableFallback) {
        break;
      }

      const meta = MODEL_REGISTRY[config.modelId];
      const displayName = meta?.name || config.modelId;

      try {
        console.log(
          `[ModelManager] 尝试使用 ${displayName}${isFallback ? '（降级）' : ''}`
        );
        const provider = createProvider(config.modelId);
        const content = await provider.generate(messages, config);
        console.log(`[ModelManager] ${displayName} 生成成功`);
        return { content, modelId: config.modelId };
      } catch (error) {
        if (error instanceof GeneratorError) {
          console.warn(`[ModelManager] ${displayName} 失败: ${error.message}`);
          errors.push(error);

          // 如果是认证错误，不尝试降级（是用户配置问题）
          if (isMain && error.type === 'AUTH_ERROR') {
            throw error;
          }
        } else {
          console.warn(`[ModelManager] ${displayName} 未知错误:`, error);
          errors.push(
            new GeneratorError('UNKNOWN', `${displayName} 未知错误`, config.modelId)
          );
        }
      }
    }

    // 所有模型都失败
    const lastError = errors[errors.length - 1];
    throw new GeneratorError(
      lastError?.type || 'UNKNOWN',
      `所有模型均失败，最后错误: ${lastError?.message || '未知错误'}`,
      lastError?.modelId
    );
  }

  /**
   * 流式生成回复（带自动降级）
   */
  async generateStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<{ content: string; modelId: ModelId }> {
    const configs = [this.primary, ...this.fallbackList];
    const errors: GeneratorError[] = [];

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const isMain = i === 0;
      const isFallback = i > 0;

      if (isFallback && !this.enableFallback) {
        break;
      }

      const meta = MODEL_REGISTRY[config.modelId];
      const displayName = meta?.name || config.modelId;

      try {
        console.log(
          `[ModelManager] 尝试使用 ${displayName} (流式)${isFallback ? '（降级）' : ''}`
        );
        const provider = createProvider(config.modelId);
        const content = await provider.generateStream(messages, config, onChunk);
        console.log(`[ModelManager] ${displayName} 流式生成成功`);
        return { content, modelId: config.modelId };
      } catch (error) {
        if (error instanceof GeneratorError) {
          console.warn(`[ModelManager] ${displayName} 失败: ${error.message}`);
          errors.push(error);

          if (isMain && error.type === 'AUTH_ERROR') {
            throw error;
          }
        } else {
          console.warn(`[ModelManager] ${displayName} 未知错误:`, error);
          errors.push(
            new GeneratorError('UNKNOWN', `${displayName} 未知错误`, config.modelId)
          );
        }
      }
    }

    const lastError = errors[errors.length - 1];
    throw new GeneratorError(
      lastError?.type || 'UNKNOWN',
      `所有模型均失败，最后错误: ${lastError?.message || '未知错误'}`,
      lastError?.modelId
    );
  }

  /**
   * 获取当前配置的模型列表
   */
  getModels(): { primary: ModelConfig; fallback: ModelConfig[] } {
    return {
      primary: this.primary,
      fallback: this.fallbackList,
    };
  }
}
