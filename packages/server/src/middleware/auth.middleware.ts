/**
 * 认证中间件
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../auth/jwt.js';

/**
 * 扩展 Express Request 类型，添加用户信息
 */
export interface AuthRequest extends Request {
  user?: DecodedToken;
}

/**
 * 从请求头中提取 Bearer Token
 * @param req Express Request
 * @returns Token 字符串或 null
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // 格式: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * 认证中间件
 * 验证请求中的 JWT Token，并将用户信息添加到 req.user
 * 如果验证失败，返回 401 错误
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token 验证失败';
    res.status(401).json({ error: message });
  }
}

/**
 * 可选认证中间件
 * 如果提供了 Token 则验证并添加用户信息，否则继续执行
 * 不会返回 401 错误
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);

  if (!token) {
    // 未提供 Token，继续执行但不设置 user
    next();
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
  } catch {
    // Token 无效，忽略错误，不设置 user
  }

  next();
}

/**
 * 创建权限检查中间件
 * @param checkFn 权限检查函数
 * @returns Express 中间件
 */
export function requireAuth(
  checkFn?: (user: DecodedToken) => boolean
): (req: AuthRequest, res: Response, next: NextFunction) => void {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: '需要登录' });
      return;
    }

    if (checkFn && !checkFn(req.user)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }

    next();
  };
}
