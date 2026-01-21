/**
 * 用户配置 API 路由
 */

import { Router, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../db/models/User.js';
import { authMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import { createLogger } from '../logger/index.js';

const router: Router = Router();
const logger = createLogger('Config');

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/config
 * 获取用户配置
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({
      success: true,
      config: user.config,
    });
  } catch (error) {
    logger.error('获取配置失败', error as Error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取配置失败',
    });
  }
});

/**
 * PUT /api/config
 * 更新用户配置
 */
router.put(
  '/',
  [
    body('defaultModel').optional().isString(),
    body('apiKeys').optional().isObject(),
    body('apiKeys.siliconflow').optional().isString(),
    body('apiKeys.deepseek').optional().isString(),
    body('apiKeys.openai').optional().isString(),
    body('apiKeys.doubao').optional().isString(),
    body('doubaoEndpoint').optional().isString(),
    body('reminderConfig').optional().isObject(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      const { defaultModel, apiKeys, doubaoEndpoint, reminderConfig } = req.body;

      // 更新配置字段
      if (defaultModel !== undefined) {
        user.config.defaultModel = defaultModel;
      }

      if (apiKeys !== undefined) {
        user.config.apiKeys = {
          ...user.config.apiKeys,
          ...apiKeys,
        };
      }

      if (doubaoEndpoint !== undefined) {
        user.config.doubaoEndpoint = doubaoEndpoint;
      }

      if (reminderConfig !== undefined) {
        user.config.reminderConfig = reminderConfig;
      }

      await user.save();

      logger.success('更新配置', { email: req.user!.email });

      res.json({
        success: true,
        config: user.config,
      });
    } catch (error) {
      logger.error('更新配置失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '更新配置失败',
      });
    }
  }
);

/**
 * DELETE /api/config/api-key/:platform
 * 删除某个平台的 API Key
 */
router.delete(
  '/api-key/:platform',
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { platform } = req.params;

      if (!['siliconflow', 'deepseek', 'openai', 'doubao'].includes(platform)) {
        res.status(400).json({ error: '无效的平台名称' });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      // 删除指定平台的 API Key
      if (user.config.apiKeys) {
        delete user.config.apiKeys[platform as keyof typeof user.config.apiKeys];
      }

      await user.save();

      logger.info('删除 API Key', { email: req.user!.email, platform });

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除 API Key 失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '删除 API Key 失败',
      });
    }
  }
);

export default router;
