/**
 * 请求上下文管理
 * 使用 AsyncLocalStorage 在整个请求链路中传递请求 ID
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';

interface RequestContext {
  requestId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 生成短 ID (8 位)
 */
export function generateRequestId(): string {
  return randomBytes(4).toString('hex');
}

/**
 * 获取当前请求 ID
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}

/**
 * 运行带有请求上下文的函数
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return asyncLocalStorage.run({ requestId }, fn);
}

/**
 * Express 请求 ID 中间件
 */
export function requestIdMiddleware() {
  return (
    req: { headers: Record<string, string | string[] | undefined>; requestId?: string },
    res: { setHeader: (name: string, value: string) => void },
    next: () => void
  ) => {
    // 从请求头获取或生成新的请求 ID
    const requestId =
      (req.headers['x-request-id'] as string) || generateRequestId();

    // 存储到请求对象
    req.requestId = requestId;

    // 设置响应头
    res.setHeader('X-Request-ID', requestId);

    // 在请求上下文中运行后续中间件
    runWithRequestId(requestId, () => {
      next();
    });
  };
}
