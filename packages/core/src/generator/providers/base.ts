/**
 * LLM Provider 基础类
 * 基于 OpenAI SDK 的通用实现，适用于所有兼容 OpenAI API 格式的模型
 */

import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { RequestInit } from 'node-fetch';
import nodeFetch from 'node-fetch';
import type { ChatMessage, LLMProvider, ModelConfig, ModelId, StreamCallbacks, StreamOptions } from '../types.js';
import { GeneratorError, MODEL_REGISTRY } from '../types.js';

/**
 * 获取代理 URL
 */
function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
}

/**
 * 创建带代理的 fetch 函数
 */
function createProxyFetch() {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    return undefined;
  }
  
  const agent = new HttpsProxyAgent(proxyUrl);
  
  return async (url: string, init?: RequestInit) => {
    return nodeFetch(url, {
      ...init,
      agent,
    } as RequestInit);
  };
}

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
    const proxyFetch = createProxyFetch();
    
    const options: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: config.apiKey,
      baseURL: config.baseUrl || meta.baseUrl,
      timeout: 60000,
    };
    
    // 如果有代理，使用自定义 fetch
    if (proxyFetch) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options.fetch = proxyFetch as any;
    }
    
    return new OpenAI(options);
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
   * 获取实际的模型名称（豆包使用接入点 ID）
   */
  protected getActualModel(config: ModelConfig): string {
    const meta = this.getModelMeta();
    
    // 豆包（火山方舟）需要使用接入点 ID
    if (this.modelId.startsWith('doubao/')) {
      if (!config.endpointId) {
        throw new GeneratorError(
          'AUTH_ERROR',
          '豆包模型需要配置接入点 ID（Endpoint ID），请在火山方舟控制台创建推理接入点后配置',
          this.modelId
        );
      }
      return config.endpointId;
    }
    
    return meta.apiModel;
  }

  /**
   * 生成回复
   */
  async generate(messages: ChatMessage[], config: ModelConfig): Promise<string> {
    const client = this.createClient(config);
    const meta = this.getModelMeta();
    const actualModel = this.getActualModel(config);

    try {
      const response = await client.chat.completions.create({
        model: actualModel,
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
   * 流式生成回复（支持思考过程回调）
   */
  async generateStream(
    messages: ChatMessage[],
    config: ModelConfig,
    callbacks: StreamCallbacks | ((chunk: string) => void),
    options?: StreamOptions
  ): Promise<string> {
    const client = this.createClient(config);
    const meta = this.getModelMeta();
    const actualModel = this.getActualModel(config);
    const signal = options?.signal;

    // 兼容旧的函数回调方式
    const { onChunk, onThinking } = typeof callbacks === 'function' 
      ? { onChunk: callbacks, onThinking: undefined }
      : callbacks;

    try {
      // 在开始前检查是否已中止
      if (signal?.aborted) {
        throw new GeneratorError('UNKNOWN', '请求已取消', this.modelId);
      }

      // 构建额外的请求参数
      // 注意：豆包 Seed 需要 thinking 参数来控制思考模式，只支持 enabled 和 disabled
      // DeepSeek R1 不需要额外参数，会自动返回 reasoning_content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extraParams: Record<string, any> = {};
      if (this.modelId.startsWith('doubao/seed-') && config.thinkingMode && config.thinkingMode !== 'auto') {
        extraParams.thinking = {
          type: config.thinkingMode,
        };
      }

      const stream = await client.chat.completions.create({
        model: actualModel,
        messages,
        temperature: config.temperature ?? 0.3,
        stream: true,
        ...extraParams,
      });

      let fullContent = '';
      let fullThinking = '';

      for await (const chunk of stream) {
        // 在每个 chunk 处理前检查是否已中止
        if (signal?.aborted) {
          console.log(`[Provider] 流式生成被中止: ${this.modelId}`);
          // 尝试中止底层流
          if ('controller' in stream && typeof (stream as any).controller?.abort === 'function') {
            (stream as any).controller.abort();
          }
          throw new GeneratorError('UNKNOWN', '请求已取消', this.modelId);
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // 处理思考内容（豆包 Seed 和 DeepSeek R1 都通过 reasoning_content 返回）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reasoningContent = (delta as any).reasoning_content;
        if (reasoningContent && onThinking) {
          fullThinking += reasoningContent;
          onThinking(reasoningContent);
        }

        // 处理正常回复内容
        const content = delta.content || '';
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
