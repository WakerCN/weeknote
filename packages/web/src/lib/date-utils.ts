/**
 * 日期工具函数（前端专用）
 * 复制自 @weeknote/core，避免引入 Node.js 依赖
 */

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 将日期字符串解析为本地时间的 Date 对象
 * 避免 new Date('YYYY-MM-DD') 被解析为 UTC 时间导致的时区问题
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 格式化 Date 对象为 YYYY-MM-DD 字符串（使用本地时区）
 */
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将日期参数转换为本地时间的 Date 对象
 */
function toLocalDate(date: Date | string): Date {
  return typeof date === 'string' ? parseLocalDate(date) : date;
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
 * 格式化日期显示 "12月23日"
 */
export function formatDateChinese(date: string): string {
  const d = parseLocalDate(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

