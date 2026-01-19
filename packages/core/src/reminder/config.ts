/**
 * 提醒配置管理
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type {
  ReminderConfig,
  ChannelsConfig,
  ChannelSchedules,
  SaveReminderConfigParams,
} from './types.js';

/**
 * 配置目录路径
 */
const CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const REMINDER_CONFIG_FILE = path.join(CONFIG_DIR, 'reminder.json');

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 默认提醒时间（每个渠道独立）
 */
export const DEFAULT_CHANNEL_SCHEDULES: ChannelSchedules = {
  times: [
    { id: 'default-morning', hour: 10, minute: 5, enabled: true, label: '上午提醒' },
    { id: 'default-evening', hour: 20, minute: 40, enabled: true, label: '晚间提醒' },
  ],
};

/**
 * 默认渠道配置
 */
export const DEFAULT_CHANNELS_CONFIG: ChannelsConfig = {
  dingtalk: {
    enabled: false,
    webhook: '',
    secret: '',
    schedules: { ...DEFAULT_CHANNEL_SCHEDULES, times: [...DEFAULT_CHANNEL_SCHEDULES.times] },
  },
  serverChan: {
    enabled: false,
    sendKey: '',
    schedules: { ...DEFAULT_CHANNEL_SCHEDULES, times: [...DEFAULT_CHANNEL_SCHEDULES.times] },
  },
};

/**
 * 默认配置
 */
export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: false,
  channels: DEFAULT_CHANNELS_CONFIG,
  updatedAt: '',
};

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取提醒配置
 */
export function loadReminderConfig(): ReminderConfig {
  try {
    if (fs.existsSync(REMINDER_CONFIG_FILE)) {
      const content = fs.readFileSync(REMINDER_CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content) as ReminderConfig;
      
      // 合并默认配置，确保所有字段存在
      return {
        enabled: config.enabled ?? DEFAULT_REMINDER_CONFIG.enabled,
        channels: {
          dingtalk: {
            enabled: config.channels?.dingtalk?.enabled ?? false,
            webhook: config.channels?.dingtalk?.webhook ?? '',
            secret: config.channels?.dingtalk?.secret ?? '',
            schedules: config.channels?.dingtalk?.schedules ?? DEFAULT_CHANNEL_SCHEDULES,
          },
          serverChan: {
            enabled: config.channels?.serverChan?.enabled ?? false,
            sendKey: config.channels?.serverChan?.sendKey ?? '',
            schedules: config.channels?.serverChan?.schedules ?? DEFAULT_CHANNEL_SCHEDULES,
          },
        },
        updatedAt: config.updatedAt ?? '',
      };
    }
  } catch (error) {
    console.error('[Reminder] 读取配置文件失败:', error);
  }
  // 返回深拷贝的默认配置
  return JSON.parse(JSON.stringify(DEFAULT_REMINDER_CONFIG));
}

/**
 * 保存提醒配置
 */
export function saveReminderConfig(config: SaveReminderConfigParams): ReminderConfig {
  ensureConfigDir();

  const currentConfig = loadReminderConfig();
  
  // 合并渠道配置
  const mergeChannelConfig = <T extends { schedules: ChannelSchedules }>(
    current: T,
    update: Partial<T> | undefined
  ): T => {
    if (!update) return current;
    return {
      ...current,
      ...update,
      schedules: update.schedules ?? current.schedules,
    };
  };

  const newConfig: ReminderConfig = {
    ...currentConfig,
    enabled: config.enabled ?? currentConfig.enabled,
    channels: {
      dingtalk: mergeChannelConfig(currentConfig.channels.dingtalk, config.channels?.dingtalk),
      serverChan: mergeChannelConfig(currentConfig.channels.serverChan, config.channels?.serverChan),
    },
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(REMINDER_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  return newConfig;
}

/**
 * 为时间点生成唯一 ID（导出供 API 使用）
 */
export { generateId };

/**
 * 获取配置文件路径
 */
export function getReminderConfigPath(): string {
  return REMINDER_CONFIG_FILE;
}

