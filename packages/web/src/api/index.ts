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
export type Platform = 'siliconflow' | 'deepseek' | 'openai' | 'doubao';

// 配置类型
export interface AppConfig {
  defaultModel: string | null;
  apiKeys: Record<Platform, string | null>; // 脱敏的 API Key 或 null（未配置）
  doubaoEndpoint?: string | null; // 豆包接入点 ID
}

// 保存配置的参数
export interface SaveConfigParams {
  defaultModel?: string;
  apiKeys?: Partial<Record<Platform, string>>;
  doubaoEndpoint?: string; // 豆包接入点 ID
}

// 校验警告类型
export type ValidationWarningType = 'no_date_line' | 'no_sections';

export interface ValidationWarning {
  type: ValidationWarningType;
  message: string;
  suggestion: string;
}

// 生成结果
export interface GenerateResult {
  report: string;
  model: { id: string; name: string };
  warnings?: ValidationWarning[];
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
 * 删除 API Key
 */
export const deleteApiKey = (platform: Platform) =>
  api.delete<unknown, { success: boolean }>(`/config/apikey/${platform}`);

/**
 * 生成周报（非流式）
 */
export const generateReport = (dailyLog: string, modelId?: string) =>
  api.post<unknown, GenerateResult>('/generate', { dailyLog, modelId });

// 流式生成结果
export interface GenerateStreamResult {
  model: { id: string; name: string };
  warnings?: ValidationWarning[];
}

/**
 * 流式生成周报
 * @param dailyLog 日志内容
 * @param onChunk 每个 chunk 的回调
 * @param signal AbortController signal
 * @param modelId 可选的模型 ID
 * @returns 最终结果（包含模型信息和可能的警告）
 */
export async function generateReportStream(
  dailyLog: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  modelId?: string
): Promise<GenerateStreamResult> {
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
  let result: GenerateStreamResult | null = null;

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
            result = {
              model: data.model,
              warnings: data.warnings,
            };
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

// ========== 每日记录 API ==========

// 每日记录类型
export interface DailyRecord {
  date: string;
  dayOfWeek: string;
  plan: string;
  result: string;
  issues: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyLogFile {
  version: 1;
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  days: Record<string, DailyRecord>;
  createdAt: string;
  updatedAt: string;
}

export interface WeekSummary {
  fileName: string;
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  filledDays: number;
  lastUpdated: string;
}

export interface WeekStats {
  weekStart: string;
  weekEnd: string;
  filledDays: number;
  weekdaysFilled: number;
  totalDays: number;
}

export interface SaveDayRecordParams {
  plan: string;
  result: string;
  issues: string;
  notes: string;
}

/**
 * 获取所有周文件列表
 */
export const getWeekSummaries = () =>
  api.get<unknown, { weeks: WeekSummary[] }>('/daily-logs/weeks');

/**
 * 获取某周的所有记录
 */
export const getWeek = (date?: string) =>
  api.get<unknown, WeeklyLogFile>('/daily-logs/week', {
    params: date ? { date } : {},
  });

/**
 * 获取某天的记录
 */
export const getDay = (date: string) =>
  api.get<unknown, DailyRecord | null>(`/daily-logs/day/${date}`);

/**
 * 保存某天的记录
 */
export const saveDay = (date: string, params: SaveDayRecordParams) =>
  api.post<unknown, { success: boolean; record: DailyRecord }>(`/daily-logs/day/${date}`, params);

/**
 * 导出为文本格式
 */
export const exportWeek = (date?: string) =>
  api.get<unknown, { text: string }>('/daily-logs/export', {
    params: date ? { date } : {},
  });

/**
 * 获取记录统计
 */
export const getWeekStats = (date?: string) =>
  api.get<unknown, WeekStats>('/daily-logs/stats', {
    params: date ? { date } : {},
  });

/**
 * 在资源管理器中打开文件位置
 */
export const openInExplorer = (date: string) =>
  api.post<unknown, { success: boolean; opened: string }>('/daily-logs/open-in-explorer', { date });

/**
 * 删除某周的记录
 */
export const deleteWeek = (fileName: string) =>
  api.delete<unknown, { success: boolean; message: string }>('/daily-logs/week', {
    params: { fileName },
  });

// ========== 提醒功能 API ==========

// 提醒时间配置
export interface ScheduleConfig {
  hour: number;
  minute: number;
  enabled: boolean;
}

// 提醒配置
export interface ReminderConfig {
  enabled: boolean;
  sendKey: string;
  schedules: {
    morning: ScheduleConfig;
    evening: ScheduleConfig;
  };
  updatedAt: string;
  scheduler: {
    running: boolean;
  };
  holidayData: {
    year: number;
    source: string;
    updatedAt: string;
    holidaysCount: number;
    workdaysCount: number;
  } | null;
  availableYears: number[];
}

// 保存提醒配置参数
export interface SaveReminderParams {
  enabled?: boolean;
  sendKey?: string;
  schedules?: {
    morning?: Partial<ScheduleConfig>;
    evening?: Partial<ScheduleConfig>;
  };
}

/**
 * 获取提醒配置
 */
export const getReminder = () => api.get<unknown, ReminderConfig>('/reminder');

/**
 * 保存提醒配置
 */
export const saveReminder = (params: SaveReminderParams) =>
  api.put<unknown, { success: boolean; config: ReminderConfig }>('/reminder', params);

/**
 * 测试推送
 */
export const testReminder = (sendKey: string) =>
  api.post<unknown, { success: boolean; error?: string }>('/reminder/test', { sendKey });

export default api;

