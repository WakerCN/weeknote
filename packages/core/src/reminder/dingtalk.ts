/**
 * 钉钉机器人推送服务
 * 文档：https://open.dingtalk.com/document/robots/custom-robot-access
 */

import crypto from 'crypto';
import type { PushResult } from './types.js';

/**
 * 生成钉钉签名
 *
 * @param timestamp 时间戳（毫秒）
 * @param secret 加签密钥
 * @returns URL 编码后的签名
 */
function generateSign(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return encodeURIComponent(hmac.digest('base64'));
}

/**
 * 发送钉钉消息
 *
 * @param webhook Webhook 地址（含 access_token）
 * @param title 消息标题
 * @param content 消息内容（支持 Markdown）
 * @param secret 加签密钥（可选）
 */
export async function sendDingtalkMessage(
  webhook: string,
  title: string,
  content: string,
  secret?: string
): Promise<PushResult> {
  if (!webhook) {
    return { success: false, error: 'Webhook 未配置' };
  }

  try {
    let url = webhook;

    // 如果配置了密钥，添加签名
    if (secret) {
      const timestamp = Date.now();
      const sign = generateSign(timestamp, secret);
      const separator = webhook.includes('?') ? '&' : '?';
      url = `${webhook}${separator}timestamp=${timestamp}&sign=${sign}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title,
          text: content,
        },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP 错误: ${response.status} ${response.statusText}`,
      };
    }

    const result = (await response.json()) as {
      errcode: number;
      errmsg: string;
    };

    if (result.errcode !== 0) {
      return {
        success: false,
        error: `钉钉错误: ${result.errmsg} (${result.errcode})`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 发送钉钉测试消息
 *
 * @param webhook Webhook 地址
 * @param secret 加签密钥（可选）
 */
export async function sendDingtalkTestMessage(
  webhook: string,
  secret?: string
): Promise<PushResult> {
  const title = '🧪 WeekNote 测试消息';
  const content = `这是一条测试消息，说明你的钉钉机器人配置正确！\n\n发送时间：${new Date().toLocaleString('zh-CN')}`;

  return sendDingtalkMessage(webhook, title, content, secret);
}
