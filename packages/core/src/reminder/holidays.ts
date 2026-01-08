/**
 * 节假日数据管理
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { HolidayData } from './types.js';

/**
 * 用户节假日数据目录
 */
const USER_HOLIDAYS_DIR = path.join(os.homedir(), '.weeknote', 'holidays');

/**
 * 内置节假日数据（2025年）
 * 数据来源：国务院办公厅关于2025年部分节假日安排的通知
 */
const BUILTIN_HOLIDAY_DATA: Record<number, HolidayData> = {
  2025: {
    year: 2025,
    holidays: [
      // 元旦
      '2025-01-01',
      // 春节
      '2025-01-28',
      '2025-01-29',
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
      '2025-02-03',
      '2025-02-04',
      // 清明节
      '2025-04-04',
      '2025-04-05',
      '2025-04-06',
      // 劳动节
      '2025-05-01',
      '2025-05-02',
      '2025-05-03',
      '2025-05-04',
      '2025-05-05',
      // 端午节
      '2025-05-31',
      '2025-06-01',
      '2025-06-02',
      // 国庆节+中秋节
      '2025-10-01',
      '2025-10-02',
      '2025-10-03',
      '2025-10-04',
      '2025-10-05',
      '2025-10-06',
      '2025-10-07',
      '2025-10-08',
    ],
    workdays: [
      // 春节调休
      '2025-01-26',
      '2025-02-08',
      // 清明节调休
      '2025-04-27',
      // 国庆节调休
      '2025-09-28',
      '2025-10-11',
    ],
    source: '国务院办公厅关于2025年部分节假日安排的通知',
    updatedAt: '2024-11-12',
  },
  2026: {
    year: 2026,
    holidays: [
      // 元旦（1月1日-1月3日放假）
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      // 春节（2月17日-2月23日放假）
      '2026-02-17',
      '2026-02-18',
      '2026-02-19',
      '2026-02-20',
      '2026-02-21',
      '2026-02-22',
      '2026-02-23',
      // 清明节（4月4日-4月6日放假）
      '2026-04-04',
      '2026-04-05',
      '2026-04-06',
      // 劳动节（5月1日-5月5日放假）
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
      '2026-05-05',
      // 端午节（5月31日-6月2日放假）
      '2026-05-31',
      '2026-06-01',
      '2026-06-02',
      // 中秋节（10月3日-10月5日放假，与国庆连休）
      // 国庆节（10月1日-10月8日放假）
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ],
    workdays: [
      // 元旦调休（1月4日周日上班）
      '2026-01-04',
      // 春节调休
      '2026-02-15',
      '2026-02-28',
      // 国庆节调休
      '2026-09-27',
      '2026-10-10',
    ],
    source: '2026年节假日安排（预测）',
    updatedAt: '2026-01-04',
  },
};

/**
 * 节假日数据缓存
 */
const holidayCache = new Map<number, HolidayData>();

/**
 * 确保用户节假日目录存在
 */
function ensureUserHolidaysDir(): void {
  if (!fs.existsSync(USER_HOLIDAYS_DIR)) {
    fs.mkdirSync(USER_HOLIDAYS_DIR, { recursive: true });
  }
}

/**
 * 加载指定年份的节假日数据
 * 优先从用户目录加载，其次从内置数据加载
 */
export function loadHolidayData(year: number): HolidayData | null {
  // 先检查缓存
  if (holidayCache.has(year)) {
    return holidayCache.get(year)!;
  }

  const fileName = `${year}.json`;

  // 1. 尝试从用户目录加载
  const userFilePath = path.join(USER_HOLIDAYS_DIR, fileName);
  if (fs.existsSync(userFilePath)) {
    try {
      const content = fs.readFileSync(userFilePath, 'utf-8');
      const data = JSON.parse(content) as HolidayData;
      holidayCache.set(year, data);
      return data;
    } catch (error) {
      console.error(`[Holidays] 读取用户节假日数据失败 (${year}):`, error);
    }
  }

  // 2. 尝试从内置数据加载
  if (BUILTIN_HOLIDAY_DATA[year]) {
    const data = BUILTIN_HOLIDAY_DATA[year];
    holidayCache.set(year, data);
    return data;
  }

  return null;
}

/**
 * 保存节假日数据到用户目录
 */
export function saveHolidayData(data: HolidayData): void {
  ensureUserHolidaysDir();

  const fileName = `${data.year}.json`;
  const filePath = path.join(USER_HOLIDAYS_DIR, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  // 更新缓存
  holidayCache.set(data.year, data);
}

/**
 * 获取已加载的所有年份
 */
export function getAvailableYears(): number[] {
  const years = new Set<number>();

  // 添加内置数据的年份
  for (const year of Object.keys(BUILTIN_HOLIDAY_DATA)) {
    years.add(parseInt(year, 10));
  }

  // 扫描用户目录
  if (fs.existsSync(USER_HOLIDAYS_DIR)) {
    const files = fs.readdirSync(USER_HOLIDAYS_DIR);
    for (const file of files) {
      const match = file.match(/^(\d{4})\.json$/);
      if (match) {
        years.add(parseInt(match[1], 10));
      }
    }
  }

  return Array.from(years).sort();
}

/**
 * 清除缓存
 */
export function clearHolidayCache(): void {
  holidayCache.clear();
}

/**
 * 获取用户节假日数据目录
 */
export function getUserHolidaysDir(): string {
  return USER_HOLIDAYS_DIR;
}
