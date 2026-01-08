/**
 * 提醒功能 API 路由
 */

import { Router } from 'express';
import {
  loadReminderConfig,
  saveReminderConfig,
  sendTestMessage,
  reminderScheduler,
  loadHolidayData,
  getAvailableYears,
} from '@weeknote/core';

const router: Router = Router();

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
    const { enabled, sendKey: rawSendKey, schedules } = req.body;

    // 对 SendKey 进行 trim 处理，避免空白字符导致的问题
    const sendKey =
      typeof rawSendKey === 'string' ? rawSendKey.trim() : rawSendKey;

    // 验证 SendKey 格式（Server酱的 SendKey 以 SCT 开头）
    if (sendKey && typeof sendKey === 'string' && sendKey.length > 0) {
      if (!sendKey.startsWith('SCT')) {
        return res.status(400).json({
          error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
        });
      }
    }

    // 验证提醒时间
    if (schedules) {
      const validateSchedule = (schedule: { hour?: number; minute?: number }) => {
        if (schedule.hour !== undefined && (schedule.hour < 0 || schedule.hour > 23)) {
          return false;
        }
        if (schedule.minute !== undefined && (schedule.minute < 0 || schedule.minute > 59)) {
          return false;
        }
        return true;
      };

      if (schedules.morning && !validateSchedule(schedules.morning)) {
        return res.status(400).json({ error: '无效的上午提醒时间' });
      }
      if (schedules.evening && !validateSchedule(schedules.evening)) {
        return res.status(400).json({ error: '无效的晚间提醒时间' });
      }
    }

    // 保存配置
    const newConfig = saveReminderConfig({
      enabled,
      sendKey,
      schedules,
    });

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
 * 测试推送
 * POST /api/reminder/test
 */
router.post('/test', async (req, res) => {
  try {
    const { sendKey } = req.body;

    if (!sendKey) {
      return res.status(400).json({ error: 'SendKey 不能为空' });
    }

    if (!sendKey.startsWith('SCT')) {
      return res.status(400).json({
        error: '无效的 SendKey，Server酱的 SendKey 应以 SCT 开头',
      });
    }

    console.log('[API] 发送测试消息...');

    const result = await sendTestMessage(sendKey);

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
