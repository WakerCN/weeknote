/**
 * 提醒定时调度器
 */

import cron, { type ScheduledTask } from 'node-cron';
import { loadReminderConfig } from './config.js';
import { isLegalWorkday } from './workday.js';
import { sendReminder } from './server-chan.js';
import type { ReminderConfig } from './types.js';

/**
 * 提醒调度器
 *
 * 采用每分钟检查的策略，以便动态判断法定工作日
 */
export class ReminderScheduler {
  private job: ScheduledTask | null = null;
  private config: ReminderConfig | null = null;

  /**
   * 启动调度器
   */
  start(config?: ReminderConfig): void {
    // 先停止现有任务
    this.stop();

    // 加载配置
    this.config = config || loadReminderConfig();

    if (!this.config.enabled) {
      console.log('[Reminder] 提醒功能未启用');
      return;
    }

    if (!this.config.sendKey) {
      console.log('[Reminder] SendKey 未配置，跳过启动');
      return;
    }

    // 每分钟检查一次
    this.job = cron.schedule('* * * * *', () => {
      this.checkAndSend();
    });

    console.log('[Reminder] 定时任务已启动');
    this.logNextTriggers();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('[Reminder] 定时任务已停止');
    }
  }

  /**
   * 重新加载配置并重启
   */
  reload(): void {
    console.log('[Reminder] 重新加载配置...');
    this.start();
  }

  /**
   * 检查并发送提醒
   */
  private async checkAndSend(): Promise<void> {
    if (!this.config) return;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const { morning, evening } = this.config.schedules;

    // 检查是否匹配提醒时间
    const isMorningTime = morning.enabled && hour === morning.hour && minute === morning.minute;
    const isEveningTime = evening.enabled && hour === evening.hour && minute === evening.minute;

    if (!isMorningTime && !isEveningTime) {
      return;
    }

    // 检查是否为法定工作日
    const workdayInfo = isLegalWorkday(now);

    if (!workdayInfo.isWorkday) {
      console.log(`[Reminder] 今天是${workdayInfo.reason}，跳过提醒`);
      return;
    }

    // 发送提醒
    const scheduleName = isMorningTime ? '上午提醒' : '晚间提醒';
    console.log(`[Reminder] 触发${scheduleName}，正在发送...`);

    const result = await sendReminder(this.config.sendKey);

    if (result.success) {
      console.log(`[Reminder] ${scheduleName}发送成功`);
    } else {
      console.error(`[Reminder] ${scheduleName}发送失败:`, result.error);
    }
  }

  /**
   * 输出下次触发时间
   */
  private logNextTriggers(): void {
    if (!this.config) return;

    const { morning, evening } = this.config.schedules;
    const triggers: string[] = [];

    if (morning.enabled) {
      triggers.push(`上午提醒 ${String(morning.hour).padStart(2, '0')}:${String(morning.minute).padStart(2, '0')}`);
    }
    if (evening.enabled) {
      triggers.push(`晚间提醒 ${String(evening.hour).padStart(2, '0')}:${String(evening.minute).padStart(2, '0')}`);
    }

    if (triggers.length > 0) {
      console.log(`[Reminder] 提醒时间: ${triggers.join(', ')}`);
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    running: boolean;
    config: ReminderConfig | null;
  } {
    return {
      running: this.job !== null,
      config: this.config,
    };
  }
}

/**
 * 全局调度器实例
 */
export const reminderScheduler = new ReminderScheduler();

