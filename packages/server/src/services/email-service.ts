/**
 * 邮件发送服务
 * 使用 SMTP 发送验证码邮件
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { createLogger } from '../logger/index.js';

const logger = createLogger('EmailService');

/**
 * 验证码类型
 */
type CodeType = 'login' | 'reset';

/**
 * 邮件服务配置
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/**
 * 获取邮件配置
 */
function getEmailConfig(): EmailConfig | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // 根据邮箱类型自动配置 SMTP 服务器
  let host = 'smtp.qq.com';
  let port = 465;
  let secure = true;

  if (user.includes('@qq.com') || user.includes('@foxmail.com')) {
    host = 'smtp.qq.com';
  } else if (user.includes('@163.com')) {
    host = 'smtp.163.com';
  } else if (user.includes('@126.com')) {
    host = 'smtp.126.com';
  } else if (user.includes('@gmail.com')) {
    host = 'smtp.gmail.com';
    port = 587;
    secure = false;
  } else if (user.includes('@outlook.com') || user.includes('@hotmail.com')) {
    host = 'smtp.office365.com';
    port = 587;
    secure = false;
  }

  // 允许通过环境变量覆盖
  if (process.env.SMTP_HOST) {
    host = process.env.SMTP_HOST;
  }
  if (process.env.SMTP_PORT) {
    port = parseInt(process.env.SMTP_PORT, 10);
  }
  if (process.env.SMTP_SECURE) {
    secure = process.env.SMTP_SECURE === 'true';
  }

  return { host, port, secure, user, pass };
}

/**
 * 创建邮件传输器
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  const config = getEmailConfig();
  if (!config) {
    logger.warn('邮件服务未配置，请设置 SMTP_USER 和 SMTP_PASS 环境变量');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

/**
 * 生成邮件 HTML 模板
 */
function generateEmailHtml(code: string, type: CodeType): string {
  const actionText = type === 'login' ? '登录' : '重置密码';
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WeekNote 验证码</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #161b22; border-radius: 12px; border: 1px solid #30363d;">
          <tr>
            <td style="padding: 40px;">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #f0f6fc;">
                  📅 WeekNote
                </h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #8b949e;">
                  AI 驱动的周报生成工具
                </p>
              </div>

              <!-- Content -->
              <div style="text-align: center;">
                <p style="margin: 0 0 20px; font-size: 16px; color: #c9d1d9;">
                  您正在${actionText} WeekNote，验证码为：
                </p>

                <!-- Code Box -->
                <div style="background-color: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                  <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #58a6ff; font-family: 'SF Mono', 'Consolas', monospace;">
                    ${code}
                  </span>
                </div>

                <p style="margin: 0 0 8px; font-size: 14px; color: #8b949e;">
                  验证码 <strong style="color: #f0f6fc;">5 分钟</strong>内有效，请勿泄露给他人。
                </p>
                <p style="margin: 0; font-size: 13px; color: #6e7681;">
                  如果这不是您本人的操作，请忽略此邮件。
                </p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #30363d; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #484f58;">
                  © ${year} WeekNote · 让周报生成更简单
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationCode(
  to: string,
  code: string,
  type: CodeType
): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    throw new Error('邮件服务未配置');
  }

  const config = getEmailConfig()!;
  const subject =
    type === 'login' ? '【WeekNote】登录验证码' : '【WeekNote】密码重置验证码';

  try {
    await transport.sendMail({
      from: `"WeekNote" <${config.user}>`,
      to,
      subject,
      html: generateEmailHtml(code, type),
    });
    logger.success('验证码邮件发送成功', { to, type });
  } catch (error) {
    logger.error(`验证码邮件发送失败 [${to}]`, error as Error);
    throw new Error('邮件发送失败，请稍后重试');
  }
}

/**
 * 验证邮件服务配置是否正确
 */
export async function verifyEmailConfig(): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    return false;
  }

  try {
    await transport.verify();
    logger.success('邮件服务配置验证成功');
    return true;
  } catch (error) {
    logger.error('邮件服务配置验证失败', error as Error);
    return false;
  }
}

/**
 * 生成6位随机验证码
 */
export function generateVerificationCode(): string {
  return Math.random().toString().slice(2, 8).padStart(6, '0');
}

/**
 * 检查邮件服务是否已配置
 */
export function isEmailServiceConfigured(): boolean {
  return getEmailConfig() !== null;
}
