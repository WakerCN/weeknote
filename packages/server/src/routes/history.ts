/**
 * 生成历史 API 路由
 */

import { Router, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { GenerationHistory } from '../db/models/GenerationHistory.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router: Router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 处理验证错误
 */
function handleValidationErrors(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: '参数验证失败',
      details: errors.array().map((e) => ({
        field: 'path' in e ? e.path : 'unknown',
        message: e.msg,
      })),
    });
    return true;
  }
  return false;
}

/**
 * GET /api/history
 * 获取生成历史列表（分页）
 */
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const histories = await GenerationHistory.findByUser(userId, { limit, skip });
      const total = await GenerationHistory.countDocuments({ userId });

      res.json({
        success: true,
        histories,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + histories.length < total,
        },
      });
    } catch (error) {
      console.error('[History] 获取历史列表失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取历史失败',
      });
    }
  }
);

/**
 * GET /api/history/:id
 * 获取单条历史详情
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('无效的历史记录 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const historyId = req.params.id;

      const history = await GenerationHistory.findOne({
        _id: historyId,
        userId,
      });

      if (!history) {
        res.status(404).json({ error: '历史记录不存在' });
        return;
      }

      res.json({
        success: true,
        history,
      });
    } catch (error) {
      console.error('[History] 获取历史详情失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取历史失败',
      });
    }
  }
);

/**
 * DELETE /api/history/:id
 * 删除历史记录
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('无效的历史记录 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const historyId = req.params.id;

      const result = await GenerationHistory.deleteOne({
        _id: historyId,
        userId,
      });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: '历史记录不存在' });
        return;
      }

      console.log(`[History] 删除历史: ${req.user!.email} - ${historyId}`);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      console.error('[History] 删除历史失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '删除历史失败',
      });
    }
  }
);

export default router;
