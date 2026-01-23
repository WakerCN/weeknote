/**
 * Daily Log 解析模块
 * 将原始日志文本解析为结构化数据
 */

import type { DailyLogEntry, WeeklyLog } from '../types/index.js';

/**
 * 日期行正则表达式
 * 匹配: "2024-12-15 | 周一", "12-15 | 周一", "12-15|周一" 等
 * 支持年份可选：(\d{4}-)? 匹配可选的年份前缀
 */
const DATE_LINE_PATTERN = /^((?:\d{4}-)?\d{1,2}-\d{1,2})\s*\|\s*(周[一二三四五六日])\s*$/;

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
 * 校验状态
 */
export type ValidationStatus = 'valid' | 'warning' | 'error';

/**
 * 校验警告类型
 */
export type ValidationWarningType = 'no_date_line' | 'no_sections';

/**
 * 校验警告信息
 */
export interface ValidationWarning {
  type: ValidationWarningType;
  message: string;
  suggestion: string;
}

/**
 * 校验结果
 */
export interface ValidationResult {
  status: ValidationStatus;
  warnings: ValidationWarning[];
  error?: string;
}

/**
 * 警告消息配置
 */
const WARNING_MESSAGES: Record<ValidationWarningType, { message: string; suggestion: string }> = {
  no_date_line: {
    message: '未找到日期标识',
    suggestion: `按天记录可以让 AI 更好地理解工作进度。推荐格式：

  2024-12-23 | 周一
  Plan
  - 计划任务 1
  Result
  - 完成内容 1

当前将整体作为一天的内容处理。`,
  },
  no_sections: {
    message: '未找到段落结构',
    suggestion: `使用 Plan / Result / Issues / Notes 分类，可以让周报更有条理：

  Plan
  - 今日计划
  Result
  - 实际完成
  Issues
  - 遇到的问题

当前将所有内容作为 Result 处理。`,
  },
};

/**
 * 解析段落内容（无日期行时使用）
 * @param rawText - 原始文本
 * @returns 解析后的段落内容
 */
function parseSections(rawText: string): Pick<DailyLogEntry, 'plan' | 'result' | 'issues' | 'notes'> {
  const result: Pick<DailyLogEntry, 'plan' | 'result' | 'issues' | 'notes'> = {
    plan: [],
    result: [],
    issues: [],
    notes: [],
  };

  const lines = rawText.split('\n');
  // 段落标题之前的内容默认放入 result（避免静默丢弃）
  let currentSection: SectionType = 'result';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 检查段落标题
    const sectionMatch = trimmedLine.match(SECTION_PATTERN);
    if (sectionMatch) {
      currentSection = sectionMatch[1].toLowerCase() as SectionType;
      continue;
    }

    // 跳过空行
    if (!trimmedLine) {
      continue;
    }

    // 将内容添加到当前段落
    const listMatch = trimmedLine.match(LIST_ITEM_PATTERN);
    if (listMatch) {
      result[currentSection].push(listMatch[1].trim());
    } else {
      result[currentSection].push(trimmedLine);
    }
  }

  return result;
}

/**
 * 解析原始 Daily Log 文本为结构化的周日志
 * @param rawText - 原始 Daily Log 文本
 * @returns 解析后的周日志
 */
export function parseDailyLog(rawText: string): WeeklyLog {
  const lines = rawText.split('\n');

  // 检查是否有日期行
  const hasDateLine = lines.some((line) => DATE_LINE_PATTERN.test(line.trim()));

  // 无日期行：整体作为一个条目处理
  if (!hasDateLine) {
    const hasSections = lines.some((line) => SECTION_PATTERN.test(line.trim()));

    const entry: DailyLogEntry = {
      date: '未标注',
      dayOfWeek: '',
      plan: [],
      result: [],
      issues: [],
      notes: [],
      rawContent: rawText,
    };

    if (hasSections) {
      // 有段落结构，按段落解析
      const sections = parseSections(rawText);
      entry.plan = sections.plan;
      entry.result = sections.result;
      entry.issues = sections.issues;
      entry.notes = sections.notes;
    } else {
      // 无段落结构，全部放入 result
      entry.result = rawText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    return { entries: [entry], startDate: '', endDate: '' };
  }

  // 有日期行：正常解析
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
 * 验证输入文本是否为有效的 Daily Log 格式（软校验）
 * @param rawText - 要验证的原始文本
 * @returns 验证结果，包含状态、警告信息或错误信息
 */
export function validateDailyLog(rawText: string): ValidationResult {
  // 严重错误：输入为空
  if (!rawText?.trim()) {
    return { status: 'error', warnings: [], error: '请输入 Daily Log 内容' };
  }

  const warnings: ValidationWarning[] = [];
  const lines = rawText.split('\n');

  // 检查是否有日期行
  const hasDateLine = lines.some((line) => DATE_LINE_PATTERN.test(line.trim()));
  if (!hasDateLine) {
    warnings.push({
      type: 'no_date_line',
      ...WARNING_MESSAGES.no_date_line,
    });
  }

  // 检查是否有段落结构
  const hasSections = lines.some((line) => SECTION_PATTERN.test(line.trim()));
  if (!hasSections) {
    warnings.push({
      type: 'no_sections',
      ...WARNING_MESSAGES.no_sections,
    });
  }

  return {
    status: warnings.length > 0 ? 'warning' : 'valid',
    warnings,
  };
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
