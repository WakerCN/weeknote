/**
 * 提醒功能 API 路由
 */

import { Router } from 'express';
import {
  loadReminderConfig,
  saveReminderConfig,
  sendTestMessage,
  sendDingtalkTestMessage,
  reminderScheduler,
  loadHolidayData,
  getAvailableYears,
  generateId,
  type ScheduleTime,
  type ChannelSchedules,
  type SaveReminderConfigParams,
} from '@weeknote/core';

const router: Router = Router();

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
 * 获取提醒配置
 * GET /api/reminder
 */
router.get('/', (_req, res) => {
  try {
    const config = loadReminderConfig();
    const status = reminderScheduler.getStatus();

    // 获取当前年份的节假日数据信息
    const currentYear = new Date().getFullYear();
    const holidayData = loadHolidayData(currentYear);
    const availableYears = getAvailableYears();

    res.json({
      ...config,
      scheduler: {
        running: status.running,
      },
      holidayData: holidayData
        ? {
            year: holidayData.year,
            source: holidayData.source,
            updatedAt: holidayData.updatedAt,
            holidaysCount: holidayData.holidays.length,
            workdaysCount: holidayData.workdays.length,
          }
        : null,
      availableYears,
    });
  } catch (error) {
    console.error('[API] 获取提醒配置失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取配置失败',
    });
  }
});

/**
 * 更新提醒配置
 * PUT /api/reminder
 */
router.put('/', (req, res) => {
  try {
    const { enabled, channels } = req.body;

    // 验证渠道配置
    if (channels) {
      // 验证 Server酱 SendKey 格式
      if (channels.serverChan?.sendKey) {
        const sendKey = channels.serverChan.sendKey.trim();
        if (sendKey.length > 0 && !sendKey.startsWith('SCT')) {
          return res.status(400).json({
            error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
          });
        }
      }

      // 验证钉钉 Webhook 格式
      if (channels.dingtalk?.webhook) {
        const webhook = channels.dingtalk.webhook.trim();
        if (webhook.length > 0 && !webhook.startsWith('https://oapi.dingtalk.com/robot/send')) {
          return res.status(400).json({
            error: '无效的 Webhook，钉钉机器人 Webhook 应以 https://oapi.dingtalk.com/robot/send 开头',
          });
        }
      }

      // 验证钉钉提醒时间
      if (channels.dingtalk?.schedules) {
        const error = validateChannelSchedules(channels.dingtalk.schedules);
        if (error) {
          return res.status(400).json({ error: `钉钉提醒时间配置无效: ${error}` });
        }
      }

      // 验证 Server酱提醒时间
      if (channels.serverChan?.schedules) {
        const error = validateChannelSchedules(channels.serverChan.schedules);
        if (error) {
          return res.status(400).json({ error: `Server酱提醒时间配置无效: ${error}` });
        }
      }
    }

    // 处理渠道配置，构建更新对象
    interface ChannelUpdate {
      enabled?: boolean;
      webhook?: string;
      secret?: string;
      sendKey?: string;
      schedules?: ChannelSchedules;
    }

    let dingtalkUpdate: ChannelUpdate | undefined;
    let serverChanUpdate: ChannelUpdate | undefined;

    if (channels?.dingtalk) {
      dingtalkUpdate = {
        enabled: channels.dingtalk.enabled ?? false,
        webhook: channels.dingtalk.webhook?.trim() ?? '',
        secret: channels.dingtalk.secret?.trim() ?? '',
      };
      const schedules = processChannelSchedules(channels.dingtalk.schedules);
      if (schedules) {
        dingtalkUpdate.schedules = schedules;
      }
    }

    if (channels?.serverChan) {
      serverChanUpdate = {
        enabled: channels.serverChan.enabled ?? false,
        sendKey: channels.serverChan.sendKey?.trim() ?? '',
      };
      const schedules = processChannelSchedules(channels.serverChan.schedules);
      if (schedules) {
        serverChanUpdate.schedules = schedules;
      }
    }

    // 保存配置
    const params: SaveReminderConfigParams = {
      enabled,
      channels: {
        dingtalk: dingtalkUpdate,
        serverChan: serverChanUpdate,
      },
    };
    const newConfig = saveReminderConfig(params);

    // 重新加载调度器
    reminderScheduler.reload();

    console.log('[API] 提醒配置已更新');

    res.json({
      success: true,
      config: newConfig,
    });
  } catch (error) {
    console.error('[API] 更新提醒配置失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '保存配置失败',
    });
  }
});

/**
 * 测试 Server酱 推送
 * POST /api/reminder/test/server-chan
 */
router.post('/test/server-chan', async (req, res) => {
  try {
    const { sendKey } = req.body;

    if (!sendKey) {
      return res.status(400).json({ error: 'SendKey 不能为空' });
    }

    const trimmedKey = sendKey.trim();
    if (!trimmedKey.startsWith('SCT')) {
      return res.status(400).json({
        error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
      });
    }

    console.log('[API] 发送 Server酱 测试消息...');

    const result = await sendTestMessage(trimmedKey);

    if (result.success) {
      console.log('[API] Server酱 测试消息发送成功');
      res.json({ success: true });
    } else {
      console.error('[API] Server酱 测试消息发送失败:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] Server酱 测试推送失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '测试失败',
    });
  }
});

/**
 * 测试钉钉机器人推送
 * POST /api/reminder/test/dingtalk
 */
router.post('/test/dingtalk', async (req, res) => {
  try {
    const { webhook, secret } = req.body;

    if (!webhook) {
      return res.status(400).json({ error: 'Webhook 不能为空' });
    }

    const trimmedWebhook = webhook.trim();
    if (!trimmedWebhook.startsWith('https://oapi.dingtalk.com/robot/send')) {
      return res.status(400).json({
        error: '无效的 Webhook，钉钉机器人 Webhook 应以 https://oapi.dingtalk.com/robot/send 开头',
      });
    }

    console.log('[API] 发送钉钉测试消息...');

    const result = await sendDingtalkTestMessage(
      trimmedWebhook,
      secret?.trim() || undefined
    );

    if (result.success) {
      console.log('[API] 钉钉测试消息发送成功');
      res.json({ success: true });
    } else {
      console.error('[API] 钉钉测试消息发送失败:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] 钉钉测试推送失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '测试失败',
    });
  }
});

/**
 * 兼容旧的测试接口
 * POST /api/reminder/test
 * @deprecated 使用 /test/server-chan 或 /test/dingtalk
 */
router.post('/test', async (req, res) => {
  try {
    const { sendKey } = req.body;

    if (!sendKey) {
      return res.status(400).json({ error: 'SendKey 不能为空' });
    }

    const trimmedKey = sendKey.trim();
    if (!trimmedKey.startsWith('SCT')) {
      return res.status(400).json({
        error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
      });
    }

    console.log('[API] 发送测试消息...');

    const result = await sendTestMessage(trimmedKey);

    if (result.success) {
      console.log('[API] 测试消息发送成功');
      res.json({ success: true });
    } else {
      console.error('[API] 测试消息发送失败:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] 测试推送失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '测试失败',
    });
  }
});

export default router;
