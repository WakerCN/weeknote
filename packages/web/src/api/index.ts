/**
 * API 客户端 - 统一的 HTTP 请求封装
 */

import axios from 'axios';

// 模型信息类型
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isFree: boolean;
}

// 平台类型
export type Platform = 'siliconflow' | 'deepseek' | 'openai';

// 配置类型
export interface AppConfig {
  defaultModel: string | null;
  apiKeys: Record<Platform, boolean>; // 是否已配置
}

// 保存配置的参数
export interface SaveConfigParams {
  defaultModel?: string;
  apiKeys?: Partial<Record<Platform, string>>;
}

// 生成结果
export interface GenerateResult {
  report: string;
  model: { id: string; name: string };
}

// Prompt 模板类型
export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
  createdAt: string;
  updatedAt: string;
}

// Prompts 配置响应
export interface PromptsResponse {
  activeTemplateId: string;
  templates: PromptTemplate[];
  defaults: {
    systemPrompt: string;
    userPromptTemplate: string;
  };
}

// 创建/更新模板参数
export interface SavePromptParams {
  name: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

/**
 * 获取健康状态
 */
export const getHealth = () =>
  api.get<unknown, { status: string; configured: boolean; model: string | null }>('/health');

/**
 * 获取可用模型列表
 */
export const getModels = () => api.get<unknown, { models: ModelInfo[] }>('/models');

/**
 * 获取配置
 */
export const getConfig = () => api.get<unknown, AppConfig>('/config');

/**
 * 保存配置
 */
export const saveConfig = (params: SaveConfigParams) =>
  api.post<unknown, { success: boolean }>('/config', params);

/**
 * 生成周报（非流式）
 */
export const generateReport = (dailyLog: string, modelId?: string) =>
  api.post<unknown, GenerateResult>('/generate', { dailyLog, modelId });

/**
 * 流式生成周报
 * @param dailyLog 日志内容
 * @param onChunk 每个 chunk 的回调
 * @param signal AbortController signal
 * @param modelId 可选的模型 ID
 * @returns 最终结果
 */
export async function generateReportStream(
  dailyLog: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  modelId?: string
): Promise<{ model: { id: string; name: string } }> {
  const response = await fetch('/api/generate/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dailyLog, modelId }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || '生成失败');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let result: { model: { id: string; name: string } } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 处理 SSE 数据
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if (data.chunk) {
            onChunk(data.chunk);
          }

          if (data.done) {
            result = { model: data.model };
          }

          if (data.error) {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  if (!result) {
    throw new Error('未收到完成信号');
  }

  return result;
}

// ========== Prompt 模板 API ==========

/**
 * 获取所有 Prompt 模板
 */
export const getPrompts = () => api.get<unknown, PromptsResponse>('/prompts');

/**
 * 创建新模板
 */
export const createPrompt = (params: SavePromptParams) =>
  api.post<unknown, { success: boolean; template: PromptTemplate }>('/prompts', params);

/**
 * 更新模板
 */
export const updatePrompt = (id: string, params: Partial<SavePromptParams>) =>
  api.put<unknown, { success: boolean; template: PromptTemplate }>(`/prompts/${id}`, params);

/**
 * 删除模板
 */
export const deletePrompt = (id: string) =>
  api.delete<unknown, { success: boolean }>(`/prompts/${id}`);

/**
 * 激活模板
 */
export const activatePrompt = (id: string) =>
  api.post<unknown, { success: boolean }>(`/prompts/${id}/activate`);

export default api;

