/**
 * 提醒功能模块入口
 */

// 类型导出
export type {
  ReminderConfig,
  ScheduleTime,
  ChannelSchedules,
  HolidayData,
  WorkdayInfo,
  PushResult,
  DingtalkConfig,
  ServerChanConfig,
  ChannelsConfig,
  SaveReminderConfigParams,
  ReminderMessageContext,
} from './types.js';

// 配置管理
export {
  loadReminderConfig,
  saveReminderConfig,
  getReminderConfigPath,
  generateId,
  DEFAULT_REMINDER_CONFIG,
  DEFAULT_CHANNELS_CONFIG,
  DEFAULT_CHANNEL_SCHEDULES,
} from './config.js';

// 节假日数据
export {
  loadHolidayData,
  saveHolidayData,
  getAvailableYears,
  clearHolidayCache,
  getUserHolidaysDir,
} from './holidays.js';

// 工作日判断
export { isLegalWorkday, formatDate, getWeekdayName } from './workday.js';

// Server酱推送
export {
  sendServerChanMessage,
  sendReminder,
  sendTestMessage,
  generateReminderMessage,
} from './server-chan.js';

// 钉钉机器人推送
export {
  sendDingtalkMessage,
  sendDingtalkTestMessage,
  sendDingtalkActionCard,
  sendDingtalkRichReminder,
  generateRichReminderContent,
  type ActionCardButton,
  type ActionCardOptions,
} from './dingtalk.js';

// 定时调度器
export { ReminderScheduler, reminderScheduler } from './scheduler.js';
