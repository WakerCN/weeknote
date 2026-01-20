/**
 * Prompt 模板 API 路由
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { PromptTemplate } from '../db/models/PromptTemplate.js';
import { authMiddleware, optionalAuthMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT_TEMPLATE } from '@weeknote/core';

const router: Router = Router();

/**
 * GET /api/prompts
 * 获取用户的模板列表（包括私有、公开、系统模板）
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const templates = await PromptTemplate.findByUser(userId);

    // 找到当前激活的模板 ID
    const activeTemplate = templates.find((t: { isActive: boolean }) => t.isActive);
    const activeTemplateId = activeTemplate?.id || null;

    res.json({
      success: true,
      activeTemplateId,
      templates,
      defaults: {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
      },
    });
  } catch (error) {
    console.error('[Prompt] 获取模板列表失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取模板失败',
    });
  }
});

/**
 * GET /api/prompts/public
 * 获取公开模板（Prompt 广场）
 */
router.get(
  '/public',
  optionalAuthMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const templates = await PromptTemplate.findPublicTemplates({ limit, skip });
      const total = await PromptTemplate.countDocuments({ visibility: 'public' });

      res.json({
        success: true,
        templates,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + templates.length < total,
        },
      });
    } catch (error) {
      console.error('[Prompt] 获取公开模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取模板失败',
      });
    }
  }
);

/**
 * GET /api/prompts/:id
 * 获取模板详情
 */
router.get(
  '/:id',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = req.params.id;

      const template = await PromptTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 权限检查：只能查看自己的私有模板、所有公开模板和系统模板
      if (
        template.visibility === 'private' &&
        template.userId?.toString() !== userId.toString()
      ) {
        res.status(403).json({ error: '无权访问该模板' });
        return;
      }

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error('[Prompt] 获取模板详情失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取模板失败',
      });
    }
  }
);

/**
 * POST /api/prompts
 * 创建新模板
 */
router.post(
  '/',
  authMiddleware,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('模板名称长度为 1-100 字符'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('systemPrompt').notEmpty().withMessage('系统提示词不能为空'),
    body('userPromptTemplate')
      .notEmpty()
      .withMessage('用户提示词模板不能为空')
      .custom((value) => {
        if (!value.includes('{{dailyLog}}')) {
          throw new Error('用户提示词模板必须包含 {{dailyLog}} 占位符');
        }
        return true;
      }),
    body('visibility')
      .optional()
      .isIn(['private', 'public'])
      .withMessage('可见性只能是 private 或 public'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { name, description, systemPrompt, userPromptTemplate, visibility } = req.body;

      const template = await PromptTemplate.create({
        userId,
        name,
        description,
        systemPrompt,
        userPromptTemplate,
        visibility: visibility || 'private',
        isActive: false,
        usageCount: 0,
        likeCount: 0,
      });

      console.log(`[Prompt] 创建模板: ${req.user!.email} - ${name}`);

      res.status(201).json({
        success: true,
        template,
      });
    } catch (error) {
      console.error('[Prompt] 创建模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '创建模板失败',
      });
    }
  }
);

/**
 * PUT /api/prompts/:id
 * 更新模板
 */
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('无效的模板 ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('systemPrompt').optional().notEmpty(),
    body('userPromptTemplate')
      .optional()
      .notEmpty()
      .custom((value) => {
        if (value && !value.includes('{{dailyLog}}')) {
          throw new Error('用户提示词模板必须包含 {{dailyLog}} 占位符');
        }
        return true;
      }),
    body('visibility').optional().isIn(['private', 'public']),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = req.params.id;

      const template = await PromptTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 权限检查：只能修改自己的模板，不能修改系统模板
      if (template.visibility === 'system') {
        res.status(403).json({ error: '不能修改系统模板' });
        return;
      }

      if (template.userId?.toString() !== userId.toString()) {
        res.status(403).json({ error: '无权修改该模板' });
        return;
      }

      // 更新字段
      const { name, description, systemPrompt, userPromptTemplate, visibility } = req.body;
      if (name !== undefined) template.name = name;
      if (description !== undefined) template.description = description;
      if (systemPrompt !== undefined) template.systemPrompt = systemPrompt;
      if (userPromptTemplate !== undefined) template.userPromptTemplate = userPromptTemplate;
      if (visibility !== undefined) template.visibility = visibility;

      await template.save();

      console.log(`[Prompt] 更新模板: ${req.user!.email} - ${templateId}`);

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error('[Prompt] 更新模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '更新模板失败',
      });
    }
  }
);

/**
 * DELETE /api/prompts/:id
 * 删除模板
 */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = req.params.id;

      const template = await PromptTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 权限检查
      if (template.visibility === 'system') {
        res.status(403).json({ error: '不能删除系统模板' });
        return;
      }

      if (template.userId?.toString() !== userId.toString()) {
        res.status(403).json({ error: '无权删除该模板' });
        return;
      }

      await template.deleteOne();

      console.log(`[Prompt] 删除模板: ${req.user!.email} - ${templateId}`);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      console.error('[Prompt] 删除模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '删除模板失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/activate
 * 激活模板（同时取消其他模板的激活状态）
 */
router.post(
  '/:id/activate',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = req.params.id;

      const template = await PromptTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 权限检查：可以激活自己的模板、公开模板、系统模板
      if (
        template.visibility === 'private' &&
        template.userId?.toString() !== userId.toString()
      ) {
        res.status(403).json({ error: '无权激活该模板' });
        return;
      }

      // 取消该用户所有模板的激活状态
      await PromptTemplate.updateMany({ userId, isActive: true }, { isActive: false });

      // 激活当前模板
      template.isActive = true;
      await template.save();

      console.log(`[Prompt] 激活模板: ${req.user!.email} - ${templateId}`);

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error('[Prompt] 激活模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '激活模板失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/like
 * 点赞模板
 */
router.post(
  '/:id/like',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {

      const templateId = req.params.id;

      const template = await PromptTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 只能给公开模板点赞
      if (template.visibility !== 'public') {
        res.status(400).json({ error: '只能给公开模板点赞' });
        return;
      }

      template.likeCount += 1;
      await template.save();

      res.json({
        success: true,
        likeCount: template.likeCount,
      });
    } catch (error) {
      console.error('[Prompt] 点赞失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '点赞失败',
      });
    }
  }
);

export default router;
