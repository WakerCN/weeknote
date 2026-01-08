/**
 * 提醒功能类型定义
 */

/**
 * 提醒时间配置
 */
export interface ScheduleConfig {
  /** 小时（0-23） */
  hour: number;
  /** 分钟（0-59） */
  minute: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 提醒配置
 */
export interface ReminderConfig {
  /** 是否启用提醒 */
  enabled: boolean;

  /** Server酱 SendKey */
  sendKey: string;

  /** 提醒时间 */
  schedules: {
    /** 上午提醒 */
    morning: ScheduleConfig;
    /** 晚间提醒 */
    evening: ScheduleConfig;
  };

  /** 更新时间 */
  updatedAt: string;
}

/**
 * 节假日数据
 */
export interface HolidayData {
  /** 年份 */
  year: number;

  /** 节假日列表（这些天放假） */
  holidays: string[];

  /** 调休工作日（这些天要上班） */
  workdays: string[];

  /** 数据来源说明 */
  source: string;

  /** 更新时间 */
  updatedAt: string;
}

/**
 * 工作日判断结果
 */
export interface WorkdayInfo {
  /** 是否为工作日 */
  isWorkday: boolean;
  /** 日期类型说明 */
  reason: '工作日' | '周末' | '节假日' | '调休工作日';
}

/**
 * 推送结果
 */
export interface PushResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}
