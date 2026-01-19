/**
 * 周报优化器类型定义
 */

/**
 * 单日日志条目
 */
export interface DailyLogEntry {
  /** 日期字符串，如 "12-15" */
  date: string;
  /** 星期几，如 "周一" */
  dayOfWeek: string;
  /** 当日计划任务 */
  plan: string[];
  /** 完成的结果 */
  result: string[];
  /** 遇到的问题 */
  issues: string[];
  /** 备注信息（在周报生成时权重较低） */
  notes: string[];
  /** 原始内容 */
  rawContent: string;
}

/**
 * 解析后的周日志，包含所有每日条目
 */
export interface WeeklyLog {
  /** 每日日志条目数组 */
  entries: DailyLogEntry[];
  /** 本周开始日期 */
  startDate: string;
  /** 本周结束日期 */
  endDate: string;
}

/**
 * 生成的周报结构
 */
export interface WeeklyReport {
  /** 本周工作总结 */
  summary: string[];
  /** 本周输出成果 */
  deliverables: string[];
  /** 问题与风险 */
  issuesAndRisks: Array<{
    title: string;
    impact?: string;
    action?: string;
  }>;
  /** 下周工作计划 */
  nextWeekPlan: string[];
  /** 原始 Markdown 输出 */
  rawMarkdown: string;
}

// ========== 共享 API 类型 ==========

/**
 * 平台类型
 */
export type Platform = 'siliconflow' | 'deepseek' | 'openai' | 'doubao';

/**
 * 每日记录 DTO（前后端共享）
 */
export interface DailyRecordDTO {
  date: string;
  dayOfWeek: string;
  plan: string;
  result: string;
  issues: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 保存每日记录参数
 */
export interface SaveDayRecordParams {
  plan: string;
  result: string;
  issues: string;
  notes: string;
}

/**
 * 月份摘要（用于日历显示）
 */
export interface MonthSummary {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  days: Record<string, { hasContent: boolean }>;
}

/**
 * 导出结果
 */
export interface ExportResult {
  text: string;
  startDate: string;
  endDate: string;
  filledDays: number;
}

/**
 * 日期范围统计
 */
export interface RangeStats {
  startDate: string;
  endDate: string;
  totalDays: number;
  filledDays: number;
}

// ValidationWarning 和 ValidationWarningType 从 parser 模块导出，避免重复定义
// import { ValidationWarning, ValidationWarningType } from '../parser/index.js';

/**
 * 生成结果
 */
export interface GenerateResultDTO {
  report: string;
  model: { id: string; name: string };
  // 警告类型使用 parser 模块中定义的 ValidationWarning
  warnings?: Array<{
    type: string;
    message: string;
    suggestion: string;
  }>;
}
