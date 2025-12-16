/**
 * WeekNote Web 服务器
 * Express 后端 API 服务
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  parseDailyLog,
  validateDailyLog,
  generateReport,
  generateReportStream,
  MODEL_REGISTRY,
  DEFAULT_MODEL,
  type GeneratorConfig,
  type ModelId,
} from '@weeknote/core';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 获取 API 配置
function getConfig(): GeneratorConfig | null {
  const siliconflowKey = process.env.SILICONFLOW_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (siliconflowKey) {
    return {
      primary: { modelId: DEFAULT_MODEL, apiKey: siliconflowKey },
      enableFallback: false,
    };
  }

  if (deepseekKey) {
    return {
      primary: { modelId: 'deepseek/deepseek-chat', apiKey: deepseekKey },
      enableFallback: false,
    };
  }

  if (openaiKey) {
    return {
      primary: { modelId: 'openai/gpt-4o', apiKey: openaiKey },
      enableFallback: false,
    };
  }

  return null;
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
    const config = getConfig();
    if (!config) {
      return res.status(500).json({
        error: '服务器未配置 API Key，请设置 SILICONFLOW_API_KEY 环境变量',
      });
    }

    // 如果指定了模型，使用指定的模型
    if (modelId && modelId in MODEL_REGISTRY) {
      config.primary.modelId = modelId as ModelId;
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

    const config = getConfig();
    if (!config) {
      return res.status(500).json({
        error: '服务器未配置 API Key',
      });
    }

    if (modelId && modelId in MODEL_REGISTRY) {
      config.primary.modelId = modelId as ModelId;
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
    console.log(`⚠️  未配置 API Key，请设置环境变量:`);
    console.log(`   export SILICONFLOW_API_KEY=<your-key>`);
  }

  console.log('');
});
