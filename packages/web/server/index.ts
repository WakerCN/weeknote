/**
 * WeekNote Web 服务器
 * Express 后端 API 服务
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseDailyLog,
  validateDailyLog,
  generateReport,
  generateReportStream,
  MODEL_REGISTRY,
  DEFAULT_MODEL,
  isValidModelId,
  type GeneratorConfig,
  type ModelId,
} from '@weeknote/core';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const CONFIG_FILE = path.join(CONFIG_DIR, 'web-config.json');

// 配置类型
interface WebConfig {
  defaultModel?: ModelId;
  apiKeys?: {
    siliconflow?: string;
    deepseek?: string;
    openai?: string;
  };
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 确保配置目录存在
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

// 读取配置
function loadWebConfig(): WebConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // 配置文件损坏，返回空配置
  }
  return {};
}

// 保存配置
function saveWebConfig(config: WebConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// 获取平台对应的 API Key
type Platform = 'siliconflow' | 'deepseek' | 'openai';

function getPlatformFromModelId(modelId: ModelId): Platform {
  if (modelId.startsWith('siliconflow/')) return 'siliconflow';
  if (modelId.startsWith('deepseek/')) return 'deepseek';
  return 'openai';
}

// 获取 API 配置
function getConfig(overrideModelId?: string): GeneratorConfig | null {
  const webConfig = loadWebConfig();

  // 确定使用的模型
  const modelId: ModelId =
    (overrideModelId && isValidModelId(overrideModelId)
      ? overrideModelId
      : webConfig.defaultModel) || DEFAULT_MODEL;

  const platform = getPlatformFromModelId(modelId);

  // 优先从配置文件获取 Key，其次从环境变量
  const apiKey =
    webConfig.apiKeys?.[platform] ||
    (platform === 'siliconflow'
      ? process.env.SILICONFLOW_API_KEY
      : platform === 'deepseek'
        ? process.env.DEEPSEEK_API_KEY
        : process.env.OPENAI_API_KEY);

  if (!apiKey) {
    return null;
  }

  return {
    primary: { modelId, apiKey },
    enableFallback: false,
  };
}

// 健康检查
app.get('/api/health', (_req, res) => {
  const config = getConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configured: !!config,
    model: config ? MODEL_REGISTRY[config.primary.modelId]?.name : null,
  });
});

// 获取可用模型列表
app.get('/api/models', (_req, res) => {
  const models = Object.entries(MODEL_REGISTRY).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    isFree: meta.isFree,
  }));

  res.json({ models });
});

// 获取配置
app.get('/api/config', (_req, res) => {
  const webConfig = loadWebConfig();

  res.json({
    defaultModel: webConfig.defaultModel || DEFAULT_MODEL,
    apiKeys: {
      siliconflow: !!webConfig.apiKeys?.siliconflow || !!process.env.SILICONFLOW_API_KEY,
      deepseek: !!webConfig.apiKeys?.deepseek || !!process.env.DEEPSEEK_API_KEY,
      openai: !!webConfig.apiKeys?.openai || !!process.env.OPENAI_API_KEY,
    },
  });
});

// 保存配置
app.post('/api/config', (req, res) => {
  try {
    const { defaultModel, apiKeys } = req.body;

    // 验证模型 ID
    if (defaultModel && !isValidModelId(defaultModel)) {
      return res.status(400).json({ error: '无效的模型 ID' });
    }

    const currentConfig = loadWebConfig();

    // 更新配置
    const newConfig: WebConfig = {
      ...currentConfig,
      defaultModel: defaultModel || currentConfig.defaultModel,
      apiKeys: {
        ...currentConfig.apiKeys,
        ...(apiKeys?.siliconflow && { siliconflow: apiKeys.siliconflow }),
        ...(apiKeys?.deepseek && { deepseek: apiKeys.deepseek }),
        ...(apiKeys?.openai && { openai: apiKeys.openai }),
      },
    };

    saveWebConfig(newConfig);

    console.log('[API] 配置已更新');

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 保存配置失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '保存配置失败',
    });
  }
});

// 生成周报接口
app.post('/api/generate', async (req, res) => {
  try {
    const { dailyLog, modelId } = req.body;

    if (!dailyLog || typeof dailyLog !== 'string') {
      return res.status(400).json({ error: 'Daily Log 内容不能为空' });
    }

    // 验证输入格式
    const validation = validateDailyLog(dailyLog);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 获取配置
    const config = getConfig(modelId);
    if (!config) {
      return res.status(500).json({
        error: '未配置 API Key，请在设置页面配置',
      });
    }

    console.log(`[API] 开始生成周报，模型: ${config.primary.modelId}`);

    // 解析 Daily Log
    const weeklyLog = parseDailyLog(dailyLog);
    console.log(`[API] 解析完成，共 ${weeklyLog.entries.length} 天`);

    // 生成周报
    const result = await generateReport(weeklyLog, config);

    console.log(`[API] 生成完成，使用模型: ${result.modelName}`);

    res.json({
      success: true,
      report: result.report.rawMarkdown,
      model: {
        id: result.modelId,
        name: result.modelName,
      },
    });
  } catch (error) {
    console.error('[API] 生成错误:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '生成周报失败',
    });
  }
});

// 流式生成周报接口
app.post('/api/generate/stream', async (req, res) => {
  try {
    const { dailyLog, modelId } = req.body;

    if (!dailyLog || typeof dailyLog !== 'string') {
      return res.status(400).json({ error: 'Daily Log 内容不能为空' });
    }

    const validation = validateDailyLog(dailyLog);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const config = getConfig(modelId);
    if (!config) {
      return res.status(500).json({
        error: '未配置 API Key，请在设置页面配置',
      });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const weeklyLog = parseDailyLog(dailyLog);

    console.log(`[API] 开始流式生成，模型: ${config.primary.modelId}`);

    const result = await generateReportStream(weeklyLog, config, (chunk) => {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    // 发送完成事件
    res.write(
      `data: ${JSON.stringify({
        done: true,
        model: { id: result.modelId, name: result.modelName },
      })}\n\n`
    );

    res.end();
  } catch (error) {
    console.error('[API] 流式生成错误:', error);

    // 如果还没有发送响应头，返回 JSON 错误
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : '生成失败',
      });
    } else {
      // 否则通过 SSE 发送错误
      res.write(
        `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : '生成失败',
        })}\n\n`
      );
      res.end();
    }
  }
});

app.listen(PORT, () => {
  const config = getConfig();
  console.log(`\n🚀 WeekNote API 服务器运行在 http://localhost:${PORT}`);

  if (config) {
    const modelMeta = MODEL_REGISTRY[config.primary.modelId];
    console.log(`✅ 已配置模型: ${modelMeta?.name || config.primary.modelId}`);
  } else {
    console.log(`⚠️  未配置 API Key，请在设置页面配置或设置环境变量`);
  }

  console.log('');
});
