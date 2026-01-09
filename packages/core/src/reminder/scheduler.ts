/**
 * 提醒定时调度器
 */

import cron, { type ScheduledTask } from 'node-cron';
import { loadReminderConfig } from './config.js';
import { isLegalWorkday } from './workday.js';
import {
  sendServerChanMessage,
  generateReminderMessage,
} from './server-chan.js';
import { sendDingtalkMessage } from './dingtalk.js';
import type { ReminderConfig, ScheduleTime } from './types.js';

/**
 * 检查是否有任何渠道已配置且有提醒时间
 */
function hasAnyChannelConfigured(config: ReminderConfig): boolean {
  const { channels } = config;

  // 钉钉：启用且有 webhook 且有提醒时间
  if (
    channels.dingtalk.enabled &&
    channels.dingtalk.webhook &&
    channels.dingtalk.schedules.times.some((t) => t.enabled)
  ) {
    return true;
  }

  // Server酱：启用且有 sendKey 且有提醒时间
  if (
    channels.serverChan.enabled &&
    channels.serverChan.sendKey &&
    channels.serverChan.schedules.times.some((t) => t.enabled)
  ) {
    return true;
  }

  return false;
}

/**
 * 获取已启用的渠道名称
 */
function getEnabledChannels(config: ReminderConfig): string[] {
  const channels: string[] = [];
  if (
    config.channels.dingtalk.enabled &&
    config.channels.dingtalk.webhook &&
    config.channels.dingtalk.schedules.times.some((t) => t.enabled)
  ) {
    channels.push('钉钉');
  }
  if (
    config.channels.serverChan.enabled &&
    config.channels.serverChan.sendKey &&
    config.channels.serverChan.schedules.times.some((t) => t.enabled)
  ) {
    channels.push('Server酱');
  }
  return channels;
}

/**
 * 格式化时间显示
 */
function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

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

    if (!hasAnyChannelConfigured(this.config)) {
      console.log('[Reminder] 没有配置任何推送渠道，跳过启动');
      return;
    }

    // 每分钟检查一次
    this.job = cron.schedule('* * * * *', () => {
      this.checkAndSend();
    });

    const enabledChannels = getEnabledChannels(this.config);
    console.log(
      `[Reminder] 定时任务已启动，推送渠道: ${enabledChannels.join(', ')}`
    );
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

    // 检查是否为法定工作日
    const workdayInfo = isLegalWorkday(now);
    if (!workdayInfo.isWorkday) {
      // 只在整点时输出日志，避免每分钟都输出
      if (minute === 0) {
        console.log(`[Reminder] 今天是${workdayInfo.reason}，跳过提醒`);
      }
      return;
    }

    const { channels } = this.config;

    // 检查钉钉渠道
    if (channels.dingtalk.enabled && channels.dingtalk.webhook) {
      const matchingTimes = channels.dingtalk.schedules.times.filter(
        (t) => t.enabled && t.hour === hour && t.minute === minute
      );
      for (const time of matchingTimes) {
        await this.sendToDingtalk(time);
      }
    }

    // 检查 Server酱渠道
    if (channels.serverChan.enabled && channels.serverChan.sendKey) {
      const matchingTimes = channels.serverChan.schedules.times.filter(
        (t) => t.enabled && t.hour === hour && t.minute === minute
      );
      for (const time of matchingTimes) {
        await this.sendToServerChan(time);
      }
    }
  }

  /**
   * 发送钉钉消息
   */
  private async sendToDingtalk(time: ScheduleTime): Promise<void> {
    if (!this.config) return;

    const scheduleName = time.label || formatTime(time.hour, time.minute);
    console.log(`[Reminder] 触发钉钉「${scheduleName}」，正在发送...`);

    const { title, content } = generateReminderMessage();
    const result = await sendDingtalkMessage(
      this.config.channels.dingtalk.webhook,
      title,
      content,
      this.config.channels.dingtalk.secret
    );

    if (result.success) {
      console.log(`[Reminder] 钉钉「${scheduleName}」推送成功`);
    } else {
      console.error(`[Reminder] 钉钉「${scheduleName}」推送失败:`, result.error);
    }
  }

  /**
   * 发送 Server酱消息
   */
  private async sendToServerChan(time: ScheduleTime): Promise<void> {
    if (!this.config) return;

    const scheduleName = time.label || formatTime(time.hour, time.minute);
    console.log(`[Reminder] 触发 Server酱「${scheduleName}」，正在发送...`);

    const { title, content } = generateReminderMessage();
    const result = await sendServerChanMessage(
      this.config.channels.serverChan.sendKey,
      title,
      content
    );

    if (result.success) {
      console.log(`[Reminder] Server酱「${scheduleName}」推送成功`);
    } else {
      console.error(`[Reminder] Server酱「${scheduleName}」推送失败:`, result.error);
    }
  }

  /**
   * 输出下次触发时间
   */
  private logNextTriggers(): void {
    if (!this.config) return;

    const { channels } = this.config;
    const triggers: string[] = [];

    // 钉钉提醒时间
    if (channels.dingtalk.enabled && channels.dingtalk.webhook) {
      const dingtalkTimes = channels.dingtalk.schedules.times
        .filter((t) => t.enabled)
        .map((t) => t.label || formatTime(t.hour, t.minute));
      if (dingtalkTimes.length > 0) {
        triggers.push(`钉钉: ${dingtalkTimes.join(', ')}`);
      }
    }

    // Server酱提醒时间
    if (channels.serverChan.enabled && channels.serverChan.sendKey) {
      const serverChanTimes = channels.serverChan.schedules.times
        .filter((t) => t.enabled)
        .map((t) => t.label || formatTime(t.hour, t.minute));
      if (serverChanTimes.length > 0) {
        triggers.push(`Server酱: ${serverChanTimes.join(', ')}`);
      }
    }

    if (triggers.length > 0) {
      console.log(`[Reminder] 提醒时间: ${triggers.join(' | ')}`);
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

