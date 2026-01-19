/**
 * API 客户端 - 统一的 HTTP 请求封装
 */

import apiClient from '../lib/api-client';
import { tokenManager } from '../lib/api-client';

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

/**
 * 响应数据提取器
 */
const extractData = (response: any) => response.data;

// ========== reminder 返回形态兼容与兜底 ==========
const DEFAULT_REMINDER_SCHEDULES: ChannelSchedules = {
  times: [
    { id: 'default-morning', hour: 10, minute: 5, enabled: true, label: '上午提醒' },
    { id: 'default-evening', hour: 20, minute: 40, enabled: true, label: '晚间提醒' },
  ],
};

const normalizeChannelSchedules = (schedules: any): ChannelSchedules => {
  const times = Array.isArray(schedules?.times) ? schedules.times : null;
  if (!times || times.length === 0) return DEFAULT_REMINDER_SCHEDULES;
  return {
    times: times.map((t: any, idx: number) => ({
      id: t?.id ?? `migrated-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      hour: typeof t?.hour === 'number' ? t.hour : 10,
      minute: typeof t?.minute === 'number' ? t.minute : 0,
      enabled: typeof t?.enabled === 'boolean' ? t.enabled : true,
      label: typeof t?.label === 'string' ? t.label : undefined,
    })),
  };
};

/**
 * 兼容后端不同返回形态的 reminder 解包器 + 最小兜底
 * - 旧：直接返回配置对象
 * - 新：{ success: true, config: {...} }
 */
const extractReminderConfig = (data: any): ReminderConfig => {
  const cfg = data?.config ?? data;
  const dingtalk = cfg?.channels?.dingtalk ?? {};
  const serverChan = cfg?.channels?.serverChan ?? {};

  return {
    enabled: cfg?.enabled ?? false,
    channels: {
      dingtalk: {
        enabled: dingtalk?.enabled ?? false,
        webhook: dingtalk?.webhook ?? '',
        secret: dingtalk?.secret ?? '',
        schedules: normalizeChannelSchedules(dingtalk?.schedules),
      },
      serverChan: {
        enabled: serverChan?.enabled ?? false,
        sendKey: serverChan?.sendKey ?? '',
        schedules: normalizeChannelSchedules(serverChan?.schedules),
      },
    },
    updatedAt: cfg?.updatedAt ?? '',
    sendKey: cfg?.sendKey,
  };
};

/**
 * 兼容后端不同返回形态的 config 解包器
 * - 旧：直接返回配置对象
 * - 新：{ success: true, config: {...} }
 */
const extractConfig = (data: any): AppConfig => {
  const cfg = data?.config ?? data;
  // 最小兜底，避免页面在字段缺失时报错
  return {
    defaultModel: cfg?.defaultModel ?? null,
    apiKeys: (cfg?.apiKeys ?? {
      siliconflow: null,
      deepseek: null,
      openai: null,
      doubao: null,
    }) as Record<Platform, string | null>,
    doubaoEndpoint: cfg?.doubaoEndpoint ?? null,
  };
};

/**
 * 获取健康状态
 */
export const getHealth = () =>
  apiClient.get('/health').then(extractData);

/**
 * 获取可用模型列表
 */
export const getModels = () => 
  apiClient.get('/models').then(extractData);

/**
 * 获取配置
 */
export const getConfig = () => 
  apiClient.get('/config').then(extractData).then(extractConfig);

/**
 * 保存配置
 */
export const saveConfig = (params: SaveConfigParams) =>
  apiClient.put('/config', params).then(extractData).then(extractConfig);

/**
 * 删除 API Key
 */
export const deleteApiKey = (platform: Platform) =>
  apiClient.delete(`/config/api-key/${platform}`).then(extractData);

/**
 * 生成周报（非流式）
 */
export const generateReport = (startDate: string, endDate: string, modelId?: string) =>
  apiClient.post('/generate', { startDate, endDate, modelId }).then(extractData);

// 流式生成结果
export interface GenerateStreamResult {
  model: { id: string; name: string };
  warnings?: ValidationWarning[];
}

/**
 * 思考模式类型（适用于推理模型：豆包 Seed、DeepSeek R1）
 */
export type ThinkingMode = 'enabled' | 'disabled' | 'auto';

/**
 * 流式生成回调
 */
export interface StreamCallbacks {
  /** 内容块回调 */
  onChunk: (chunk: string) => void;
  /** 思考过程回调（仅推理模型支持） */
  onThinking?: (thinking: string) => void;
}

/**
 * 流式生成选项
 */
export interface GenerateStreamOptions {
  dailyLog: string;
  callbacks: StreamCallbacks;
  signal?: AbortSignal;
  modelId?: string;
  /** 思考模式（推理模型支持：豆包 Seed、DeepSeek R1） */
  thinkingMode?: ThinkingMode;
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
): Promise<GenerateStreamResult>;

/**
 * 流式生成周报（支持思考过程回调）
 * @param options 生成选项
 * @returns 最终结果（包含模型信息和可能的警告）
 */
export async function generateReportStream(
  options: GenerateStreamOptions
): Promise<GenerateStreamResult>;

// 实现
export async function generateReportStream(
  dailyLogOrOptions: string | GenerateStreamOptions,
  onChunk?: (chunk: string) => void,
  signal?: AbortSignal,
  modelId?: string
): Promise<GenerateStreamResult> {
  // 解析参数
  let dailyLog: string;
  let callbacks: StreamCallbacks;
  let abortSignal: AbortSignal | undefined;
  let selectedModelId: string | undefined;
  let thinkingMode: ThinkingMode | undefined;

  if (typeof dailyLogOrOptions === 'string') {
    // 旧的调用方式
    dailyLog = dailyLogOrOptions;
    callbacks = { onChunk: onChunk! };
    abortSignal = signal;
    selectedModelId = modelId;
  } else {
    // 新的调用方式
    dailyLog = dailyLogOrOptions.dailyLog;
    callbacks = dailyLogOrOptions.callbacks;
    abortSignal = dailyLogOrOptions.signal;
    selectedModelId = dailyLogOrOptions.modelId;
    thinkingMode = dailyLogOrOptions.thinkingMode;
  }

  // 获取 Token
  const token = tokenManager.getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/generate/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      dailyLog, 
      modelId: selectedModelId,
      ...(thinkingMode ? { thinkingMode } : {}),
    }),
    signal: abortSignal,
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

          // 处理思考内容
          if (data.thinking && callbacks.onThinking) {
            callbacks.onThinking(data.thinking);
          }

          // 处理正常内容
          if (data.chunk) {
            callbacks.onChunk(data.chunk);
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
export const getPrompts = () => 
  apiClient.get('/prompt-template').then(extractData);

/**
 * 创建新模板
 */
export const createPrompt = (params: SavePromptParams) =>
  apiClient.post('/prompt-template', params).then(extractData);

/**
 * 更新模板
 */
export const updatePrompt = (id: string, params: Partial<SavePromptParams>) =>
  apiClient.put(`/prompt-template/${id}`, params).then(extractData);

/**
 * 删除模板
 */
export const deletePrompt = (id: string) =>
  apiClient.delete(`/prompt-template/${id}`).then(extractData);

/**
 * 激活模板
 */
export const activatePrompt = (id: string) =>
  apiClient.post(`/prompt-template/${id}/activate`).then(extractData);

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

// 月份摘要响应类型
export interface MonthSummary {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  days: Record<string, { hasContent: boolean }>;
}

// 导出结果类型
export interface ExportResult {
  text: string;
  startDate: string;
  endDate: string;
  filledDays: number;
}

// 日期范围统计类型
export interface RangeStats {
  startDate: string;
  endDate: string;
  totalDays: number;
  filledDays: number;
}

/**
 * 获取所有周文件列表
 * @deprecated 使用 getMonthSummary 替代
 */
export const getWeekSummaries = () =>
  apiClient.get('/daily-logs/weeks').then(extractData);

/**
 * 获取某周的所有记录（云端 API 使用日期范围）
 * @deprecated 使用 getDateRange 替代
 */
export const getWeek = (date?: string) => {
  return apiClient.get('/daily-logs/week', {
    params: date ? { date } : {},
  }).then(extractData);
};

/**
 * 获取某天的记录
 */
export const getDay = (date: string) =>
  apiClient.get(`/daily-logs/day/${date}`).then((res) => res.data?.record || null);

/**
 * 保存某天的记录
 */
export const saveDay = (date: string, params: SaveDayRecordParams) =>
  apiClient.post(`/daily-logs/day/${date}`, params).then((res) => res.data?.record || null);

/**
 * 导出为文本格式（按周，兼容旧接口）
 * @deprecated 使用 exportRange 替代
 */
export const exportWeek = (date?: string) =>
  apiClient.get('/daily-logs/export', {
    params: date ? { date } : {},
  }).then(extractData);

/**
 * 按日期范围导出为文本格式
 */
export const exportRange = (startDate: string, endDate: string): Promise<ExportResult> =>
  apiClient.get('/daily-logs/export', {
    params: { startDate, endDate },
  }).then(extractData);

/**
 * 获取月份记录摘要（用于日历显示）
 */
export const getMonthSummary = (year: number, month: number): Promise<MonthSummary> =>
  apiClient.get('/daily-logs/month-summary', {
    params: { year, month },
  }).then(extractData);

/**
 * 获取记录统计（按周，兼容旧接口）
 * @deprecated 使用 getDateRange 获取范围内的统计信息
 */
export const getWeekStats = (date?: string) =>
  apiClient.get('/daily-logs/stats', {
    params: date ? { date } : {},
  }).then(extractData);

/**
 * 获取指定日期范围的记录
 */
export const getDateRange = (startDate: string, endDate: string) =>
  apiClient.get('/daily-logs/range', {
    params: { startDate, endDate },
  }).then(extractData);

/**
 * 在资源管理器中打开文件位置
 */
export const openInExplorer = (date: string) =>
  apiClient.post('/daily-logs/open-in-explorer', { date }).then(extractData);

/**
 * 删除某周的记录
 */
export const deleteWeek = (fileName: string) =>
  apiClient.delete('/daily-logs/week', {
    params: { fileName },
  }).then(extractData);

// ========== 提醒功能 API ==========

// 单个提醒时间点
export interface ScheduleTime {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
  label?: string;
}

// 渠道提醒时间配置
export interface ChannelSchedules {
  times: ScheduleTime[];
}

// 钉钉机器人配置
export interface DingtalkConfig {
  enabled: boolean;
  webhook: string;
  secret?: string;
  schedules: ChannelSchedules;
}

// Server酱配置
export interface ServerChanConfig {
  enabled: boolean;
  sendKey: string;
  schedules: ChannelSchedules;
}

// 推送渠道配置
export interface ChannelsConfig {
  dingtalk: DingtalkConfig;
  serverChan: ServerChanConfig;
}

// 提醒配置
export interface ReminderConfig {
  enabled: boolean;
  channels: ChannelsConfig;
  updatedAt: string;
  /** @deprecated 使用 channels.serverChan.sendKey */
  sendKey?: string;
}

// 保存提醒配置参数
export interface SaveReminderParams {
  enabled?: boolean;
  channels?: {
    dingtalk?: Partial<DingtalkConfig>;
    serverChan?: Partial<ServerChanConfig>;
  };
}

/**
 * 获取提醒配置
 */
export const getReminder = () => 
  apiClient
    .get('/reminder')
    .then(extractData)
    .then(extractReminderConfig);

/**
 * 保存提醒配置
 */
export const saveReminder = (params: SaveReminderParams) =>
  apiClient
    .put('/reminder', params)
    .then(extractData)
    .then(extractReminderConfig);

/**
 * 测试 Server酱 推送
 */
export const testServerChan = (sendKey: string) =>
  apiClient
    .post('/reminder/test/server-chan', { sendKey })
    .then(extractData);

/**
 * 测试钉钉机器人推送
 */
export const testDingtalk = (webhook: string, secret?: string) =>
  apiClient
    .post('/reminder/test/dingtalk', { webhook, secret })
    .then(extractData);

/**
 * 测试推送（兼容旧接口）
 * @deprecated 使用 testServerChan 或 testDingtalk
 */
export const testReminder = (sendKey: string) =>
  apiClient.post('/reminder/test', { sendKey }).then(extractData);

export default apiClient;

