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

/**
 * 简单的 API 配置（用于快速开始）
 * @deprecated 建议使用 generator 模块中的 GeneratorConfig
 */
export interface SimpleAPIConfig {
  /** API 密钥 */
  apiKey: string;
  /** API 基础 URL（可选） */
  baseUrl?: string;
  /** 使用的模型（可选） */
  model?: string;
  /** 生成温度参数（可选） */
  temperature?: number;
}
