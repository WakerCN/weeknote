/**
 * 节假日数据服务
 * 
 * 提供节假日判断功能，内置中国法定节假日数据
 */

/**
 * 节假日数据类型
 */
interface HolidayData {
  year: number;
  holidays: string[];  // 节假日列表
  workdays: string[];  // 调休工作日列表
  source: string;
}

/**
 * 工作日判断结果
 */
export interface WorkdayInfo {
  isWorkday: boolean;
  reason: '工作日' | '周末' | '节假日' | '调休工作日';
}

/**
 * 内置节假日数据
 * 数据来源：国务院办公厅关于节假日安排的通知
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
      // 中秋节+国庆节（10月1日-10月8日放假）
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
  },
};

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 节假日服务类
 */
class HolidayService {
  /**
   * 获取指定年份的节假日数据
   */
  getHolidayData(year: number): HolidayData | null {
    return BUILTIN_HOLIDAY_DATA[year] || null;
  }

  /**
   * 获取可用的年份列表
   */
  getAvailableYears(): number[] {
    return Object.keys(BUILTIN_HOLIDAY_DATA).map(Number).sort();
  }

  /**
   * 判断指定日期是否为工作日
   * 
   * 判断逻辑：
   * 1. 如果是调休工作日 → 上班
   * 2. 如果是节假日 → 放假
   * 3. 如果是周末 → 放假
   * 4. 普通工作日 → 上班
   */
  isWorkday(date: Date = new Date()): WorkdayInfo {
    const dateStr = formatDate(date);
    const year = date.getFullYear();
    const dayOfWeek = date.getDay(); // 0=周日, 6=周六

    // 获取节假日数据
    const holidayData = this.getHolidayData(year);

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
}

/**
 * 全局节假日服务实例
 */
export const holidayService = new HolidayService();
