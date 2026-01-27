/**
 * 钉钉消息测试脚本
 * 
 * 使用方式：
 * cd packages/core
 * npx tsx scripts/test-dingtalk.ts
 * 
 * 或者指定参数：
 * npx tsx scripts/test-dingtalk.ts --webhook="你的webhook" --secret="你的secret"
 */

import {
  sendDingtalkTestMessage,
  sendDingtalkRichReminder,
  sendDingtalkActionCard,
} from '../src/reminder/dingtalk.js';
import type { ReminderMessageContext } from '../src/reminder/types.js';

// =========================================
// 配置区域 - 请填写你的钉钉机器人信息
// =========================================

// 方式1：直接在这里填写（测试用）
const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK || '你的webhook地址';
const DINGTALK_SECRET = process.env.DINGTALK_SECRET || ''; // 可选，如果配置了加签

// 网站地址
const SITE_URL = 'http://localhost:5173';

// =========================================
// 测试函数
// =========================================

/**
 * 测试1: 发送测试消息
 */
async function testBasicMessage() {
  console.log('\n📤 测试1: 发送基础测试消息...');
  
  const result = await sendDingtalkTestMessage(
    DINGTALK_WEBHOOK,
    DINGTALK_SECRET || undefined,
    SITE_URL
  );
  
  if (result.success) {
    console.log('✅ 测试消息发送成功！');
  } else {
    console.log('❌ 测试消息发送失败:', result.error);
  }
  
  return result;
}

/**
 * 测试2: 发送个性化提醒消息（模拟真实场景）
 */
async function testRichReminder() {
  console.log('\n📤 测试2: 发送个性化提醒消息...');
  
  const now = new Date();
  
  // 模拟消息上下文
  const context: ReminderMessageContext = {
    userName: '测试用户',
    time: now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    date: now.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    }),
    weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()],
    filledDays: 3,     // 已填写 3 天
    totalWorkdays: 5,  // 本周共 5 个工作日
    todayFilled: false, // 今天未填写
    siteUrl: SITE_URL,
  };
  
  const result = await sendDingtalkRichReminder(
    DINGTALK_WEBHOOK,
    context,
    DINGTALK_SECRET || undefined
  );
  
  if (result.success) {
    console.log('✅ 个性化提醒消息发送成功！');
  } else {
    console.log('❌ 个性化提醒消息发送失败:', result.error);
  }
  
  return result;
}

/**
 * 测试3: 发送自定义 ActionCard 消息
 */
async function testCustomActionCard() {
  console.log('\n📤 测试3: 发送自定义 ActionCard 消息...');
  
  const result = await sendDingtalkActionCard(
    DINGTALK_WEBHOOK,
    {
      title: '🎯 自定义测试消息',
      text: `
## 🎯 自定义 ActionCard 测试

这是一条自定义的 ActionCard 消息，用于验证消息样式。

---

### 📋 功能说明

| 功能 | 描述 |
|:----:|:----:|
| 标题 | 支持 Emoji |
| 内容 | 支持 Markdown |
| 按钮 | 支持多个 |

---

**发送时间**: ${new Date().toLocaleString('zh-CN')}
      `.trim(),
      btns: [
        { title: '🏠 首页', actionURL: `${SITE_URL}/` },
        { title: '📝 日志', actionURL: `${SITE_URL}/daily` },
      ],
      btnOrientation: '1',
    },
    DINGTALK_SECRET || undefined
  );
  
  if (result.success) {
    console.log('✅ 自定义 ActionCard 消息发送成功！');
  } else {
    console.log('❌ 自定义 ActionCard 消息发送失败:', result.error);
  }
  
  return result;
}

// =========================================
// 主函数
// =========================================

async function main() {
  console.log('='.repeat(50));
  console.log('🔔 钉钉消息测试脚本');
  console.log('='.repeat(50));
  
  // 检查 webhook 配置
  if (!DINGTALK_WEBHOOK || DINGTALK_WEBHOOK === '你的webhook地址') {
    console.log('\n⚠️  请先配置钉钉 Webhook！');
    console.log('\n配置方式:');
    console.log('1. 直接修改脚本中的 DINGTALK_WEBHOOK 变量');
    console.log('2. 或使用环境变量:');
    console.log('   DINGTALK_WEBHOOK="你的webhook" npx tsx scripts/test-dingtalk.ts');
    console.log('\n获取 Webhook:');
    console.log('1. 在钉钉群中添加自定义机器人');
    console.log('2. 复制生成的 Webhook 地址');
    process.exit(1);
  }
  
  console.log('\n📌 配置信息:');
  console.log(`   Webhook: ${DINGTALK_WEBHOOK.substring(0, 50)}...`);
  console.log(`   Secret: ${DINGTALK_SECRET ? '已配置' : '未配置'}`);
  console.log(`   Site URL: ${SITE_URL}`);
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  const testType = args.find(arg => !arg.startsWith('--')) || 'all';
  
  console.log('\n📋 可用的测试类型:');
  console.log('   1 或 basic   - 基础测试消息');
  console.log('   2 或 rich    - 个性化提醒消息');
  console.log('   3 或 custom  - 自定义 ActionCard');
  console.log('   all          - 运行所有测试（默认）');
  console.log(`\n当前测试: ${testType}`);
  
  try {
    switch (testType) {
      case '1':
      case 'basic':
        await testBasicMessage();
        break;
      case '2':
      case 'rich':
        await testRichReminder();
        break;
      case '3':
      case 'custom':
        await testCustomActionCard();
        break;
      case 'all':
      default:
        await testBasicMessage();
        await new Promise(resolve => setTimeout(resolve, 1000)); // 间隔 1 秒
        await testRichReminder();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await testCustomActionCard();
        break;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 测试完成！请检查钉钉群消息。');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ 测试出错:', error);
    process.exit(1);
  }
}

main();
