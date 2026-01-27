/**
 * 云端提醒定时调度器
 * 
 * 与本地版本的区别：
 * - 多用户系统，管理所有用户的提醒配置
 * - 从 MongoDB 读取用户配置
 * - 每分钟检查所有启用提醒的用户
 */

import cron, { type ScheduledTask } from 'node-cron';
import mongoose from 'mongoose';
import { User, type IUser } from '../db/models/User.js';
import { DailyLog } from '../db/models/DailyLog.js';
import { holidayService } from './holiday-service.js';
import {
  sendServerChanMessage,
  sendDingtalkRichReminder,
  generateReminderMessage,
  type ReminderConfig,
  type ScheduleTime,
  type ChannelSchedules,
  type ReminderMessageContext,
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
 * 获取本周开始日期（周一）
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatLocalDate(d);
}

/**
 * 获取本周结束日期（周日）
 */
function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return formatLocalDate(d);
}

/**
 * 格式化本地日期为 YYYY-MM-DD
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取网站 URL
 */
function getSiteUrl(): string {
  return process.env.SITE_URL || process.env.WEB_URL || 'http://localhost:5173';
}

/**
 * 获取用户本周填写统计
 */
async function getUserWeeklyStats(userId: mongoose.Types.ObjectId): Promise<{
  filledDays: number;
  totalWorkdays: number;
  todayFilled: boolean;
}> {
  const now = new Date();
  const todayDate = formatLocalDate(now);
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);

  try {
    const records = await DailyLog.findByUserAndDateRange(userId, weekStart, weekEnd);

    let filledDays = 0;
    let todayFilled = false;

    for (const record of records) {
      const hasContent =
        record.plan.trim() || record.result.trim() || record.issues.trim() || record.notes.trim();
      
      if (hasContent) {
        // 只统计工作日（周一到周五）
        const d = new Date(record.date + 'T00:00:00');
        const dayOfWeek = d.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          filledDays++;
        }
        
        // 检查今天是否已填写
        if (record.date === todayDate) {
          todayFilled = true;
        }
      }
    }

    return {
      filledDays,
      totalWorkdays: 5,
      todayFilled,
    };
  } catch (error) {
    logger.error('获取用户周统计失败', error as Error);
    return {
      filledDays: 0,
      totalWorkdays: 5,
      todayFilled: false,
    };
  }
}

/**
 * 构建提醒消息上下文
 */
async function buildReminderContext(user: IUser): Promise<ReminderMessageContext> {
  const now = new Date();
  
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const date = now.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[now.getDay()];

  const stats = await getUserWeeklyStats(user._id);

  return {
    userName: user.name || user.email.split('@')[0],
    time,
    date,
    weekday,
    filledDays: stats.filledDays,
    totalWorkdays: stats.totalWorkdays,
    todayFilled: stats.todayFilled,
    siteUrl: getSiteUrl(),
  };
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
        await this.sendToDingtalk(user, channels.dingtalk.webhook, channels.dingtalk.secret, time);
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
   * 发送钉钉消息（个性化 ActionCard）
   */
  private async sendToDingtalk(
    user: IUser,
    webhook: string,
    secret: string | undefined,
    time: ScheduleTime
  ): Promise<void> {
    const scheduleName = time.label || formatTime(time.hour, time.minute);
    logger.info(`触发钉钉「${scheduleName}」`, { email: user.email });

    try {
      // 构建个性化消息上下文
      const context = await buildReminderContext(user);
      const result = await sendDingtalkRichReminder(webhook, context, secret);

      if (result.success) {
        logger.success(`钉钉「${scheduleName}」推送成功`, { email: user.email });
      } else {
        logger.error(`钉钉「${scheduleName}」推送失败`, { email: user.email, error: result.error });
      }
    } catch (error) {
      logger.error(`钉钉「${scheduleName}」推送异常`, { email: user.email, error: (error as Error).message });
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
