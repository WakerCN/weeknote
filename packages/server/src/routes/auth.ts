/**
 * 认证相关 API 路由
 */

import { Router, Response } from 'express';
import { body } from 'express-validator';
import { User, VerificationCode } from '../db/models/index.js';
import {
  hashPassword,
  verifyPassword,
  signTokenPair,
  signAccessToken,
  verifyRefreshToken,
} from '../auth/index.js';
import { authMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import { createLogger } from '../logger/index.js';
import {
  sendVerificationCode,
  generateVerificationCode,
  isEmailServiceConfigured,
} from '../services/email-service.js';

const router: Router = Router();
const logger = createLogger('Auth');

/** 验证码有效期（5分钟） */
const CODE_EXPIRES_MS = 5 * 60 * 1000;
/** 最大尝试次数 */
const MAX_ATTEMPTS = 5;

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

      // 检查用户是否有密码（验证码登录用户可能没有密码）
      if (!user.passwordHash) {
        res.status(401).json({ error: '该账号未设置密码，请使用验证码登录' });
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

      // 检查用户是否有密码
      if (!user.passwordHash) {
        res.status(400).json({ error: '您尚未设置密码，请使用"设置密码"功能' });
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

/**
 * POST /api/auth/code/send
 * 发送登录验证码
 */
router.post(
  '/code/send',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('邮箱不能为空')
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      // 检查邮件服务是否配置
      if (!isEmailServiceConfigured()) {
        res.status(503).json({ error: '邮件服务未配置，请联系管理员' });
        return;
      }

      // 检查发送频率限制
      const cooldownCheck = await VerificationCode.isInCooldown(email, 'login');
      if (cooldownCheck.inCooldown) {
        res.status(429).json({
          error: `请${cooldownCheck.retryAfter}秒后再试`,
          retryAfter: cooldownCheck.retryAfter,
        });
        return;
      }

      // 生成验证码
      const code = generateVerificationCode();

      // 保存验证码
      await VerificationCode.create({
        email: email.toLowerCase(),
        code,
        type: 'login',
        expiresAt: new Date(Date.now() + CODE_EXPIRES_MS),
      });

      // 发送邮件
      await sendVerificationCode(email, code, 'login');

      logger.success('登录验证码已发送', { email });

      res.json({
        success: true,
        message: '验证码已发送',
      });
    } catch (error) {
      logger.error('发送验证码失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '发送验证码失败',
      });
    }
  }
);

/**
 * POST /api/auth/code/login
 * 验证码登录（自动注册）
 */
router.post(
  '/code/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('邮箱不能为空')
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('验证码不能为空')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位')
      .isNumeric()
      .withMessage('验证码必须是数字'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, code } = req.body;

      // 查找有效的验证码
      const verification = await VerificationCode.findValidCode(email, 'login');

      if (!verification) {
        res.status(400).json({ error: '验证码错误或已过期' });
        return;
      }

      // 检查尝试次数
      if (verification.attempts >= MAX_ATTEMPTS) {
        res.status(429).json({ error: '尝试次数过多，请重新获取验证码' });
        return;
      }

      // 验证码比对
      if (verification.code !== code) {
        verification.attempts += 1;
        await verification.save();
        res.status(400).json({ error: '验证码错误' });
        return;
      }

      // 标记验证码已使用
      verification.used = true;
      await verification.save();

      // 查找或创建用户
      let user = await User.findByEmail(email);
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        // 生成随机用户名
        const randomSuffix = Math.random().toString().slice(2, 6);
        user = await User.create({
          email: email.toLowerCase(),
          name: `用户${randomSuffix}`,
          loginMethod: 'code',
          config: {},
        });
        logger.success('验证码登录创建新用户', { email });
      }

      // 更新登录时间
      user.lastLoginAt = new Date();
      await user.save();

      // 签发 Token
      const tokens = signTokenPair({
        userId: user._id.toString(),
        email: user.email,
      });

      logger.success('验证码登录成功', { email, isNewUser });

      res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isNewUser,
        },
        ...tokens,
      });
    } catch (error) {
      logger.error('验证码登录失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '验证码登录失败',
      });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * 发送密码重置验证码
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('邮箱不能为空')
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      // 检查邮件服务是否配置
      if (!isEmailServiceConfigured()) {
        res.status(503).json({ error: '邮件服务未配置，请联系管理员' });
        return;
      }

      // 检查发送频率限制
      const cooldownCheck = await VerificationCode.isInCooldown(email, 'reset');
      if (cooldownCheck.inCooldown) {
        res.status(429).json({
          error: `请${cooldownCheck.retryAfter}秒后再试`,
          retryAfter: cooldownCheck.retryAfter,
        });
        return;
      }

      // 查找用户（但不透露用户是否存在）
      const user = await User.findByEmail(email);

      // 只有用户存在时才发送邮件
      if (user) {
        const code = generateVerificationCode();

        await VerificationCode.create({
          email: email.toLowerCase(),
          code,
          type: 'reset',
          expiresAt: new Date(Date.now() + CODE_EXPIRES_MS),
        });

        await sendVerificationCode(email, code, 'reset');
        logger.success('密码重置验证码已发送', { email });
      }

      // 无论用户是否存在都返回成功（安全考虑）
      res.json({
        success: true,
        message: '如果该邮箱已注册，验证码已发送',
      });
    } catch (error) {
      logger.error('发送密码重置验证码失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '发送验证码失败',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * 使用验证码重置密码
 */
router.post(
  '/reset-password',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('邮箱不能为空')
      .isEmail()
      .withMessage('邮箱格式不正确')
      .normalizeEmail(),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('验证码不能为空')
      .isLength({ min: 6, max: 6 })
      .withMessage('验证码必须是6位')
      .isNumeric()
      .withMessage('验证码必须是数字'),
    body('newPassword')
      .isLength({ min: 6, max: 50 })
      .withMessage('密码长度需要在 6-50 个字符之间'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;

      // 查找有效的验证码
      const verification = await VerificationCode.findValidCode(email, 'reset');

      if (!verification) {
        res.status(400).json({ error: '验证码错误或已过期' });
        return;
      }

      // 检查尝试次数
      if (verification.attempts >= MAX_ATTEMPTS) {
        res.status(429).json({ error: '尝试次数过多，请重新获取验证码' });
        return;
      }

      // 验证码比对
      if (verification.code !== code) {
        verification.attempts += 1;
        await verification.save();
        res.status(400).json({ error: '验证码错误' });
        return;
      }

      // 查找用户
      const user = await User.findByEmail(email);
      if (!user) {
        res.status(400).json({ error: '用户不存在' });
        return;
      }

      // 标记验证码已使用
      verification.used = true;
      await verification.save();

      // 更新密码
      user.passwordHash = await hashPassword(newPassword);
      if (!user.loginMethod) {
        user.loginMethod = 'password';
      }
      await user.save();

      logger.success('用户重置密码成功', { email });

      res.json({
        success: true,
        message: '密码重置成功',
      });
    } catch (error) {
      logger.error('重置密码失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '重置密码失败',
      });
    }
  }
);

/**
 * PUT /api/auth/set-password
 * 为验证码登录用户设置密码
 */
router.put(
  '/set-password',
  authMiddleware,
  [
    body('newPassword')
      .isLength({ min: 6, max: 50 })
      .withMessage('密码长度需要在 6-50 个字符之间'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      // 检查用户是否已有密码
      if (user.passwordHash) {
        res.status(400).json({ error: '您已设置过密码，请使用修改密码功能' });
        return;
      }

      // 设置密码
      user.passwordHash = await hashPassword(newPassword);
      await user.save();

      logger.success('用户设置密码成功', { email: user.email });

      res.json({
        success: true,
        message: '密码设置成功',
      });
    } catch (error) {
      logger.error('设置密码失败', error as Error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '设置密码失败',
      });
    }
  }
);

export default router;
