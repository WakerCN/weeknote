/**
 * 钉钉机器人推送服务
 * 文档：https://open.dingtalk.com/document/robots/custom-robot-access
 */

import crypto from 'crypto';
import type { PushResult, ReminderMessageContext } from './types.js';

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
 * 构建签名后的 URL
 */
function buildSignedUrl(webhook: string, secret?: string): string {
  if (!secret) return webhook;
  
  const timestamp = Date.now();
  const sign = generateSign(timestamp, secret);
  const separator = webhook.includes('?') ? '&' : '?';
  return `${webhook}${separator}timestamp=${timestamp}&sign=${sign}`;
}

/**
 * 发送钉钉请求
 */
async function sendDingtalkRequest(
  webhook: string,
  body: object,
  secret?: string
): Promise<PushResult> {
  if (!webhook) {
    return { success: false, error: 'Webhook 未配置' };
  }

  try {
    const url = buildSignedUrl(webhook, secret);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
 * 发送钉钉消息（Markdown 类型）
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
  return sendDingtalkRequest(
    webhook,
    {
      msgtype: 'markdown',
      markdown: {
        title,
        text: content,
      },
    },
    secret
  );
}

/**
 * ActionCard 按钮配置
 */
export interface ActionCardButton {
  /** 按钮标题 */
  title: string;
  /** 按钮跳转链接 */
  actionURL: string;
}

/**
 * ActionCard 消息配置
 */
export interface ActionCardOptions {
  /** 消息标题（会在通知中显示） */
  title: string;
  /** 消息内容（支持 Markdown） */
  text: string;
  /** 按钮列表（1个为整体跳转，多个为独立跳转） */
  btns: ActionCardButton[];
  /** 按钮排列方向：'0' 竖直，'1' 横向（默认 '1'） */
  btnOrientation?: '0' | '1';
}

/**
 * 发送钉钉 ActionCard 消息
 * 
 * @param webhook Webhook 地址（含 access_token）
 * @param options ActionCard 配置
 * @param secret 加签密钥（可选）
 */
export async function sendDingtalkActionCard(
  webhook: string,
  options: ActionCardOptions,
  secret?: string
): Promise<PushResult> {
  const { title, text, btns, btnOrientation = '1' } = options;

  // 单按钮使用整体跳转 ActionCard
  if (btns.length === 1) {
    return sendDingtalkRequest(
      webhook,
      {
        msgtype: 'actionCard',
        actionCard: {
          title,
          text,
          singleTitle: btns[0].title,
          singleURL: btns[0].actionURL,
        },
      },
      secret
    );
  }

  // 多按钮使用独立跳转 ActionCard
  return sendDingtalkRequest(
    webhook,
    {
      msgtype: 'actionCard',
      actionCard: {
        title,
        text,
        btnOrientation,
        btns: btns.map((btn) => ({
          title: btn.title,
          actionURL: btn.actionURL,
        })),
      },
    },
    secret
  );
}

/**
 * 生成个性化提醒消息内容
 */
export function generateRichReminderContent(context: ReminderMessageContext): {
  title: string;
  text: string;
  btns: ActionCardButton[];
} {
  const {
    userName,
    time,
    date,
    weekday,
    filledDays,
    totalWorkdays,
    todayFilled,
    siteUrl,
  } = context;

  // 鼓励语
  const encouragement = getEncouragement(filledDays, totalWorkdays, todayFilled);

  const title = '📝 WeekNote 填写提醒';

  // 生成状态徽章
  const statusBadge = todayFilled 
    ? '🏆 今日已完成' 
    : '⏰ 待填写';

  const text = `
# 📝 WeekNote

👋 **${userName}**，${getGreeting()}！

**📅 ${date} | ${weekday}** | **⏰ ${time}**

---

## 📊 本周进度

- 📋 已记录：**${filledDays}** / ${totalWorkdays} 天
- 📌 今日状态：${statusBadge}

${encouragement}

## 🚀 快速操作

> 📝 **[立即填写日志](${siteUrl}/daily)**`.trim();

  // 保留按钮作为备选，但主要通过 Markdown 链接操作
  const btns: ActionCardButton[] = [
    {
      title: '📝 打开 WeekNote',
      actionURL: siteUrl,
    },
  ];

  return { title, text, btns };
}

/**
 * 根据时间获取问候语
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，注意休息';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了，注意休息';
}

/**
 * 获取鼓励语
 */
function getEncouragement(
  filledDays: number,
  totalWorkdays: number,
  todayFilled: boolean
): string {
  if (todayFilled) {
    if (filledDays === totalWorkdays) {
      return '🎉 **太棒了！** 本周工作日志已全部填写完成，可以生成周报啦！';
    }
    return '👍 **做得好！** 今天已经记录完成，继续保持！';
  }

  if (filledDays === 0) {
    return '📌 **新的一周开始了！** 别忘了记录今天的工作内容哦~';
  }

  if (filledDays >= totalWorkdays - 1) {
    return '🚀 **就差一点了！** 记录今天的工作，本周就完美收官！';
  }

  return '✏️ **别忘了！** 记录今天的工作内容，让周报更完整~';
}

/**
 * 发送个性化钉钉提醒消息
 * 
 * 使用纯 Markdown 消息类型，链接可以在系统浏览器中打开
 * 
 * @param webhook Webhook 地址
 * @param context 消息上下文
 * @param secret 加签密钥（可选）
 */
export async function sendDingtalkRichReminder(
  webhook: string,
  context: ReminderMessageContext,
  secret?: string
): Promise<PushResult> {
  const { title, text } = generateRichReminderContent(context);

  // 使用纯 Markdown 消息，而非 ActionCard
  // Markdown 消息中的链接可能会在系统浏览器中打开
  return sendDingtalkMessage(webhook, title, text, secret);
}

/**
 * 发送钉钉测试消息（使用 ActionCard 样式）
 *
 * @param webhook Webhook 地址
 * @param secret 加签密钥（可选）
 * @param siteUrl 网站地址（可选）
 */
export async function sendDingtalkTestMessage(
  webhook: string,
  secret?: string,
  siteUrl?: string
): Promise<PushResult> {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const baseUrl = siteUrl || 'http://localhost:5173';
  
  const title = '🧪 WeekNote 测试消息';
  const dateStr = now.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const text = `
# 🧪 连接测试

> ✅ **恭喜！** 你的钉钉机器人配置成功！

---

## 📋 配置状态

- **Webhook**：✅ 连接正常
- **签名验证**：${secret ? '✅ 已启用' : '⚠️ 未配置（建议开启）'}

---

**⏰ ${time}** ｜ **📅 ${dateStr}**

---

## 🚀 开始使用

> 📝 **[填写今日日志](${baseUrl}/daily)**
>
> ⚙️ **[配置提醒时间](${baseUrl}/settings)**

---

💡 **提示**：配置提醒时间后，将在指定时间自动收到填写提醒
`.trim();

  // 使用纯 Markdown 消息，而非 ActionCard
  // Markdown 消息中的链接可能会在系统浏览器中打开
  return sendDingtalkMessage(webhook, title, text, secret);
}
