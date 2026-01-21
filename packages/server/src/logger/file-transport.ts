/**
 * 文件日志传输层
 * 支持日志轮转和 JSON 格式
 */

import { existsSync, mkdirSync, type WriteStream } from 'node:fs';
import * as rfs from 'rotating-file-stream';
import type { LogConfig, LogLevel } from './types.js';

interface FileTransportOptions {
  config: LogConfig;
}

interface LogEntry {
  ts: string;
  lvl: LogLevel;
  mod: string;
  msg: string;
  rid?: string;
  [key: string]: unknown;
}

/**
 * 文件日志传输层
 */
export class FileTransport {
  private appStream: WriteStream | rfs.RotatingFileStream;
  private errorStream: WriteStream | rfs.RotatingFileStream;
  private config: LogConfig;

  constructor(options: FileTransportOptions) {
    this.config = options.config;

    // 确保日志目录存在
    if (!existsSync(this.config.dir)) {
      mkdirSync(this.config.dir, { recursive: true });
    }

    // 创建应用日志流（轮转）
    this.appStream = rfs.createStream(this.getFilename('app'), {
      path: this.config.dir,
      size: this.config.maxSize as `${number}M`,
      interval: '1d',
      maxFiles: this.config.maxFiles,
    });

    // 创建错误日志流（轮转）
    this.errorStream = rfs.createStream(this.getFilename('error'), {
      path: this.config.dir,
      size: this.config.maxSize as `${number}M`,
      interval: '1d',
      maxFiles: this.config.maxFiles,
    });
  }

  /**
   * 生成文件名
   */
  private getFilename(prefix: string) {
    return (time: Date | number | null) => {
      if (!time) {
        return `${prefix}.log`;
      }
      const date = time instanceof Date ? time : new Date(time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${prefix}-${year}-${month}-${day}.log`;
    };
  }

  /**
   * 写入日志
   */
  write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    this.appStream.write(line);

    // 错误级别同时写入错误日志
    if (entry.lvl === 'error') {
      this.errorStream.write(line);
    }
  }

  /**
   * 关闭流
   */
  close(): void {
    this.appStream.end();
    this.errorStream.end();
  }
}

let fileTransportInstance: FileTransport | null = null;

/**
 * 获取文件传输层实例（单例）
 */
export function getFileTransport(config: LogConfig): FileTransport {
  if (!fileTransportInstance) {
    fileTransportInstance = new FileTransport({ config });
  }
  return fileTransportInstance;
}
