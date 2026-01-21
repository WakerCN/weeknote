/**
 * 认证相关 API 路由
 */

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { User } from '../db/models/User.js';
import {
  hashPassword,
  verifyPassword,
  signTokenPair,
  signAccessToken,
  verifyRefreshToken,
} from '../auth/index.js';
import { authMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import { createLogger } from '../logger/index.js';

const router: Router = Router();
const logger = createLogger('Auth');

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6, max: 50 })
      .withMessage('密码长度需要在 6-50 个字符之间'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('用户名长度需要在 1-50 个字符之间'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {

      const { email, password, name } = req.body;

      // 检查邮箱是否已存在
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: '该邮箱已被注册' });
        return;
      }

      // 加密密码
      const passwordHash = await hashPassword(password);

      // 创建用户
      const user = await User.create({
        email: email.toLowerCase(),
        passwordHash,
        name,
        config: {},
      });

      // 签发 Token
      const tokens = signTokenPair({
        userId: user._id.toString(),
        email: user.email,
      });

      logger.success('新用户注册', { email: user.email });

      res.status(201).json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      });
    } catch (error) {
      logger.error('注册失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '注册失败',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, password } = req.body;

      // 查找用户
      const user = await User.findByEmail(email);
      if (!user) {
        // 安全考虑：不透露是邮箱不存在还是密码错误
        res.status(401).json({ error: '邮箱或密码错误' });
        return;
      }

      // 验证密码
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: '邮箱或密码错误' });
        return;
      }

      // 更新最后登录时间
      user.lastLoginAt = new Date();
      await user.save();

      // 签发 Token
      const tokens = signTokenPair({
        userId: user._id.toString(),
        email: user.email,
      });

      logger.success('用户登录', { email: user.email });

      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      });
    } catch (error) {
      logger.error('登录失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '登录失败',
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * 刷新 Access Token
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('刷新令牌不能为空'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { refreshToken } = req.body;

      // 验证 Refresh Token
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch {
        res.status(401).json({ error: '刷新令牌无效或已过期' });
        return;
      }

      // 检查用户是否存在
      const user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({ error: '用户不存在' });
        return;
      }

      // 签发新的 Access Token
      const accessToken = signAccessToken({
        userId: user._id.toString(),
        email: user.email,
      });

      res.json({
        success: true,
        accessToken,
      });
    } catch (error) {
      logger.error('Token 刷新失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Token 刷新失败',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error('获取用户信息失败', error as Error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取用户信息失败',
    });
  }
});

/**
 * PUT /api/auth/me
 * 更新当前用户信息
 */
router.put(
  '/me',
  authMiddleware,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('用户名长度需要在 1-50 个字符之间'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('头像必须是有效的 URL'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { name, avatar } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      // 更新字段
      if (name !== undefined) user.name = name;
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();

      res.json({
        success: true,
        user: user.toJSON(),
      });
    } catch (error) {
      logger.error('更新用户信息失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '更新用户信息失败',
      });
    }
  }
);

/**
 * PUT /api/auth/password
 * 修改密码
 */
router.put(
  '/password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('当前密码不能为空'),
    body('newPassword')
      .isLength({ min: 6, max: 50 })
      .withMessage('新密码长度需要在 6-50 个字符之间'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      // 验证当前密码
      const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        res.status(400).json({ error: '当前密码错误' });
        return;
      }

      // 更新密码
      user.passwordHash = await hashPassword(newPassword);
      await user.save();

      logger.success('用户修改密码', { email: user.email });

      res.json({
        success: true,
        message: '密码修改成功',
      });
    } catch (error) {
      logger.error('修改密码失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '修改密码失败',
      });
    }
  }
);

export default router;
