/**
 * Daily Log 解析模块
 * 将原始日志文本解析为结构化数据
 */

import type { DailyLogEntry, WeeklyLog } from '../types/index.js';

/**
 * 日期行正则表达式
 * 匹配: "12-15 | 周一", "12-15|周一", "12-15 | 周一 " 等
 */
const DATE_LINE_PATTERN = /^(\d{1,2}-\d{1,2})\s*\|\s*(周[一二三四五六日])\s*$/;

/**
 * 段落标题正则表达式
 * 匹配: "Plan", "Result", "Issues", "Notes"（不区分大小写）
 */
const SECTION_PATTERN = /^(Plan|Result|Issues|Notes)\s*$/i;

/**
 * 列表项正则表达式
 * 匹配以 "-" 或 "*" 或 "•" 开头的行
 */
const LIST_ITEM_PATTERN = /^[-*•]\s*(.+)$/;

/**
 * 段落类型
 */
type SectionType = 'plan' | 'result' | 'issues' | 'notes';

/**
 * 解析原始 Daily Log 文本为结构化的周日志
 * @param rawText - 原始 Daily Log 文本
 * @returns 解析后的周日志
 */
export function parseDailyLog(rawText: string): WeeklyLog {
  const lines = rawText.split('\n');
  const entries: DailyLogEntry[] = [];

  let currentEntry: DailyLogEntry | null = null;
  let currentSection: SectionType | null = null;
  let currentDayLines: string[] = [];

  const finalizeEntry = () => {
    if (currentEntry) {
      currentEntry.rawContent = currentDayLines.join('\n').trim();
      entries.push(currentEntry);
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 检查是否为日期行
    const dateMatch = trimmedLine.match(DATE_LINE_PATTERN);
    if (dateMatch) {
      // 完成上一个条目
      finalizeEntry();

      // 开始新条目
      currentEntry = {
        date: dateMatch[1],
        dayOfWeek: dateMatch[2],
        plan: [],
        result: [],
        issues: [],
        notes: [],
        rawContent: '',
      };
      currentSection = null;
      currentDayLines = [line];
      continue;
    }

    // 如果没有当前条目，跳过该行
    if (!currentEntry) {
      continue;
    }

    currentDayLines.push(line);

    // 检查是否为段落标题
    const sectionMatch = trimmedLine.match(SECTION_PATTERN);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase() as SectionType;
      continue;
    }

    // 跳过空行
    if (!trimmedLine) {
      continue;
    }

    // 如果有当前段落，将内容添加到其中
    if (currentSection && currentEntry) {
      // 检查是否为列表项
      const listMatch = trimmedLine.match(LIST_ITEM_PATTERN);
      if (listMatch) {
        currentEntry[currentSection].push(listMatch[1].trim());
      } else {
        // 非列表内容，直接添加
        currentEntry[currentSection].push(trimmedLine);
      }
    }
  }

  // 完成最后一个条目
  finalizeEntry();

  // 计算开始和结束日期
  const startDate = entries.length > 0 ? entries[0].date : '';
  const endDate = entries.length > 0 ? entries[entries.length - 1].date : '';

  return {
    entries,
    startDate,
    endDate,
  };
}

/**
 * 解析单天的日志条目
 * @param dayText - 单天的文本
 * @param dateHeader - 日期标题行
 * @returns 解析后的单日日志条目
 */
export function parseDayEntry(dayText: string, dateHeader: string): DailyLogEntry {
  const dateMatch = dateHeader.match(DATE_LINE_PATTERN);

  const entry: DailyLogEntry = {
    date: dateMatch ? dateMatch[1] : '',
    dayOfWeek: dateMatch ? dateMatch[2] : '',
    plan: [],
    result: [],
    issues: [],
    notes: [],
    rawContent: dayText,
  };

  const lines = dayText.split('\n');
  let currentSection: SectionType | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 检查段落标题
    const sectionMatch = trimmedLine.match(SECTION_PATTERN);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase() as SectionType;
      continue;
    }

    // 跳过空行和日期行
    if (!trimmedLine || DATE_LINE_PATTERN.test(trimmedLine)) {
      continue;
    }

    // 将内容添加到当前段落
    if (currentSection) {
      const listMatch = trimmedLine.match(LIST_ITEM_PATTERN);
      if (listMatch) {
        entry[currentSection].push(listMatch[1].trim());
      } else {
        entry[currentSection].push(trimmedLine);
      }
    }
  }

  return entry;
}

/**
 * 验证输入文本是否为有效的 Daily Log 格式
 * @param rawText - 要验证的原始文本
 * @returns 验证结果，如果无效则包含错误信息
 */
export function validateDailyLog(rawText: string): { valid: boolean; error?: string } {
  if (!rawText || !rawText.trim()) {
    return { valid: false, error: '输入内容为空' };
  }

  const lines = rawText.split('\n');
  let hasDateLine = false;

  for (const line of lines) {
    if (DATE_LINE_PATTERN.test(line.trim())) {
      hasDateLine = true;
      break;
    }
  }

  if (!hasDateLine) {
    return {
      valid: false,
      error: '未找到有效的日期行，请使用格式：12-15 | 周一',
    };
  }

  return { valid: true };
}

/**
 * 将周日志格式化为可读文本（用于调试）
 * @param weeklyLog - 解析后的周日志
 * @returns 格式化的文本
 */
export function formatWeeklyLog(weeklyLog: WeeklyLog): string {
  const lines: string[] = [];

  for (const entry of weeklyLog.entries) {
    lines.push(`${entry.date} | ${entry.dayOfWeek}`);

    if (entry.plan.length > 0) {
      lines.push('Plan');
      entry.plan.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }

    if (entry.result.length > 0) {
      lines.push('Result');
      entry.result.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }

    if (entry.issues.length > 0) {
      lines.push('Issues');
      entry.issues.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }

    if (entry.notes.length > 0) {
      lines.push('Notes');
      entry.notes.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}
