/**
 * Server酱推送服务
 * 官网：https://sct.ftqq.com/
 */

import type { PushResult } from './types.js';

/**
 * Server酱 API 地址
 */
const SERVER_CHAN_API = 'https://sctapi.ftqq.com';

/**
 * 发送 Server酱消息
 *
 * @param sendKey Server酱 SendKey
 * @param title 消息标题
 * @param content 消息内容（支持 Markdown）
 */
export async function sendServerChanMessage(
  sendKey: string,
  title: string,
  content: string
): Promise<PushResult> {
  if (!sendKey) {
    return { success: false, error: 'SendKey 未配置' };
  }

  try {
    const response = await fetch(`${SERVER_CHAN_API}/${sendKey}.send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        desp: content,
        channel: '9', // 微信公众号推送
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP 错误: ${response.status} ${response.statusText}`,
      };
    }

    const result = (await response.json()) as {
      code: number;
      message: string;
      data?: { pushid: string };
    };

    if (result.code !== 0) {
      return {
        success: false,
        error: `Server酱错误: ${result.message} (${result.code})`,
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
 * 生成提醒消息内容
 */
export function generateReminderMessage(): { title: string; content: string } {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const date = now.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[now.getDay()];

  return {
    title: '📝 WeekNote 填写提醒',
    content: `Hi，现在是 **${time}**，${date} ${weekday}\n\n别忘了记录今天的工作内容哦！\n\n> 👉 [点击填写工作日志](http://localhost:5173/daily)`,
  };
}

/**
 * 发送提醒消息
 */
export async function sendReminder(sendKey: string): Promise<PushResult> {
  const { title, content } = generateReminderMessage();
  return sendServerChanMessage(sendKey, title, content);
}

/**
 * 发送测试消息
 */
export async function sendTestMessage(sendKey: string): Promise<PushResult> {
  const title = '🧪 WeekNote 测试消息';
  const content = `这是一条测试消息，说明你的 Server酱配置正确！\n\n发送时间：${new Date().toLocaleString('zh-CN')}`;

  return sendServerChanMessage(sendKey, title, content);
}



