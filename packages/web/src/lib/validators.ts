/**
 * 表单校验工具函数
 */

/** 邮箱正则表达式 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 验证码正则表达式（6位数字） */
export const CODE_REGEX = /^\d{6}$/;

/**
 * 校验邮箱格式
 * @returns 错误信息，空字符串表示通过
 */
export function validateEmail(email: string): string {
  if (!email) {
    return '请输入邮箱';
  }
  if (!EMAIL_REGEX.test(email)) {
    return '邮箱格式不正确';
  }
  return '';
}

/**
 * 校验验证码格式
 * @returns 错误信息，空字符串表示通过
 */
export function validateCode(code: string): string {
  if (!code) {
    return '请输入验证码';
  }
  if (!CODE_REGEX.test(code)) {
    return '验证码必须是6位数字';
  }
  return '';
}

/**
 * 校验密码格式
 * @returns 错误信息，空字符串表示通过
 */
export function validatePassword(password: string): string {
  if (!password) {
    return '请输入密码';
  }
  if (password.length < 6) {
    return '密码至少需要6个字符';
  }
  if (password.length > 50) {
    return '密码不能超过50个字符';
  }
  return '';
}

/**
 * 校验确认密码
 * @returns 错误信息，空字符串表示通过
 */
export function validateConfirmPassword(password: string, confirmPassword: string): string {
  if (!confirmPassword) {
    return '请确认密码';
  }
  if (password !== confirmPassword) {
    return '两次输入的密码不一致';
  }
  return '';
}

/**
 * 校验用户名格式
 * @returns 错误信息，空字符串表示通过
 */
export function validateName(name: string): string {
  if (!name) {
    return '请输入用户名';
  }
  if (name.length > 50) {
    return '用户名不能超过50个字符';
  }
  return '';
}

/**
 * 隐藏邮箱中间部分
 * user@example.com → use***@example.com
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  if (local.length <= 3) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}
