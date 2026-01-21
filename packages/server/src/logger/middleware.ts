/**
 * HTTP 日志中间件
 */

import type { Request, Response, NextFunction } from 'express';
import { createLogger } from './logger.js';
import { getRequestId } from './request-context.js';

const httpLogger = createLogger('HTTP');

/**
 * HTTP 请求/响应日志中间件
 */
export function httpLoggerMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = getRequestId() || (req as { requestId?: string }).requestId || '-';

    // 请求日志
    httpLogger.info(`← ${req.method} ${req.path}`, { requestId });

    // 响应完成后记录
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;

      if (status >= 500) {
        httpLogger.error(`→ ${status} (${duration}ms)`, { requestId });
      } else if (status >= 400) {
        httpLogger.warn(`→ ${status} (${duration}ms)`, { requestId });
      } else {
        httpLogger.success(`→ ${status} (${duration}ms)`, { requestId });
      }
    });

    next();
  };
}
