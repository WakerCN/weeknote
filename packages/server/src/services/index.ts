/**
 * 业务服务层
 */

// 节假日服务
export { holidayService, type WorkdayInfo } from './holiday-service.js';

// 云端提醒调度器
export { CloudReminderScheduler, cloudReminderScheduler } from './reminder-scheduler.js';

// 邮件服务
export {
  sendVerificationCode,
  verifyEmailConfig,
  generateVerificationCode,
  isEmailServiceConfigured,
} from './email-service.js';
