/**
 * 提醒配置管理
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ReminderConfig } from './types.js';

/**
 * 配置目录路径
 */
const CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const REMINDER_CONFIG_FILE = path.join(CONFIG_DIR, 'reminder.json');

/**
 * 默认配置
 */
export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: false,
  sendKey: '',
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
 * 读取提醒配置
 */
export function loadReminderConfig(): ReminderConfig {
  try {
    if (fs.existsSync(REMINDER_CONFIG_FILE)) {
      const content = fs.readFileSync(REMINDER_CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      // 合并默认配置，确保字段完整
      return {
        ...DEFAULT_REMINDER_CONFIG,
        ...config,
        schedules: {
          ...DEFAULT_REMINDER_CONFIG.schedules,
          ...config.schedules,
        },
      };
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
    schedules: {
      ...currentConfig.schedules,
      ...config.schedules,
    },
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(REMINDER_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  return newConfig;
}

/**
 * 获取配置文件路径
 */
export function getReminderConfigPath(): string {
  return REMINDER_CONFIG_FILE;
}

