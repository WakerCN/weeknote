/**
 * 提醒功能类型定义
 */

/**
 * 单个提醒时间点
 */
export interface ScheduleTime {
  /** 唯一标识（用于前端 key） */
  id: string;
  /** 小时（0-23） */
  hour: number;
  /** 分钟（0-59） */
  minute: number;
  /** 是否启用 */
  enabled: boolean;
  /** 自定义标签（可选，如"上班提醒"、"下班提醒"） */
  label?: string;
}

/**
 * 渠道提醒时间配置
 */
export interface ChannelSchedules {
  /** 提醒时间列表 */
  times: ScheduleTime[];
}

/**
 * 钉钉机器人配置
 */
export interface DingtalkConfig {
  /** 是否启用 */
  enabled: boolean;
  /** Webhook 地址（含 access_token） */
  webhook: string;
  /** 加签密钥（可选，建议配置） */
  secret?: string;
  /** 该渠道的提醒时间 */
  schedules: ChannelSchedules;
}

/**
 * Server酱配置
 */
export interface ServerChanConfig {
  /** 是否启用 */
  enabled: boolean;
  /** SendKey */
  sendKey: string;
  /** 该渠道的提醒时间 */
  schedules: ChannelSchedules;
}

/**
 * 推送渠道配置
 */
export interface ChannelsConfig {
  /** 钉钉机器人 */
  dingtalk: DingtalkConfig;
  /** Server酱（微信推送） */
  serverChan: ServerChanConfig;
}

/**
 * 提醒配置
 */
export interface ReminderConfig {
  /** 是否启用提醒 */
  enabled: boolean;

  /** 推送渠道配置 */
  channels: ChannelsConfig;

  /** 更新时间 */
  updatedAt: string;
}

/**
 * 保存提醒配置的参数类型（支持部分更新）
 */
export interface SaveReminderConfigParams {
  enabled?: boolean;
  channels?: {
    dingtalk?: Partial<DingtalkConfig>;
    serverChan?: Partial<ServerChanConfig>;
  };
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
