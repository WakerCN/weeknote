/**
 * 云端提醒定时调度器
 * 
 * 与本地版本的区别：
 * - 多用户系统，管理所有用户的提醒配置
 * - 从 MongoDB 读取用户配置
 * - 每分钟检查所有启用提醒的用户
 */

import cron, { type ScheduledTask } from 'node-cron';
import { User, type IUser } from '../db/models/User.js';
import { holidayService } from './holiday-service.js';
import {
  sendServerChanMessage,
  sendDingtalkMessage,
  generateReminderMessage,
  type ReminderConfig,
  type ScheduleTime,
  type ChannelSchedules,
} from '@weeknote/core';
import { createLogger } from '../logger/index.js';

const logger = createLogger('Scheduler');

/**
 * 默认渠道提醒时间
 */
const DEFAULT_CHANNEL_SCHEDULES: ChannelSchedules = {
  times: [
    { id: 'default-morning', hour: 10, minute: 5, enabled: true, label: '上午提醒' },
    { id: 'default-evening', hour: 20, minute: 40, enabled: true, label: '晚间提醒' },
  ],
};

/**
 * 规范化渠道提醒时间配置
 */
function normalizeChannelSchedules(schedules: any): ChannelSchedules {
  const times = Array.isArray(schedules?.times) ? schedules.times : null;
  if (!times || times.length === 0) return DEFAULT_CHANNEL_SCHEDULES;
  return {
    times: times.map((t: any, idx: number) => ({
      id: t?.id ?? `migrated-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      hour: typeof t?.hour === 'number' ? t.hour : 10,
      minute: typeof t?.minute === 'number' ? t.minute : 0,
      enabled: typeof t?.enabled === 'boolean' ? t.enabled : true,
      label: typeof t?.label === 'string' ? t.label : undefined,
    })),
  };
}

/**
 * 从用户配置中提取 ReminderConfig
 */
function extractReminderConfig(reminderConfig: any): ReminderConfig {
  const dingtalk = reminderConfig?.channels?.dingtalk ?? {};
  const serverChan = reminderConfig?.channels?.serverChan ?? {};

  return {
    enabled: reminderConfig?.enabled ?? false,
    channels: {
      dingtalk: {
        enabled: dingtalk?.enabled ?? false,
        webhook: dingtalk?.webhook ?? '',
        secret: dingtalk?.secret ?? '',
        schedules: normalizeChannelSchedules(dingtalk?.schedules),
      },
      serverChan: {
        enabled: serverChan?.enabled ?? false,
        sendKey: serverChan?.sendKey ?? '',
        schedules: normalizeChannelSchedules(serverChan?.schedules),
      },
    },
    updatedAt: reminderConfig?.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * 判断是否为工作日
 * 使用 HolidayService 进行完整的节假日判断
 */
function isWorkday(date: Date = new Date()): { isWorkday: boolean; reason: string } {
  return holidayService.isWorkday(date);
}

/**
 * 格式化时间显示
 */
function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * 云端提醒调度器
 */
export class CloudReminderScheduler {
  private job: ScheduledTask | null = null;
  private isRunning = false;

  /**
   * 启动调度器
   */
  start(): void {
    if (this.job) {
      logger.warn('调度器已在运行');
      return;
    }

    // 每分钟检查一次
    this.job = cron.schedule('* * * * *', () => {
      this.checkAndSendAll();
    });

    this.isRunning = true;
    logger.success('定时调度器已启动');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      this.isRunning = false;
      logger.info('定时调度器已停止');
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { running: boolean } {
    return { running: this.isRunning };
  }

  /**
   * 检查并发送所有用户的提醒
   */
  private async checkAndSendAll(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // 检查是否为工作日
    const workdayInfo = isWorkday(now);
    if (!workdayInfo.isWorkday) {
      // 只在整点时输出日志，避免每分钟都输出
      if (minute === 0) {
        logger.debug(`今天是${workdayInfo.reason}，跳过提醒`);
      }
      return;
    }

    try {
      // 查询所有启用了提醒的用户
      const users = await User.find({
        'config.reminderConfig.enabled': true,
      });

      if (users.length === 0) {
        return;
      }

      // 检查每个用户的提醒配置
      for (const user of users) {
        await this.checkAndSendForUser(user, hour, minute);
      }
    } catch (error) {
      logger.error('查询用户失败', error as Error);
    }
  }

  /**
   * 检查并发送单个用户的提醒
   */
  private async checkAndSendForUser(user: IUser, hour: number, minute: number): Promise<void> {
    const config = extractReminderConfig(user.config.reminderConfig);

    if (!config.enabled) return;

    const { channels } = config;

    // 检查钉钉渠道
    if (channels.dingtalk.enabled && channels.dingtalk.webhook) {
      const matchingTimes = channels.dingtalk.schedules.times.filter(
        (t) => t.enabled && t.hour === hour && t.minute === minute
      );
      for (const time of matchingTimes) {
        await this.sendToDingtalk(user.email, channels.dingtalk.webhook, channels.dingtalk.secret, time);
      }
    }

    // 检查 Server酱渠道
    if (channels.serverChan.enabled && channels.serverChan.sendKey) {
      const matchingTimes = channels.serverChan.schedules.times.filter(
        (t) => t.enabled && t.hour === hour && t.minute === minute
      );
      for (const time of matchingTimes) {
        await this.sendToServerChan(user.email, channels.serverChan.sendKey, time);
      }
    }
  }

  /**
   * 发送钉钉消息
   */
  private async sendToDingtalk(
    userEmail: string,
    webhook: string,
    secret: string | undefined,
    time: ScheduleTime
  ): Promise<void> {
    const scheduleName = time.label || formatTime(time.hour, time.minute);
    logger.info(`触发钉钉「${scheduleName}」`, { email: userEmail });

    const { title, content } = generateReminderMessage();
    const result = await sendDingtalkMessage(webhook, title, content, secret);

    if (result.success) {
      logger.success(`钉钉「${scheduleName}」推送成功`, { email: userEmail });
    } else {
      logger.error(`钉钉「${scheduleName}」推送失败`, { email: userEmail, error: result.error });
    }
  }

  /**
   * 发送 Server酱消息
   */
  private async sendToServerChan(
    userEmail: string,
    sendKey: string,
    time: ScheduleTime
  ): Promise<void> {
    const scheduleName = time.label || formatTime(time.hour, time.minute);
    logger.info(`触发 Server酱「${scheduleName}」`, { email: userEmail });

    const { title, content } = generateReminderMessage();
    const result = await sendServerChanMessage(sendKey, title, content);

    if (result.success) {
      logger.success(`Server酱「${scheduleName}」推送成功`, { email: userEmail });
    } else {
      logger.error(`Server酱「${scheduleName}」推送失败`, { email: userEmail, error: result.error });
    }
  }
}

/**
 * 全局云端调度器实例
 */
export const cloudReminderScheduler = new CloudReminderScheduler();
