/**
 * Prompt 模板 API 路由
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { PromptTemplate } from '../db/models/PromptTemplate.js';
import { PromptFavorite } from '../db/models/PromptFavorite.js';
import { PromptComment } from '../db/models/PromptComment.js';
import { User } from '../db/models/User.js';
import { authMiddleware, optionalAuthMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT_TEMPLATE } from '@weeknote/core';
import { createLogger } from '../logger/index.js';

const router: Router = Router();
const logger = createLogger('Prompt');

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
    logger.error('获取模板列表失败', error as Error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取模板失败',
    });
  }
});

/**
 * GET /api/prompts/public
 * 获取公开模板（Prompt 广场）
 * 支持搜索和排序
 */
router.get(
  '/public',
  optionalAuthMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
    query('search').optional().trim(),
    query('sort').optional().isIn(['popular', 'latest', 'likes']),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;
      const search = req.query.search as string | undefined;
      const sort = (req.query.sort as string) || 'popular';

      // 构建查询条件
      const queryCondition: Record<string, unknown> = { visibility: 'public' };

      // 搜索功能：按名称和描述模糊搜索
      if (search && search.trim()) {
        queryCondition.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      // 排序规则
      let sortOption: Record<string, 1 | -1> = { usageCount: -1, likeCount: -1 };
      if (sort === 'latest') {
        sortOption = { createdAt: -1 };
      } else if (sort === 'likes') {
        sortOption = { likeCount: -1, usageCount: -1 };
      }

      const templates = await PromptTemplate.find(queryCondition)
        .sort(sortOption)
        .skip(skip)
        .limit(limit);

      const total = await PromptTemplate.countDocuments(queryCondition);

      // 如果用户已登录，附加收藏状态
      let favoriteIds: string[] = [];
      if (req.user) {
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const favorites = await PromptFavorite.getFavoriteIds(userId);
        favoriteIds = favorites.map((id) => id.toString());
      }

      // 附加收藏状态到模板
      const templatesWithFavorite = templates.map((template) => ({
        ...template.toObject(),
        isFavorited: favoriteIds.includes(template._id.toString()),
      }));

      res.json({
        success: true,
        templates: templatesWithFavorite,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + templates.length < total,
        },
      });
    } catch (error) {
      logger.error('获取公开模板失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取模板失败',
      });
    }
  }
);

/**
 * GET /api/prompts/favorites
 * 获取用户收藏的模板列表
 */
router.get('/favorites', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    // 获取用户收藏的模板 ID
    const favorites = await PromptFavorite.find({ userId })
      .sort({ createdAt: -1 })
      .populate('templateId');

    // 过滤掉已删除的模板
    const templates = favorites
      .filter((f) => f.templateId)
      .map((f) => ({
        ...(f.templateId as unknown as Record<string, unknown>),
        isFavorited: true,
        favoritedAt: f.createdAt,
      }));

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    logger.error('获取收藏列表失败', error as Error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取收藏列表失败',
    });
  }
});

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
      logger.error('获取模板详情失败', error as Error);
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

      logger.success('创建模板', { email: req.user!.email, name });

      res.status(201).json({
        success: true,
        template,
      });
    } catch (error) {
      logger.error('创建模板失败', error as Error);
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

      logger.info('更新模板', { email: req.user!.email, templateId });

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      logger.error('更新模板失败', error as Error);
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

      logger.info('删除模板', { email: req.user!.email, templateId });

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除模板失败', error as Error);
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

      logger.success('激活模板', { email: req.user!.email, templateId });

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      logger.error('激活模板失败', error as Error);
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
      logger.error('点赞失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '点赞失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/favorite
 * 收藏模板
 */
router.post(
  '/:id/favorite',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = new mongoose.Types.ObjectId(req.params.id);

      const template = await PromptTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 只能收藏公开模板和系统模板
      if (template.visibility === 'private' && template.userId?.toString() !== userId.toString()) {
        res.status(403).json({ error: '无法收藏私有模板' });
        return;
      }

      // 检查是否已收藏
      const existing = await PromptFavorite.findOne({ userId, templateId });
      if (existing) {
        res.status(400).json({ error: '已收藏该模板' });
        return;
      }

      await PromptFavorite.create({ userId, templateId });

      logger.info('收藏模板', { email: req.user!.email, templateId: req.params.id });

      res.json({
        success: true,
        message: '收藏成功',
      });
    } catch (error) {
      logger.error('收藏失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '收藏失败',
      });
    }
  }
);

/**
 * DELETE /api/prompts/:id/favorite
 * 取消收藏模板
 */
router.delete(
  '/:id/favorite',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = new mongoose.Types.ObjectId(req.params.id);

      const result = await PromptFavorite.deleteOne({ userId, templateId });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: '未收藏该模板' });
        return;
      }

      logger.info('取消收藏', { email: req.user!.email, templateId: req.params.id });

      res.json({
        success: true,
        message: '取消收藏成功',
      });
    } catch (error) {
      logger.error('取消收藏失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '取消收藏失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/publish
 * 发布模板到广场
 */
router.post(
  '/:id/publish',
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

      // 只能发布自己的模板
      if (template.userId?.toString() !== userId.toString()) {
        res.status(403).json({ error: '无权发布该模板' });
        return;
      }

      // 不能发布系统模板
      if (template.visibility === 'system') {
        res.status(400).json({ error: '不能发布系统模板' });
        return;
      }

      // 已经是公开的
      if (template.visibility === 'public') {
        res.status(400).json({ error: '模板已经是公开的' });
        return;
      }

      // 获取用户信息，保存作者名称
      const user = await User.findById(userId);
      template.visibility = 'public';
      template.authorName = user?.name || '匿名用户';
      await template.save();

      logger.success('发布模板到广场', { email: req.user!.email, templateId });

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      logger.error('发布失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '发布失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/unpublish
 * 取消发布（从广场撤回）
 */
router.post(
  '/:id/unpublish',
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

      // 只能撤回自己的模板
      if (template.userId?.toString() !== userId.toString()) {
        res.status(403).json({ error: '无权操作该模板' });
        return;
      }

      if (template.visibility !== 'public') {
        res.status(400).json({ error: '模板不是公开的' });
        return;
      }

      template.visibility = 'private';
      await template.save();

      logger.info('从广场撤回模板', { email: req.user!.email, templateId });

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      logger.error('撤回失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '撤回失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/copy
 * 复制模板为新模板
 */
router.post(
  '/:id/copy',
  authMiddleware,
  [param('id').isMongoId().withMessage('无效的模板 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = new mongoose.Types.ObjectId(req.params.id);

      const sourceTemplate = await PromptTemplate.findById(templateId);

      if (!sourceTemplate) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 只能复制公开模板、系统模板、或自己的模板
      if (
        sourceTemplate.visibility === 'private' &&
        sourceTemplate.userId?.toString() !== userId.toString()
      ) {
        res.status(403).json({ error: '无权复制该模板' });
        return;
      }

      // 创建新模板
      const newTemplate = await PromptTemplate.create({
        userId,
        name: `${sourceTemplate.name} - 副本`,
        description: sourceTemplate.description,
        systemPrompt: sourceTemplate.systemPrompt,
        userPromptTemplate: sourceTemplate.userPromptTemplate,
        visibility: 'private',
        isActive: false,
        usageCount: 0,
        likeCount: 0,
        commentCount: 0,
        copiedFrom: templateId,
      });

      // 增加源模板的使用次数
      sourceTemplate.usageCount += 1;
      await sourceTemplate.save();

      logger.success('复制模板', { email: req.user!.email, sourceTemplateId: req.params.id });

      res.status(201).json({
        success: true,
        template: newTemplate,
      });
    } catch (error) {
      logger.error('复制失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '复制失败',
      });
    }
  }
);

// ========== 评论相关 API ==========

/**
 * GET /api/prompts/:id/comments
 * 获取模板的评论列表（公开访问）
 */
router.get(
  '/:id/comments',
  optionalAuthMiddleware,
  [
    param('id').isMongoId().withMessage('无效的模板 ID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const templateId = new mongoose.Types.ObjectId(req.params.id);
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      // 检查模板是否存在且可访问
      const template = await PromptTemplate.findById(templateId);
      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      if (template.visibility === 'private') {
        const userId = req.user?.userId;
        if (!userId || template.userId?.toString() !== userId) {
          res.status(403).json({ error: '无权访问该模板的评论' });
          return;
        }
      }

      // 获取顶级评论
      const comments = await PromptComment.findByTemplate(templateId, { limit, skip });
      const total = await PromptComment.getCommentCount(templateId);

      // 获取每条评论的回复
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await PromptComment.findReplies(comment._id);
          return {
            ...comment.toObject(),
            replies,
          };
        })
      );

      res.json({
        success: true,
        comments: commentsWithReplies,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + comments.length < total,
        },
      });
    } catch (error) {
      logger.error('获取评论失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取评论失败',
      });
    }
  }
);

/**
 * POST /api/prompts/:id/comments
 * 发表评论
 */
router.post(
  '/:id/comments',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('无效的模板 ID'),
    body('content').trim().isLength({ min: 1, max: 500 }).withMessage('评论内容长度为 1-500 字符'),
    body('parentId').optional().isMongoId().withMessage('无效的父评论 ID'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const templateId = new mongoose.Types.ObjectId(req.params.id);
      const { content, parentId } = req.body;

      // 检查模板是否存在
      const template = await PromptTemplate.findById(templateId);
      if (!template) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }

      // 只能评论公开模板和系统模板
      if (template.visibility === 'private' && template.userId?.toString() !== userId.toString()) {
        res.status(403).json({ error: '无法评论私有模板' });
        return;
      }

      // 如果是回复，检查父评论是否存在
      if (parentId) {
        const parentComment = await PromptComment.findById(parentId);
        if (!parentComment || parentComment.isDeleted) {
          res.status(404).json({ error: '父评论不存在' });
          return;
        }
        if (parentComment.templateId.toString() !== templateId.toString()) {
          res.status(400).json({ error: '父评论不属于该模板' });
          return;
        }
      }

      // 获取用户信息
      const user = await User.findById(userId);

      // 创建评论
      const comment = await PromptComment.create({
        templateId,
        userId,
        authorName: user?.name || '匿名用户',
        authorAvatar: user?.avatar,
        content,
        parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
        likeCount: 0,
        isDeleted: false,
      });

      // 更新模板评论数
      template.commentCount += 1;
      await template.save();

      logger.info('发表评论', { email: req.user!.email, templateId: req.params.id });

      res.status(201).json({
        success: true,
        comment,
      });
    } catch (error) {
      logger.error('发表评论失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '发表评论失败',
      });
    }
  }
);

/**
 * DELETE /api/prompts/comments/:commentId
 * 删除评论（软删除）
 */
router.delete(
  '/comments/:commentId',
  authMiddleware,
  [param('commentId').isMongoId().withMessage('无效的评论 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const commentId = new mongoose.Types.ObjectId(req.params.commentId);

      const comment = await PromptComment.findById(commentId);

      if (!comment) {
        res.status(404).json({ error: '评论不存在' });
        return;
      }

      // 只能删除自己的评论
      if (comment.userId.toString() !== userId.toString()) {
        res.status(403).json({ error: '无权删除该评论' });
        return;
      }

      // 软删除
      comment.isDeleted = true;
      await comment.save();

      // 更新模板评论数
      await PromptTemplate.findByIdAndUpdate(comment.templateId, {
        $inc: { commentCount: -1 },
      });

      logger.info('删除评论', { email: req.user!.email, commentId: req.params.commentId });

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除评论失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '删除评论失败',
      });
    }
  }
);

/**
 * POST /api/prompts/comments/:commentId/like
 * 点赞评论
 */
router.post(
  '/comments/:commentId/like',
  authMiddleware,
  [param('commentId').isMongoId().withMessage('无效的评论 ID')],
  async (req: AuthRequest, res: Response) => {
    try {
      const commentId = new mongoose.Types.ObjectId(req.params.commentId);

      const comment = await PromptComment.findById(commentId);

      if (!comment || comment.isDeleted) {
        res.status(404).json({ error: '评论不存在' });
        return;
      }

      comment.likeCount += 1;
      await comment.save();

      res.json({
        success: true,
        likeCount: comment.likeCount,
      });
    } catch (error) {
      logger.error('点赞评论失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '点赞失败',
      });
    }
  }
);

export default router;
