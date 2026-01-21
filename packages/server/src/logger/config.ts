/**
 * 日志配置
 */

import type { LogConfig, LogLevel } from './types.js';

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * 解析日志级别
 * 开发环境默认 debug，生产环境默认 info
 */
function parseLogLevel(level: string | undefined, isProduction: boolean): LogLevel {
  if (level) {
    const normalized = level.toLowerCase() as LogLevel;
    return LOG_LEVELS.includes(normalized) ? normalized : 'info';
  }
  // 未设置时：开发环境默认 debug，生产环境默认 info
  return isProduction ? 'info' : 'debug';
}

/**
 * 检测是否为 CI 环境
 */
function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL
  );
}

/**
 * 获取日志配置
 */
export function getLogConfig(): LogConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCIEnv = isCI();

  return {
    level: parseLogLevel(process.env.LOG_LEVEL, isProduction),
    dir: process.env.LOG_DIR || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '10M',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10),
    isProduction,
    isCI: isCIEnv,
    enableFileLog: isProduction || process.env.LOG_FILE === 'true',
  };
}

/**
 * 日志级别优先级
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
