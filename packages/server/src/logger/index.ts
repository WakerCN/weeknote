/**
 * WeekNote 日志系统
 *
 * @example
 * ```typescript
 * import { createLogger, requestIdMiddleware, httpLoggerMiddleware } from './logger/index.js';
 *
 * // 创建模块 Logger
 * const logger = createLogger('Auth');
 * logger.info('用户登录', { email: 'user@example.com' });
 * logger.success('操作成功');
 * logger.error('操作失败', error);
 *
 * // Express 中间件
 * app.use(requestIdMiddleware());
 * app.use(httpLoggerMiddleware());
 * ```
 */

export { createLogger, type Logger } from './logger.js';
export { requestIdMiddleware, getRequestId, generateRequestId } from './request-context.js';
export { httpLoggerMiddleware } from './middleware.js';
export { getLogConfig } from './config.js';
export type { LogLevel, LogConfig, LogMeta, BoxOptions } from './types.js';
