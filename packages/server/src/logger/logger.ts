/**
 * 日志核心实现
 */

import { getLogConfig, LOG_LEVEL_PRIORITY } from './config.js';
import { getRequestId } from './request-context.js';
import { getFileTransport } from './file-transport.js';
import type { BoxOptions, LogLevel, LogMeta } from './types.js';

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  // 前景色
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  // 亮色
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

// 日志级别配置：标签 + 颜色
const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  debug: { label: 'DEBUG', color: colors.gray },
  info: { label: 'INFO ', color: colors.cyan },
  success: { label: 'OK   ', color: colors.green },
  warn: { label: 'WARN ', color: colors.yellow },
  error: { label: 'ERROR', color: colors.red },
  start: { label: 'START', color: colors.magenta },
  ready: { label: 'READY', color: colors.brightGreen },
};

// 日志级别颜色（用于生产环境 JSON）
const LEVEL_MAP: Record<string, LogLevel> = {
  debug: 'debug',
  info: 'info',
  success: 'info',
  warn: 'warn',
  error: 'error',
  start: 'info',
  ready: 'info',
};

/**
 * 计算字符串的显示宽度（考虑中文和 emoji）
 * - ASCII 字符占 1 个宽度
 * - 中文、日文、韩文等占 2 个宽度
 * - Emoji 占 2 个宽度
 * - 变体选择符、零宽连接符等占 0 个宽度
 */
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;

    // 零宽度字符（不占显示空间）
    if (
      (code >= 0xfe00 && code <= 0xfe0f) ||   // 变体选择符
      (code >= 0x200b && code <= 0x200f) ||   // 零宽空格、零宽连接符等
      (code >= 0x2028 && code <= 0x202f) ||   // 行/段分隔符等
      code === 0xfeff                          // 零宽非断空格 (BOM)
    ) {
      continue; // 宽度 0
    }

    // 某些 emoji 在终端中只占 1 个宽度（特例）
    if (code === 0x1f5c4) {  // 🗄 文件柜 emoji
      width += 1;
      continue;
    }

    // 宽字符（占 2 个宽度）
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||   // CJK 统一汉字
      (code >= 0x3000 && code <= 0x303f) ||   // CJK 标点
      (code >= 0xff00 && code <= 0xffef) ||   // 全角字符
      (code >= 0x1f300 && code <= 0x1f9ff) || // Emoji 符号
      (code >= 0x2600 && code <= 0x26ff) ||   // 杂项符号
      (code >= 0x2700 && code <= 0x27bf) ||   // 装饰符号
      (code >= 0x1f000 && code <= 0x1ffff) || // Emoji 扩展
      (code >= 0x1f600 && code <= 0x1f64f) || // 表情符号
      (code >= 0x1f680 && code <= 0x1f6ff) || // 交通符号
      (code >= 0x1f1e0 && code <= 0x1f1ff)    // 国旗
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 按显示宽度填充字符串
 */
function padEndByWidth(str: string, targetWidth: number): string {
  const currentWidth = getDisplayWidth(str);
  const paddingNeeded = Math.max(0, targetWidth - currentWidth);
  return str + ' '.repeat(paddingNeeded);
}

/**
 * 格式化时间戳
 */
function formatTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

/**
 * 格式化模块名（固定宽度）
 */
function formatModule(module: string): string {
  return module.padEnd(10);
}

/**
 * 创建模块 Logger
 */
export function createLogger(module: string) {
  const config = getLogConfig();
  const useColors = !config.isCI && !config.isProduction;

  /**
   * 应用颜色（仅开发环境）
   */
  function colorize(text: string, color: string): string {
    return useColors ? `${color}${text}${colors.reset}` : text;
  }

  /**
   * 格式化日志消息
   * 格式: LEVEL │ HH:MM:SS │ MODULE     │ [REQ_ID] 消息 {元数据}
   * 当没有请求ID时: LEVEL │ HH:MM:SS │ MODULE     │ 消息 {元数据}
   */
  function formatMessage(
    level: string,
    message: string,
    meta?: LogMeta
  ): string {
    const { label, color } = LEVEL_CONFIG[level];
    const time = formatTime();
    const mod = formatModule(module);
    const requestId = meta?.requestId || getRequestId();

    // 过滤掉 requestId 后的其他 meta
    const otherMeta = meta ? { ...meta } : {};
    delete otherMeta.requestId;

    const metaStr =
      Object.keys(otherMeta).length > 0
        ? ` ${colors.dim}${JSON.stringify(otherMeta)}${colors.reset}`
        : '';

    // 构建各部分
    const levelPart = colorize(label, color);
    const timePart = colorize(time, colors.dim);
    const modPart = colorize(mod, colors.brightCyan);
    // 请求ID作为消息前缀，只在有值时显示
    const ridPrefix = requestId
      ? colorize(`[${requestId}] `, colors.dim)
      : '';
    const msgPart = colorize(message, color);

    // 分隔符
    const sep = colorize('│', colors.dim);

    return `${levelPart} ${sep} ${timePart} ${sep} ${modPart} ${sep} ${ridPrefix}${msgPart}${metaStr}`;
  }

  /**
   * 写入文件日志
   */
  function writeToFile(level: LogLevel, message: string, meta?: LogMeta): void {
    if (!config.enableFileLog) return;

    const transport = getFileTransport(config);
    const requestId = meta?.requestId || getRequestId();

    transport.write({
      ts: new Date().toISOString(),
      lvl: level,
      mod: module,
      msg: message,
      ...(requestId && { rid: requestId }),
      ...meta,
    });
  }

  /**
   * 通用日志方法
   */
  function log(
    level: 'debug' | 'info' | 'success' | 'warn' | 'error',
    message: string,
    metaOrError?: LogMeta | Error
  ): void {
    const fileLevel = LEVEL_MAP[level];

    let meta: LogMeta = {};
    let errorStack: string | undefined;

    if (metaOrError instanceof Error) {
      meta = { error: metaOrError.message };
      errorStack = metaOrError.stack;
    } else if (metaOrError) {
      meta = metaOrError;
    }

    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[fileLevel] < LOG_LEVEL_PRIORITY[config.level]) {
      return;
    }

    // 控制台输出
    if (config.isProduction) {
      // 生产环境：JSON 格式
      const requestId = meta.requestId || getRequestId();
      const jsonLog = {
        ts: new Date().toISOString(),
        lvl: fileLevel,
        mod: module,
        msg: message,
        ...(requestId && { rid: requestId }),
        ...meta,
        ...(errorStack && { stack: errorStack }),
      };
      console.log(JSON.stringify(jsonLog));
    } else {
      // 开发环境：表格式格式
      const formatted = formatMessage(level, message, meta);
      console.log(formatted);

      // 错误堆栈单独输出
      if (errorStack && level === 'error') {
        const stackLines = errorStack.split('\n').slice(1, 4);
        const indent = '      │          │            │ ';
        stackLines.forEach((line) => {
          console.log(
            colorize(`${indent}└─ ${line.trim()}`, colors.dim)
          );
        });
      }
    }

    // 文件输出
    writeToFile(fileLevel, message, {
      ...meta,
      ...(errorStack && { stack: errorStack }),
    });
  }

  return {
    debug: (message: string, meta?: LogMeta) => log('debug', message, meta),
    info: (message: string, meta?: LogMeta) => log('info', message, meta),
    success: (message: string, meta?: LogMeta) => log('success', message, meta),
    warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
    error: (message: string, metaOrError?: LogMeta | Error) =>
      log('error', message, metaOrError),

    /**
     * 启动 Banner
     */
    box: (options: BoxOptions) => {
      if (config.isProduction) {
        // 生产环境：简单 JSON 日志
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            lvl: 'info',
            mod: module,
            msg: options.title,
            details: options.lines,
          })
        );
        return;
      }

      const width = 60;
      const border = '─'.repeat(width);
      const empty = ' '.repeat(width);

      console.log('');
      console.log(colorize(`┌${border}┐`, colors.cyan));
      console.log(colorize(`│${empty}│`, colors.cyan));
      console.log(
        colorize('│', colors.cyan) +
          `  ${padEndByWidth(options.title, width - 2)}` +
          colorize('│', colors.cyan)
      );
      console.log(colorize(`│${empty}│`, colors.cyan));

      if (options.lines) {
        options.lines.forEach((line) => {
          console.log(
            colorize('│', colors.cyan) +
              `  ${padEndByWidth(line, width - 2)}` +
              colorize('│', colors.cyan)
          );
        });
        console.log(colorize(`│${empty}│`, colors.cyan));
      }

      console.log(colorize(`└${border}┘`, colors.cyan));
      console.log('');
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
