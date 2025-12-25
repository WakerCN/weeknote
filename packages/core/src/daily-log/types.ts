/**
 * 每日记录模块类型定义
 */

/**
 * 单条每日记录
 */
export interface DailyRecord {
  /** 日期 ISO 格式 "2024-12-23" */
  date: string;
  /** 星期几 "周一" */
  dayOfWeek: string;
  /** 计划内容 */
  plan: string[];
  /** 完成结果 */
  result: string[];
  /** 遇到的问题 */
  issues: string[];
  /** 备注 */
  notes: string[];
  /** 创建时间 ISO 格式 */
  createdAt: string;
  /** 更新时间 ISO 格式 */
  updatedAt: string;
}

/**
 * 周日志文件结构
 */
export interface WeeklyLogFile {
  /** 文件版本 */
  version: 1;
  /** 年份 */
  year: number;
  /** ISO 周数 */
  week: number;
  /** 周起始日期（周一）*/
  weekStart: string;
  /** 周结束日期（周日）*/
  weekEnd: string;
  /** 按日期索引的记录 */
  days: Record<string, DailyRecord>;
  /** 文件创建时间 */
  createdAt: string;
  /** 文件更新时间 */
  updatedAt: string;
}

/**
 * 周摘要信息（用于列表展示）
 */
export interface WeekSummary {
  /** 文件名 */
  fileName: string;
  /** 年份 */
  year: number;
  /** 周数 */
  week: number;
  /** 周起始日期 */
  weekStart: string;
  /** 周结束日期 */
  weekEnd: string;
  /** 已记录天数 */
  filledDays: number;
  /** 最后更新时间 */
  lastUpdated: string;
}

/**
 * 记录统计
 */
export interface WeekStats {
  /** 周起始日期 */
  weekStart: string;
  /** 周结束日期 */
  weekEnd: string;
  /** 已记录天数 */
  filledDays: number;
  /** 工作日已记录天数 */
  weekdaysFilled: number;
  /** 总天数 */
  totalDays: number;
}

