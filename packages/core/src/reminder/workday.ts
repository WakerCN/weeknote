/**
 * 法定工作日判断
 */

import { loadHolidayData } from './holidays.js';
import type { WorkdayInfo } from './types.js';

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 判断指定日期是否为法定工作日
 *
 * 判断逻辑：
 * 1. 如果是调休工作日 → 上班
 * 2. 如果是节假日 → 放假
 * 3. 如果是周末 → 放假
 * 4. 普通工作日 → 上班
 */
export function isLegalWorkday(date: Date = new Date()): WorkdayInfo {
  const dateStr = formatDate(date);
  const year = date.getFullYear();
  const dayOfWeek = date.getDay(); // 0=周日, 6=周六

  // 加载节假日数据
  const holidayData = loadHolidayData(year);

  // 如果没有节假日数据，回退到简单的周末判断
  if (!holidayData) {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { isWorkday: false, reason: '周末' };
    }
    return { isWorkday: true, reason: '工作日' };
  }

  // 1. 检查是否为调休工作日
  if (holidayData.workdays.includes(dateStr)) {
    return { isWorkday: true, reason: '调休工作日' };
  }

  // 2. 检查是否为节假日
  if (holidayData.holidays.includes(dateStr)) {
    return { isWorkday: false, reason: '节假日' };
  }

  // 3. 检查是否为周末
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isWorkday: false, reason: '周末' };
  }

  // 4. 普通工作日
  return { isWorkday: true, reason: '工作日' };
}

/**
 * 获取星期几的中文名称
 */
export function getWeekdayName(date: Date = new Date()): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
}



