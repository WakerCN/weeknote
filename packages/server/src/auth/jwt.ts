/**
 * JWT Token 签发和验证工具
 */

import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * JWT 配置
 */
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change-in-production';
const ACCESS_TOKEN_EXPIRES_SECONDS = 7 * 24 * 60 * 60;  // 7 天
const REFRESH_TOKEN_EXPIRES_SECONDS = 30 * 24 * 60 * 60; // 30 天

/**
 * Token 类型
 */
export type TokenType = 'access' | 'refresh';

/**
 * Token Payload 接口
 */
export interface TokenPayload {
  userId: string;
  email: string;
  type: TokenType;
  iat?: number;
  exp?: number;
}

/**
 * 解码后的 Token 数据（不含 JWT 元数据）
 */
export interface DecodedToken {
  userId: string;
  email: string;
  type: TokenType;
}

/**
 * 签发 Access Token
 * @param payload 用户信息
 * @returns JWT Token 字符串
 */
export function signAccessToken(payload: { userId: string; email: string }): string {
  const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
    ...payload,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRES_SECONDS,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * 签发 Refresh Token
 * @param payload 用户信息
 * @returns JWT Token 字符串
 */
export function signRefreshToken(payload: { userId: string; email: string }): string {
  const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
    ...payload,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRES_SECONDS,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, options);
}

/**
 * 签发 Token 对（accessToken + refreshToken）
 * @param payload 用户信息
 * @returns Token 对
 */
export function signTokenPair(payload: { userId: string; email: string }): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * 验证 Token
 * @param token JWT Token 字符串
 * @returns 解码后的 Token 数据
 * @throws 如果 Token 无效或过期
 */
export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return {
      userId: decoded.userId,
      email: decoded.email,
      type: decoded.type,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token 已过期');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token 无效');
    }
    throw error;
  }
}

/**
 * 验证 Access Token
 * @param token JWT Token 字符串
 * @returns 解码后的 Token 数据
 * @throws 如果 Token 无效、过期或类型不正确
 */
export function verifyAccessToken(token: string): DecodedToken {
  const decoded = verifyToken(token);
  if (decoded.type !== 'access') {
    throw new Error('Token 类型错误');
  }
  return decoded;
}

/**
 * 验证 Refresh Token
 * @param token JWT Token 字符串
 * @returns 解码后的 Token 数据
 * @throws 如果 Token 无效、过期或类型不正确
 */
export function verifyRefreshToken(token: string): DecodedToken {
  const decoded = verifyToken(token);
  if (decoded.type !== 'refresh') {
    throw new Error('Token 类型错误');
  }
  return decoded;
}

/**
 * 检查是否为生产环境且未配置 JWT_SECRET
 */
export function checkJwtSecretConfig(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('[Auth] ⚠️  警告: 生产环境未配置 JWT_SECRET，请设置环境变量！');
  }
}
