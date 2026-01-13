/**
 * 用户认证模块
 */

// 密码工具
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from './password.js';

// JWT 工具
export {
  signAccessToken,
  signRefreshToken,
  signTokenPair,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  checkJwtSecretConfig,
} from './jwt.js';

export type { TokenType, TokenPayload, DecodedToken } from './jwt.js';
