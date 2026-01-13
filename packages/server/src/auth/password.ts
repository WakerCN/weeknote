/**
 * 密码加密和验证工具
 */

import bcrypt from 'bcryptjs';

/**
 * 加密轮数
 * 12 是一个安全与性能的平衡点
 */
const SALT_ROUNDS = 12;

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 存储的密码哈希
 * @returns 密码是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 验证密码强度
 * @param password 明文密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password) {
    return { valid: false, message: '密码不能为空' };
  }

  if (password.length < 6) {
    return { valid: false, message: '密码至少需要6个字符' };
  }

  if (password.length > 50) {
    return { valid: false, message: '密码不能超过50个字符' };
  }

  return { valid: true };
}
