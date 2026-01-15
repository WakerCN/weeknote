#!/usr/bin/env node

/**
 * 本地数据迁移到云端脚本
 * 
 * 使用方法：
 * 1. 先登录云端获取 token（从浏览器开发者工具的 localStorage 中获取 accessToken）
 * 2. 运行：node scripts/migrate-local-to-cloud.mjs --token <your-access-token> --api <api-url>
 * 
 * 示例：
 *   node scripts/migrate-local-to-cloud.mjs --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... --api http://localhost:3000
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// 本地数据目录
const DAILY_LOG_DIR = path.join(os.homedir(), '.weeknote', 'dailyLog');
const LOCAL_CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const LOCAL_CONFIG_FILE = path.join(LOCAL_CONFIG_DIR, 'config.json');
const LOCAL_REMINDER_FILE = path.join(LOCAL_CONFIG_DIR, 'reminder.json');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    token: '',
    apiUrl: 'http://localhost:3000',
    dryRun: false,
    syncConfig: true,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) {
      result.token = args[i + 1];
      i++;
    } else if (args[i] === '--api' && args[i + 1]) {
      result.apiUrl = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      result.dryRun = true;
    } else if (args[i] === '--skip-config') {
      result.syncConfig = false;
    }
  }

  return result;
}

function isLikelyMasked(value) {
  return typeof value === 'string' && (value.trim() === '' || value.trim() === '******');
}

function isLikelyEncrypted(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  // 仅做“保守提示”，不做误判式自动解密
  return (
    v.startsWith('enc:') ||
    v.startsWith('ENC:') ||
    v.startsWith('ENC(') ||
    v.startsWith('aes:') ||
    v.startsWith('cipher:')
  );
}

async function readJsonIfExists(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 读取本地配置（CLI 配置 + 提醒配置）
 * - CLI: ~/.weeknote/config.json
 * - Reminder: ~/.weeknote/reminder.json
 */
async function readLocalConfigBundle() {
  const cliConfig = await readJsonIfExists(LOCAL_CONFIG_FILE);
  const reminderConfig = await readJsonIfExists(LOCAL_REMINDER_FILE);

  // 规范化要上传到云端 /api/config 的 payload
  const payload = {};

  if (cliConfig && typeof cliConfig === 'object') {
    if (typeof cliConfig.defaultModel === 'string' && cliConfig.defaultModel.trim()) {
      payload.defaultModel = cliConfig.defaultModel.trim();
    }

    if (typeof cliConfig.doubaoEndpoint === 'string' && cliConfig.doubaoEndpoint.trim()) {
      payload.doubaoEndpoint = cliConfig.doubaoEndpoint.trim();
    }

    // apiKeys：仅上传非空且非脱敏值
    const keys = {};
    const apiKeys = cliConfig.apiKeys && typeof cliConfig.apiKeys === 'object' ? cliConfig.apiKeys : null;
    if (apiKeys) {
      for (const platform of ['siliconflow', 'deepseek', 'openai', 'doubao']) {
        const v = apiKeys[platform];
        if (typeof v !== 'string') continue;
        if (isLikelyMasked(v)) continue;
        if (isLikelyEncrypted(v)) {
          // 保守处理：认为无法在脚本内解密，跳过并提示
          keys[platform] = { __skipped: 'encrypted' };
          continue;
        }
        keys[platform] = v.trim();
      }
    }

    // 兼容旧版 primary
    if (cliConfig.primary && typeof cliConfig.primary === 'object') {
      const modelId = typeof cliConfig.primary.modelId === 'string' ? cliConfig.primary.modelId : '';
      const apiKey = typeof cliConfig.primary.apiKey === 'string' ? cliConfig.primary.apiKey : '';
      if (modelId && !payload.defaultModel) payload.defaultModel = modelId;
      // 无法可靠从 modelId 推断平台（不同实现可能不一致），但至少补一个 openai/siliconflow 之外会误判
      // 这里不强行塞平台，避免写错；仅当 keys 为空时，按历史默认优先 siliconflow 兜底一次
      if (apiKey && Object.keys(keys).filter((k) => keys[k] && typeof keys[k] === 'string').length === 0) {
        keys.siliconflow = apiKey.trim();
      }
    }

    // 过滤掉被标记为 skipped 的字段
    const filteredKeys = {};
    const skippedEncrypted = [];
    for (const [k, v] of Object.entries(keys)) {
      if (typeof v === 'string' && v.trim()) {
        filteredKeys[k] = v;
      } else if (v && typeof v === 'object' && v.__skipped === 'encrypted') {
        skippedEncrypted.push(k);
      }
    }

    if (Object.keys(filteredKeys).length > 0) {
      payload.apiKeys = filteredKeys;
    }

    payload.__meta = {
      hasCliConfig: true,
      skippedEncryptedPlatforms: skippedEncrypted,
    };
  } else {
    payload.__meta = { hasCliConfig: false, skippedEncryptedPlatforms: [] };
  }

  if (reminderConfig && typeof reminderConfig === 'object') {
    payload.reminderConfig = reminderConfig;
    payload.__meta = {
      ...(payload.__meta || {}),
      hasReminderConfig: true,
    };
  } else {
    payload.__meta = {
      ...(payload.__meta || {}),
      hasReminderConfig: false,
    };
  }

  return { cliConfig, reminderConfig, payload };
}

async function uploadConfig(apiUrl, token, payload) {
  const url = `${apiUrl}/api/config`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`配置同步失败 (${response.status}): ${error}`);
  }

  return await response.json();
}

// 读取本地所有周文件
async function readLocalData() {
  const files = await fs.readdir(DAILY_LOG_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  
  const allRecords = [];
  
  for (const file of jsonFiles) {
    const filePath = path.join(DAILY_LOG_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const weekData = JSON.parse(content);
    
    console.log(`📂 读取文件: ${file}`);
    
    // 提取每天的记录
    for (const [date, record] of Object.entries(weekData.days)) {
      allRecords.push({
        date,
        dayOfWeek: record.dayOfWeek,
        plan: record.plan || '',
        result: record.result || '',
        issues: record.issues || '',
        notes: record.notes || '',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
  }
  
  // 按日期排序
  allRecords.sort((a, b) => a.date.localeCompare(b.date));
  
  return allRecords;
}

// 上传单条记录到云端
async function uploadRecord(apiUrl, token, record) {
  const url = `${apiUrl}/api/daily-logs/day/${record.date}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      dayOfWeek: record.dayOfWeek,
      plan: record.plan,
      result: record.result,
      issues: record.issues,
      notes: record.notes,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`上传失败 (${response.status}): ${error}`);
  }

  return await response.json();
}

// 主函数
async function main() {
  const args = parseArgs();

  console.log('');
  console.log('='.repeat(60));
  console.log('  WeekNote 本地数据迁移工具');
  console.log('='.repeat(60));
  console.log('');

  // 检查参数
  if (!args.token) {
    console.log('❌ 错误：请提供 access token');
    console.log('');
    console.log('使用方法：');
    console.log('  node scripts/migrate-local-to-cloud.mjs --token <your-access-token> [--api <api-url>] [--dry-run] [--skip-config]');
    console.log('');
    console.log('参数说明：');
    console.log('  --token    必需，从浏览器 localStorage 中获取的 accessToken');
    console.log('  --api      可选，API 地址，默认 http://localhost:3000');
    console.log('  --dry-run  可选，仅预览不执行上传');
    console.log('  --skip-config  可选，跳过同步本地配置（API Key / 默认模型 / 提醒设置等）');
    console.log('');
    console.log('获取 token 的方法：');
    console.log('  1. 在浏览器中登录云端版本');
    console.log('  2. 打开开发者工具 (F12)');
    console.log('  3. 在 Console 中输入: localStorage.getItem("accessToken")');
    console.log('  4. 复制返回的 token 值（去掉引号）');
    console.log('');
    process.exit(1);
  }

  console.log(`📍 本地数据目录: ${DAILY_LOG_DIR}`);
  console.log(`🌐 云端 API 地址: ${args.apiUrl}`);
  console.log(`🔑 Token: ${args.token.slice(0, 20)}...`);
  if (args.dryRun) {
    console.log('⚠️  Dry Run 模式：仅预览，不执行上传');
  }
  if (args.syncConfig) {
    console.log(`⚙️  配置同步: 开启（可用 --skip-config 关闭）`);
  } else {
    console.log('⚙️  配置同步: 关闭');
  }
  console.log('');

  // 读取并预览本地配置
  if (args.syncConfig) {
    console.log('⚙️  读取本地配置...');
    const bundle = await readLocalConfigBundle();
    const meta = bundle.payload.__meta || {};

    console.log(`   - CLI 配置文件: ${LOCAL_CONFIG_FILE} ${meta.hasCliConfig ? '✅' : '⚠️ 未找到/无法解析'}`);
    console.log(`   - 提醒配置文件: ${LOCAL_REMINDER_FILE} ${meta.hasReminderConfig ? '✅' : '⚠️ 未找到/无法解析'}`);

    // 只打印“摘要”，避免泄露密钥
    const hasApiKeys = !!bundle.payload.apiKeys && Object.keys(bundle.payload.apiKeys).length > 0;
    const platforms = hasApiKeys ? Object.keys(bundle.payload.apiKeys) : [];
    const skipped = Array.isArray(meta.skippedEncryptedPlatforms) ? meta.skippedEncryptedPlatforms : [];
    console.log(`   - 默认模型: ${bundle.payload.defaultModel || '(未配置/将不上传)'}`);
    console.log(`   - 豆包接入点: ${bundle.payload.doubaoEndpoint || '(未配置/将不上传)'}`);
    console.log(`   - API Key 将上传的平台: ${platforms.length > 0 ? platforms.join(', ') : '(无/将不上传)'}`);
    if (skipped.length > 0) {
      console.log(`   - ⚠️ 检测到疑似加密的 Key，已跳过平台: ${skipped.join(', ')}`);
      console.log('     （如需同步加密 Key，需要提供解密方式/密钥；当前脚本不会擅自尝试解密）');
    }
    console.log('');

    if (!args.dryRun) {
      // 同步配置到云端
      console.log('☁️  同步配置到云端...');
      const payloadToUpload = { ...bundle.payload };
      // 内部 meta 不上传到云端
      delete payloadToUpload.__meta;

      // 如果 payload 为空（没有任何字段），就跳过
      const hasAnyField =
        payloadToUpload.defaultModel !== undefined ||
        payloadToUpload.doubaoEndpoint !== undefined ||
        payloadToUpload.apiKeys !== undefined ||
        payloadToUpload.reminderConfig !== undefined;

      if (!hasAnyField) {
        console.log('   ⚠️ 未发现可同步的配置字段，跳过配置同步');
      } else {
        await uploadConfig(args.apiUrl, args.token, payloadToUpload);
        console.log('   ✅ 配置同步成功（云端返回会脱敏 API Key）');
      }
      console.log('');
    }
  }

  // 检查本地目录是否存在
  try {
    await fs.access(DAILY_LOG_DIR);
  } catch {
    console.log('❌ 错误：本地数据目录不存在');
    console.log(`   路径: ${DAILY_LOG_DIR}`);
    process.exit(1);
  }

  // 读取本地数据
  console.log('📖 读取本地数据...');
  const records = await readLocalData();
  console.log(`   找到 ${records.length} 条记录`);
  console.log('');

  if (records.length === 0) {
    console.log('✅ 没有需要迁移的数据');
    return;
  }

  // 显示预览
  console.log('📋 待迁移记录：');
  console.log('-'.repeat(60));
  for (const record of records) {
    const hasContent = record.plan || record.result || record.issues || record.notes;
    const status = hasContent ? '📝' : '📭';
    console.log(`   ${status} ${record.date} (${record.dayOfWeek})`);
  }
  console.log('-'.repeat(60));
  console.log('');

  if (args.dryRun) {
    console.log('✅ Dry Run 完成，未执行实际上传');
    return;
  }

  // 确认上传
  console.log('⏳ 开始上传...');
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    try {
      await uploadRecord(args.apiUrl, args.token, record);
      console.log(`   ✅ ${record.date} 上传成功`);
      successCount++;
    } catch (error) {
      console.log(`   ❌ ${record.date} 上传失败: ${error.message}`);
      failCount++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`  迁移完成！成功 ${successCount} 条，失败 ${failCount} 条`);
  console.log('='.repeat(60));
  console.log('');
}

main().catch((error) => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
