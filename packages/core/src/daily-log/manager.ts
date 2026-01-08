/**
 * 每日记录存储管理器
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { DailyRecord, WeeklyLogFile, WeekSummary, WeekStats } from './types.js';
import {
  getWeekFileName,
  getWeekStart,
  getWeekEnd,
  getWeekInfo,
  getWeekDates,
} from './date-utils.js';

/**
 * 每日日志存储目录
 */
export const DAILY_LOG_DIR = path.join(os.homedir(), '.weeknote', 'dailyLog');

/**
 * 确保目录存在
 */
async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(DAILY_LOG_DIR, { recursive: true });
  } catch (error) {
    // 忽略已存在的错误
  }
}

/**
 * 读取周文件
 */
async function readWeekFile(filePath: string): Promise<WeeklyLogFile | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as WeeklyLogFile;
  } catch {
    return null;
  }
}

/**
 * 写入周文件
 */
async function writeWeekFile(filePath: string, data: WeeklyLogFile): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 获取周文件路径
 */
function getWeekFilePath(fileName: string): string {
  return path.join(DAILY_LOG_DIR, fileName);
}

/**
 * 每日记录管理器
 */
export class DailyLogManager {
  /**
   * 保存单日记录
   */
  async saveDay(record: Omit<DailyRecord, 'createdAt' | 'updatedAt'>): Promise<void> {
    const date = new Date(record.date);
    const fileName = getWeekFileName(date);
    const filePath = getWeekFilePath(fileName);

    // 读取或创建周文件
    let weekFile = await readWeekFile(filePath);
    if (!weekFile) {
      const { year, week } = getWeekInfo(date);
      const weekStart = getWeekStart(date);
      const weekEnd = getWeekEnd(weekStart);

      weekFile = {
        version: 1,
        year,
        week,
        weekStart,
        weekEnd,
        days: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const now = new Date().toISOString();
    const existing = weekFile.days[record.date];

    weekFile.days[record.date] = {
      ...record,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    weekFile.updatedAt = now;

    await writeWeekFile(filePath, weekFile);
  }

  /**
   * 获取单日记录
   */
  async getDay(date: string): Promise<DailyRecord | null> {
    const fileName = getWeekFileName(date);
    const filePath = getWeekFilePath(fileName);
    const weekFile = await readWeekFile(filePath);
    const record = weekFile?.days[date];
    if (!record) return null;
    
    // 确保字段类型正确（防止历史数据格式错误）
    return {
      ...record,
      plan: typeof record.plan === 'string' ? record.plan : '',
      result: typeof record.result === 'string' ? record.result : '',
      issues: typeof record.issues === 'string' ? record.issues : '',
      notes: typeof record.notes === 'string' ? record.notes : '',
    };
  }

  /**
   * 获取整周记录
   */
  async getWeek(date: string | Date): Promise<WeeklyLogFile | null> {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const fileName = getWeekFileName(dateStr);
    const filePath = getWeekFilePath(fileName);
    const weekFile = await readWeekFile(filePath);
    
    if (!weekFile) return null;
    
    // 确保所有天的字段类型正确（防止历史数据格式错误）
    const sanitizedDays: Record<string, DailyRecord> = {};
    for (const [dayKey, record] of Object.entries(weekFile.days)) {
      sanitizedDays[dayKey] = {
        ...record,
        plan: typeof record.plan === 'string' ? record.plan : '',
        result: typeof record.result === 'string' ? record.result : '',
        issues: typeof record.issues === 'string' ? record.issues : '',
        notes: typeof record.notes === 'string' ? record.notes : '',
      };
    }
    
    return {
      ...weekFile,
      days: sanitizedDays,
    };
  }

  /**
   * 列出所有周文件
   */
  async listWeeks(): Promise<string[]> {
    try {
      await ensureDir();
      const files = await fs.readdir(DAILY_LOG_DIR);
      return files
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse(); // 最新的在前
    } catch {
      return [];
    }
  }

  /**
   * 获取周摘要列表
   */
  async getWeekSummaries(): Promise<WeekSummary[]> {
    const files = await this.listWeeks();
    const summaries: WeekSummary[] = [];

    for (const fileName of files) {
      const filePath = getWeekFilePath(fileName);
      const weekFile = await readWeekFile(filePath);

      if (weekFile) {
        const filledDays = Object.values(weekFile.days).filter(
          (day) =>
            day.plan.trim() ||
            day.result.trim() ||
            day.issues.trim() ||
            day.notes.trim()
        ).length;

        summaries.push({
          fileName,
          year: weekFile.year,
          week: weekFile.week,
          weekStart: weekFile.weekStart,
          weekEnd: weekFile.weekEnd,
          filledDays,
          lastUpdated: weekFile.updatedAt,
        });
      }
    }

    return summaries;
  }

  /**
   * 导出为系统期望的 Daily Log 格式
   */
  async exportAsText(date: string | Date): Promise<string> {
    const weekFile = await this.getWeek(date);
    if (!weekFile) return '';

    const lines: string[] = [];
    const sortedDates = Object.keys(weekFile.days).sort();

    for (const dateKey of sortedDates) {
      const day = weekFile.days[dateKey];
      // 格式化日期：2024-12-23 | 周一
      lines.push(`${dateKey} | ${day.dayOfWeek}`);

      lines.push('Plan');
      if (day.plan.trim()) {
        lines.push(day.plan.trim());
      }
      lines.push('');

      lines.push('Result');
      if (day.result.trim()) {
        lines.push(day.result.trim());
      }
      lines.push('');

      lines.push('Issues');
      if (day.issues.trim()) {
        lines.push(day.issues.trim());
      }
      lines.push('');

      lines.push('Notes');
      if (day.notes.trim()) {
        lines.push(day.notes.trim());
      }
      lines.push('');
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * 获取周统计信息
   */
  async getWeekStats(date: string | Date): Promise<WeekStats | null> {
    const weekFile = await this.getWeek(date);
    if (!weekFile) return null;

    const dates = getWeekDates(weekFile.weekStart);
    let filledDays = 0;
    let weekdaysFilled = 0;

    for (const dateInfo of dates) {
      const record = weekFile.days[dateInfo.date];
      const hasContent =
        record &&
        (record.plan.trim() ||
          record.result.trim() ||
          record.issues.trim() ||
          record.notes.trim());

      if (hasContent) {
        filledDays++;
        if (!dateInfo.isWeekend) {
          weekdaysFilled++;
        }
      }
    }

    return {
      weekStart: weekFile.weekStart,
      weekEnd: weekFile.weekEnd,
      filledDays,
      weekdaysFilled,
      totalDays: 7,
    };
  }

  /**
   * 删除某周的记录文件（通过日期计算文件名）
   */
  async deleteWeek(date: string | Date): Promise<boolean> {
    const fileName = getWeekFileName(date);
    return this.deleteWeekByFileName(fileName);
  }

  /**
   * 删除某周的记录文件（直接通过文件名）
   */
  async deleteWeekByFileName(fileName: string): Promise<boolean> {
    // 安全检查：确保文件名格式正确，防止路径遍历攻击
    if (!fileName.match(/^\d{4}-W\d{2}_\d{2}-\d{2}~\d{2}-\d{2}\.json$/)) {
      return false;
    }

    const filePath = path.join(DAILY_LOG_DIR, fileName);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 单例实例
 */
export const dailyLogManager = new DailyLogManager();
