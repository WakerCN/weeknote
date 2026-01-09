/**
 * 提醒配置管理
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ReminderConfig, ChannelsConfig } from './types.js';

/**
 * 配置目录路径
 */
const CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const REMINDER_CONFIG_FILE = path.join(CONFIG_DIR, 'reminder.json');

/**
 * 默认渠道配置
 */
export const DEFAULT_CHANNELS_CONFIG: ChannelsConfig = {
  dingtalk: {
    enabled: false,
    webhook: '',
    secret: '',
  },
  serverChan: {
    enabled: false,
    sendKey: '',
  },
};

/**
 * 默认配置
 */
export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: false,
  channels: DEFAULT_CHANNELS_CONFIG,
  schedules: {
    morning: { hour: 10, minute: 5, enabled: true },
    evening: { hour: 20, minute: 40, enabled: true },
  },
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
 * 旧配置格式（用于迁移）
 */
interface LegacyConfig {
  enabled?: boolean;
  sendKey?: string;
  schedules?: ReminderConfig['schedules'];
  channels?: ChannelsConfig;
  updatedAt?: string;
}

/**
 * 迁移旧配置到新格式
 */
function migrateConfig(config: LegacyConfig): ReminderConfig {
  // 如果已经有 channels 配置，说明是新格式
  if (config.channels) {
    return {
      enabled: config.enabled ?? DEFAULT_REMINDER_CONFIG.enabled,
      channels: {
        dingtalk: {
          ...DEFAULT_CHANNELS_CONFIG.dingtalk,
          ...config.channels.dingtalk,
        },
        serverChan: {
          ...DEFAULT_CHANNELS_CONFIG.serverChan,
          ...config.channels.serverChan,
        },
      },
      schedules: {
        ...DEFAULT_REMINDER_CONFIG.schedules,
        ...config.schedules,
      },
      updatedAt: config.updatedAt ?? '',
    };
  }

  // 旧格式：将 sendKey 迁移到 channels.serverChan
  const hasOldSendKey = config.sendKey && config.sendKey.length > 0;
  return {
    enabled: config.enabled ?? DEFAULT_REMINDER_CONFIG.enabled,
    channels: {
      dingtalk: { ...DEFAULT_CHANNELS_CONFIG.dingtalk },
      serverChan: {
        enabled: hasOldSendKey ? true : false,
        sendKey: config.sendKey ?? '',
      },
    },
    schedules: {
      ...DEFAULT_REMINDER_CONFIG.schedules,
      ...config.schedules,
    },
    updatedAt: config.updatedAt ?? '',
    // 保留旧字段用于兼容
    sendKey: config.sendKey,
  };
}

/**
 * 读取提醒配置
 */
export function loadReminderConfig(): ReminderConfig {
  try {
    if (fs.existsSync(REMINDER_CONFIG_FILE)) {
      const content = fs.readFileSync(REMINDER_CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content) as LegacyConfig;
      // 迁移并合并默认配置
      return migrateConfig(config);
    }
  } catch (error) {
    console.error('[Reminder] 读取配置文件失败:', error);
  }
  return { ...DEFAULT_REMINDER_CONFIG };
}

/**
 * 保存提醒配置
 */
export function saveReminderConfig(config: Partial<ReminderConfig>): ReminderConfig {
  ensureConfigDir();

  const currentConfig = loadReminderConfig();
  const newConfig: ReminderConfig = {
    ...currentConfig,
    ...config,
    channels: {
      dingtalk: {
        ...currentConfig.channels.dingtalk,
        ...config.channels?.dingtalk,
      },
      serverChan: {
        ...currentConfig.channels.serverChan,
        ...config.channels?.serverChan,
      },
    },
    schedules: {
      ...currentConfig.schedules,
      ...config.schedules,
    },
    updatedAt: new Date().toISOString(),
  };

  // 新格式不再保存 sendKey 字段
  delete newConfig.sendKey;

  fs.writeFileSync(REMINDER_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  return newConfig;
}

/**
 * 获取配置文件路径
 */
export function getReminderConfigPath(): string {
  return REMINDER_CONFIG_FILE;
}

