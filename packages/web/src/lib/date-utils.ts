/**
 * 日期工具函数（前端专用）
 * 复制自 @weeknote/core，避免引入 Node.js 依赖
 */

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 将日期字符串解析为本地时间的 Date 对象
 * 避免 new Date('YYYY-MM-DD') 被解析为 UTC 时间导致的时区问题
 */
export function parseLocalDate(dateStr: string): Date {
  // 防御性检查：如果传入无效值，返回当前日期
  if (!dateStr || typeof dateStr !== 'string') {
    console.warn('[date-utils] parseLocalDate 收到无效参数:', dateStr);
    return new Date();
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 格式化 Date 对象为 YYYY-MM-DD 字符串（使用本地时区）
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将日期参数转换为本地时间的 Date 对象
 */
export function toLocalDate(date: Date | string): Date {
  return typeof date === 'string' ? parseLocalDate(date) : date;
}

/**
 * 获取上周一的日期
 */
export function getLastWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getWeekStart(d);
}

/**
 * 获取上周日的日期
 */
export function getLastWeekEnd(): string {
  const lastWeekStart = parseLocalDate(getLastWeekStart());
  lastWeekStart.setDate(lastWeekStart.getDate() + 6);
  return formatLocalDate(lastWeekStart);
}

/**
 * 获取本月1号的日期
 */
export function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * 获取本月最后一天
 */
export function getMonthEnd(): string {
  const d = new Date();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return formatLocalDate(lastDay);
}

/**
 * 获取N天前的日期
 */
export function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return formatLocalDate(d);
}

/**
 * 计算日期范围内的天数
 */
export function getDayCount(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 格式化日期为短格式 M/D
 */
export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

/**
 * 获取日期的星期几
 */
export function getDayOfWeek(date: Date | string): string {
  const d = toLocalDate(date);
  return WEEKDAY_NAMES[d.getDay()];
}

/**
 * 判断是否为周末
 */
export function isWeekend(date: Date | string): boolean {
  const d = toLocalDate(date);
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * 日期信息
 */
export interface DateInfo {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
}

/**
 * 获取某周的所有日期（周一到周日）
 */
export function getWeekDates(weekStart: string): DateInfo[] {
  const dates: DateInfo[] = [];
  const start = parseLocalDate(weekStart);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = formatLocalDate(d);

    dates.push({
      date: dateStr,
      dayOfWeek: getDayOfWeek(d),
      isWeekend: isWeekend(d),
    });
  }

  return dates;
}

/**
 * 获取本周的周一日期
 */
export function getWeekStart(date: Date | string = new Date()): string {
  const d = toLocalDate(date);
  const day = d.getDay();
  // 周日(0)往前推6天，其他往前推(day-1)天
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDate(d);
}

/**
 * 获取周结束日期（周日）
 */
export function getWeekEnd(weekStart: string): string {
  const start = parseLocalDate(weekStart);
  start.setDate(start.getDate() + 6);
  return formatLocalDate(start);
}

/**
 * 格式化日期显示 "12-23"
 */
export function formatMonthDay(date: string): string {
  return date.slice(5); // "2024-12-23" → "12-23"
}

/**
 * 格式化日期显示 "12月23日"（不含年份）
 */
export function formatDateChinese(date: string): string {
  const d = parseLocalDate(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

/**
 * 格式化日期显示 "2024年12月23日"（含年份）
 */
export function formatFullDateChinese(date: string): string {
  const d = parseLocalDate(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 格式化日期为带年份的短格式 "2024/12/23"
 */
export function formatShortDateWithYear(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}/${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

/**
 * 格式化日期范围为带年份格式 "2024/12/25 ~ 2025/1/5"
 */
export function formatDateRangeWithYear(startDate: string, endDate: string): string {
  return `${formatShortDateWithYear(startDate)} ~ ${formatShortDateWithYear(endDate)}`;
}

/**
 * 格式化日期范围标签（用于历史记录等）
 * 格式: "2024/01-13 ~ 01-17" 或跨年 "2024/12-25 ~ 2025/01-05"
 */
export function formatDateRangeLabel(startDate: string, endDate: string): string {
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  const startMonthDay = startDate.slice(5);
  const endMonthDay = endDate.slice(5);
  
  if (startYear === endYear) {
    // 同年: "2024/01-13 ~ 01-17"
    return `${startYear}/${startMonthDay} ~ ${endMonthDay}`;
  } else {
    // 跨年: "2024/12-25 ~ 2025/01-05"
    return `${startYear}/${startMonthDay} ~ ${endYear}/${endMonthDay}`;
  }
}

// ========== 导出功能相关 ==========

/**
 * 导出限制常量
 */
export const EXPORT_LIMITS = {
  /** 单次导出最大天数 */
  MAX_DAYS: 730,  // 2年
  /** 直接导出（无进度）的阈值 */
  INSTANT_THRESHOLD: 180,  // 6个月
};

/**
 * 日期分块信息
 */
export interface DateChunk {
  /** 开始日期 YYYY-MM-DD */
  start: string;
  /** 结束日期 YYYY-MM-DD */
  end: string;
  /** 显示标签，如 "2024年1月" */
  label: string;
}

/**
 * 将日期范围按月分块
 * 用于大范围导出时分批请求
 */
export function splitDateRangeByMonth(startDate: string, endDate: string): DateChunk[] {
  const chunks: DateChunk[] = [];
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  
  let current = new Date(start);
  
  while (current <= end) {
    // 当前月的开始：取 current 和 startDate 的较大者
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const chunkStart = current > monthStart ? current : monthStart;
    
    // 当前月的结束：取月末和 endDate 的较小者
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const chunkEnd = monthEnd > end ? end : monthEnd;
    
    chunks.push({
      start: formatLocalDate(chunkStart),
      end: formatLocalDate(chunkEnd),
      label: `${current.getFullYear()}年${current.getMonth() + 1}月`,
    });
    
    // 移动到下个月
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  
  return chunks;
}

/**
 * 获取上个月的开始日期
 */
export function getLastMonthStart(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  return formatLocalDate(d);
}

/**
 * 获取上个月的结束日期
 */
export function getLastMonthEnd(): string {
  const d = new Date();
  d.setDate(0); // 上个月最后一天
  return formatLocalDate(d);
}

/**
 * 获取今年1月1日
 */
export function getYearStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

/**
 * 获取今天的日期
 */
export function getToday(): string {
  return formatLocalDate(new Date());
}

/**
 * 获取近三个月的开始日期
 */
export function getThreeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

