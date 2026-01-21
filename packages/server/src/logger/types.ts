/**
 * 日志系统类型定义
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogConfig {
  /** 日志级别 */
  level: LogLevel;
  /** 日志目录 */
  dir: string;
  /** 单文件最大大小 */
  maxSize: string;
  /** 保留文件数量（天数） */
  maxFiles: number;
  /** 是否为生产环境 */
  isProduction: boolean;
  /** 是否为 CI 环境 */
  isCI: boolean;
  /** 是否启用文件日志 */
  enableFileLog: boolean;
}

export interface LogMeta {
  /** 请求 ID */
  requestId?: string;
  /** 其他元数据 */
  [key: string]: unknown;
}

export interface BoxOptions {
  /** 标题 */
  title: string;
  /** 内容行 */
  lines?: string[];
}

export interface HttpLogMeta {
  method: string;
  path: string;
  status?: number;
  duration?: number;
  requestId: string;
}
