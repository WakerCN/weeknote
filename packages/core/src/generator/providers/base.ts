/**
 * LLM Provider 基础类
 * 基于 OpenAI SDK 的通用实现，适用于所有兼容 OpenAI API 格式的模型
 */

import OpenAI from 'openai';
import type { ChatMessage, LLMProvider, ModelConfig, ModelId } from '../types.js';
import { GeneratorError, MODEL_REGISTRY } from '../types.js';

/**
 * 基于 OpenAI SDK 的通用 Provider
 */
export class OpenAICompatibleProvider implements LLMProvider {
  public modelId: ModelId;

  constructor(modelId: ModelId) {
    this.modelId = modelId;
  }

  /**
   * 获取模型元信息
   */
  protected getModelMeta() {
    const meta = MODEL_REGISTRY[this.modelId];
    if (!meta) {
      throw new GeneratorError('UNKNOWN', `未知的模型: ${this.modelId}`, this.modelId);
    }
    return meta;
  }

  /**
   * 创建 OpenAI 客户端实例
   */
  protected createClient(config: ModelConfig): OpenAI {
    const meta = this.getModelMeta();
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || meta.baseUrl,
      timeout: 60000,
    });
  }

  /**
   * 处理 API 错误
   */
  protected handleError(error: unknown): never {
    const meta = this.getModelMeta();

    if (error instanceof OpenAI.APIError) {
      const status = error.status;

      if (status === 401) {
        throw new GeneratorError(
          'AUTH_ERROR',
          `${meta.name} API Key 无效或已过期`,
          this.modelId,
          error
        );
      }

      if (status === 429) {
        throw new GeneratorError(
          'RATE_LIMIT',
          `${meta.name} 请求过于频繁，请稍后重试`,
          this.modelId,
          error
        );
      }

      if (
        status === 402 ||
        error.message?.includes('quota') ||
        error.message?.includes('balance')
      ) {
        throw new GeneratorError(
          'QUOTA_EXCEEDED',
          `${meta.name} 账户余额不足`,
          this.modelId,
          error
        );
      }

      throw new GeneratorError(
        'UNKNOWN',
        `${meta.name} API 错误: ${error.message}`,
        this.modelId,
        error
      );
    }

    if (error instanceof Error) {
      if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        throw new GeneratorError('TIMEOUT', `${meta.name} 请求超时`, this.modelId, error);
      }

      if (
        error.message?.includes('network') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('fetch')
      ) {
        throw new GeneratorError(
          'NETWORK_ERROR',
          `${meta.name} 网络连接失败`,
          this.modelId,
          error
        );
      }

      throw new GeneratorError(
        'UNKNOWN',
        `${meta.name} 错误: ${error.message}`,
        this.modelId,
        error
      );
    }

    throw new GeneratorError('UNKNOWN', `${meta.name} 未知错误`, this.modelId);
  }

  /**
   * 生成回复
   */
  async generate(messages: ChatMessage[], config: ModelConfig): Promise<string> {
    const client = this.createClient(config);
    const meta = this.getModelMeta();

    try {
      const response = await client.chat.completions.create({
        model: meta.apiModel,
        messages,
        temperature: config.temperature ?? 0.3,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new GeneratorError('INVALID_RESPONSE', `${meta.name} 返回内容为空`, this.modelId);
      }

      return content;
    } catch (error) {
      if (error instanceof GeneratorError) {
        throw error;
      }
      this.handleError(error);
    }
  }

  /**
   * 流式生成回复
   */
  async generateStream(
    messages: ChatMessage[],
    config: ModelConfig,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const client = this.createClient(config);
    const meta = this.getModelMeta();

    try {
      const stream = await client.chat.completions.create({
        model: meta.apiModel,
        messages,
        temperature: config.temperature ?? 0.3,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }

      if (!fullContent) {
        throw new GeneratorError('INVALID_RESPONSE', `${meta.name} 返回内容为空`, this.modelId);
      }

      return fullContent;
    } catch (error) {
      if (error instanceof GeneratorError) {
        throw error;
      }
      this.handleError(error);
    }
  }
}

/**
 * 创建 Provider 实例
 */
export function createProvider(modelId: ModelId): LLMProvider {
  return new OpenAICompatibleProvider(modelId);
}
