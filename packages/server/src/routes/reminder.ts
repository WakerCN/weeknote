/**
 * 提醒配置 API 路由
 */

import { Router, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../db/models/User.js';
import { authMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import {
  sendTestMessage,
  sendDingtalkTestMessage,
  type ScheduleTime,
  type ChannelSchedules,
  type ReminderConfig,
  type DingtalkConfig,
  type ServerChanConfig,
  DEFAULT_CHANNEL_SCHEDULES,
} from '@weeknote/core';
import { createLogger } from '../logger/index.js';

const router: Router = Router();
const logger = createLogger('Reminder');

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 验证单个时间点
 */
function validateScheduleTime(time: Partial<ScheduleTime>): string | null {
  if (time.hour !== undefined && (time.hour < 0 || time.hour > 23)) {
    return '小时必须在 0-23 之间';
  }
  if (time.minute !== undefined && (time.minute < 0 || time.minute > 59)) {
    return '分钟必须在 0-59 之间';
  }
  return null;
}

/**
 * 验证渠道提醒时间配置
 */
function validateChannelSchedules(schedules: Partial<ChannelSchedules>): string | null {
  if (!schedules.times || !Array.isArray(schedules.times)) {
    return null; // 没有 times 字段时跳过验证
  }

  for (let i = 0; i < schedules.times.length; i++) {
    const time = schedules.times[i];
    const error = validateScheduleTime(time);
    if (error) {
      return `第 ${i + 1} 个提醒时间: ${error}`;
    }
  }

  return null;
}

/**
 * 处理渠道提醒时间，确保每个时间点都有 ID
 */
function processChannelSchedules(schedules: Partial<ChannelSchedules> | undefined): ChannelSchedules | undefined {
  if (!schedules?.times) return undefined;

  return {
    times: schedules.times.map((time) => ({
      ...time,
      id: time.id || generateId(),
      hour: time.hour ?? 10,
      minute: time.minute ?? 0,
      enabled: time.enabled ?? true,
    })),
  };
}

/**
 * 规范化渠道提醒时间配置
 */
function normalizeChannelSchedules(schedules: any): ChannelSchedules {
  const times = Array.isArray(schedules?.times) ? schedules.times : null;
  if (!times || times.length === 0) return DEFAULT_CHANNEL_SCHEDULES;
  return {
    times: times.map((t: any, idx: number) => ({
      id: t?.id ?? `migrated-${idx}-${generateId()}`,
      hour: typeof t?.hour === 'number' ? t.hour : 10,
      minute: typeof t?.minute === 'number' ? t.minute : 0,
      enabled: typeof t?.enabled === 'boolean' ? t.enabled : true,
      label: typeof t?.label === 'string' ? t.label : undefined,
    })),
  };
}

/**
 * 从用户配置中提取并规范化 ReminderConfig
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
 * GET /api/reminder
 * 获取提醒配置
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const reminderConfig = extractReminderConfig(user.config.reminderConfig);

    res.json({
      success: true,
      config: reminderConfig,
    });
  } catch (error) {
    logger.error('获取配置失败', error as Error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取配置失败',
    });
  }
});

/**
 * PUT /api/reminder
 * 更新提醒配置
 */
router.put(
  '/',
  [
    body('enabled').optional().isBoolean(),
    body('channels').optional().isObject(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { enabled, channels } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      // 验证渠道配置
      if (channels) {
        // 验证 Server酱 SendKey 格式
        if (channels.serverChan?.sendKey) {
          const sendKey = channels.serverChan.sendKey.trim();
          if (sendKey.length > 0 && !sendKey.startsWith('SCT')) {
            res.status(400).json({
              error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
            });
            return;
          }
        }

        // 验证钉钉 Webhook 格式
        if (channels.dingtalk?.webhook) {
          const webhook = channels.dingtalk.webhook.trim();
          if (webhook.length > 0 && !webhook.startsWith('https://oapi.dingtalk.com/robot/send')) {
            res.status(400).json({
              error: '无效的 Webhook，钉钉机器人 Webhook 应以 https://oapi.dingtalk.com/robot/send 开头',
            });
            return;
          }
        }

        // 验证钉钉提醒时间
        if (channels.dingtalk?.schedules) {
          const error = validateChannelSchedules(channels.dingtalk.schedules);
          if (error) {
            res.status(400).json({ error: `钉钉提醒时间配置无效: ${error}` });
            return;
          }
        }

        // 验证 Server酱提醒时间
        if (channels.serverChan?.schedules) {
          const error = validateChannelSchedules(channels.serverChan.schedules);
          if (error) {
            res.status(400).json({ error: `Server酱提醒时间配置无效: ${error}` });
            return;
          }
        }
      }

      // 获取现有配置
      const existingConfig = extractReminderConfig(user.config.reminderConfig);

      // 处理渠道配置
      let dingtalkUpdate: Partial<DingtalkConfig> = { ...existingConfig.channels.dingtalk };
      let serverChanUpdate: Partial<ServerChanConfig> = { ...existingConfig.channels.serverChan };

      if (channels?.dingtalk) {
        dingtalkUpdate = {
          ...dingtalkUpdate,
          enabled: channels.dingtalk.enabled ?? dingtalkUpdate.enabled,
          webhook: channels.dingtalk.webhook?.trim() ?? dingtalkUpdate.webhook,
          secret: channels.dingtalk.secret?.trim() ?? dingtalkUpdate.secret,
        };
        const schedules = processChannelSchedules(channels.dingtalk.schedules);
        if (schedules) {
          dingtalkUpdate.schedules = schedules;
        }
      }

      if (channels?.serverChan) {
        serverChanUpdate = {
          ...serverChanUpdate,
          enabled: channels.serverChan.enabled ?? serverChanUpdate.enabled,
          sendKey: channels.serverChan.sendKey?.trim() ?? serverChanUpdate.sendKey,
        };
        const schedules = processChannelSchedules(channels.serverChan.schedules);
        if (schedules) {
          serverChanUpdate.schedules = schedules;
        }
      }

      // 构建新配置
      const newReminderConfig: ReminderConfig = {
        enabled: enabled ?? existingConfig.enabled,
        channels: {
          dingtalk: dingtalkUpdate as DingtalkConfig,
          serverChan: serverChanUpdate as ServerChanConfig,
        },
        updatedAt: new Date().toISOString(),
      };

      // 保存到用户配置
      user.config.reminderConfig = newReminderConfig as unknown as Record<string, unknown>;
      await user.save();

      logger.success('更新配置', { email: req.user!.email });

      res.json({
        success: true,
        config: newReminderConfig,
      });
    } catch (error) {
      logger.error('更新配置失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '保存配置失败',
      });
    }
  }
);

/**
 * POST /api/reminder/test/server-chan
 * 测试 Server酱 推送
 */
router.post(
  '/test/server-chan',
  [body('sendKey').notEmpty().withMessage('SendKey 不能为空')],
  async (req: AuthRequest, res: Response) => {
    try {

      const { sendKey } = req.body;
      const trimmedKey = sendKey.trim();

      if (!trimmedKey.startsWith('SCT')) {
        res.status(400).json({
          error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
        });
        return;
      }

      logger.info('发送 Server酱 测试消息', { email: req.user!.email });

      const result = await sendTestMessage(trimmedKey);

      if (result.success) {
        logger.success('Server酱 测试消息发送成功');
        res.json({ success: true });
      } else {
        logger.error('Server酱 测试消息发送失败', { error: result.error });
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Server酱 测试推送失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '测试失败',
      });
    }
  }
);

/**
 * POST /api/reminder/test/dingtalk
 * 测试钉钉机器人推送
 */
router.post(
  '/test/dingtalk',
  [body('webhook').notEmpty().withMessage('Webhook 不能为空')],
  async (req: AuthRequest, res: Response) => {
    try {

      const { webhook, secret } = req.body;
      const trimmedWebhook = webhook.trim();

      if (!trimmedWebhook.startsWith('https://oapi.dingtalk.com/robot/send')) {
        res.status(400).json({
          error: '无效的 Webhook，钉钉机器人 Webhook 应以 https://oapi.dingtalk.com/robot/send 开头',
        });
        return;
      }

      logger.info('发送钉钉测试消息', { email: req.user!.email });

      // 获取网站 URL
      const siteUrl = process.env.SITE_URL || process.env.WEB_URL || 'http://localhost:5173';

      const result = await sendDingtalkTestMessage(
        trimmedWebhook,
        secret?.trim() || undefined,
        siteUrl
      );

      if (result.success) {
        logger.success('钉钉测试消息发送成功');
        res.json({ success: true });
      } else {
        logger.error('钉钉测试消息发送失败', { error: result.error });
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('钉钉测试推送失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '测试失败',
      });
    }
  }
);

export default router;
