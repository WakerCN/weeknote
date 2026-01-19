/**
 * 验证中间件 - 处理 express-validator 验证结果
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * 验证请求参数中间件
 * 检查 express-validator 的验证结果，如果有错误则返回 400 响应
 * 
 * @example
 * ```typescript
 * router.post(
 *   '/example',
 *   [body('email').isEmail()],
 *   validateRequest,
 *   async (req, res) => { ... }
 * );
 * ```
 */
export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: '参数验证失败',
      details: errors.array().map((e) => ({
        field: 'path' in e ? e.path : 'unknown',
        message: e.msg,
      })),
    });
    return;
  }
  
  next();
}
