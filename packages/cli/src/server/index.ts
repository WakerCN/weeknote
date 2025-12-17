/**
 * CLI 内置 Web 服务器
 * 提供 API 接口和静态文件服务
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import {
  parseDailyLog,
  validateDailyLog,
  generateReport,
  generateReportStream,
  MODEL_REGISTRY,
  DEFAULT_MODEL,
  isValidModelId,
  type ModelId,
} from '@weeknote/core';
import {
  loadConfig,
  saveConfig,
  getPlatformFromModelId,
  type CLIConfig,
} from '../config.js';
import type { Express } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 获取 API 配置
 */
function getApiConfig(overrideModelId?: string) {
  const config = loadConfig();

  // 确定使用的模型
  const modelId: ModelId =
    (overrideModelId && isValidModelId(overrideModelId)
      ? (overrideModelId as ModelId)
      : config.defaultModel) || DEFAULT_MODEL;

  const platform = getPlatformFromModelId(modelId);

  // 优先从配置文件获取 Key，其次从环境变量
  const apiKey =
    config.apiKeys?.[platform] ||
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
  };
}

/**
 * 创建 Express 应用
 */
export function createServer(): Express {
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // 静态文件服务 - 服务 Web 前端构建产物
  const webDistPath = path.resolve(__dirname, '../../web-dist');
  app.use(express.static(webDistPath));

  // ========== API 路由 ==========

  // 健康检查
  app.get('/api/health', (_req, res) => {
    const config = getApiConfig();
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
    const config = loadConfig();

    res.json({
      defaultModel: config.defaultModel || DEFAULT_MODEL,
      apiKeys: {
        siliconflow: !!config.apiKeys?.siliconflow || !!process.env.SILICONFLOW_API_KEY,
        deepseek: !!config.apiKeys?.deepseek || !!process.env.DEEPSEEK_API_KEY,
        openai: !!config.apiKeys?.openai || !!process.env.OPENAI_API_KEY,
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

      const currentConfig = loadConfig();

      // 更新配置
      const newConfig: CLIConfig = {
        ...currentConfig,
        defaultModel: defaultModel || currentConfig.defaultModel,
        apiKeys: {
          ...currentConfig.apiKeys,
          ...(apiKeys?.siliconflow && { siliconflow: apiKeys.siliconflow }),
          ...(apiKeys?.deepseek && { deepseek: apiKeys.deepseek }),
          ...(apiKeys?.openai && { openai: apiKeys.openai }),
        },
      };

      saveConfig(newConfig);

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
      const config = getApiConfig(modelId);
      if (!config) {
        return res.status(500).json({
          error: '未配置 API Key，请运行 weeknote config init 进行配置',
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

      const config = getApiConfig(modelId);
      if (!config) {
        return res.status(500).json({
          error: '未配置 API Key，请运行 weeknote config init 进行配置',
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

  // SPA 路由回退 - 所有非 API 路由返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  return app;
}

/**
 * 检查端口是否可用
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * 查找可用端口
 */
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`无法找到可用端口 (尝试了 ${startPort} - ${startPort + maxAttempts - 1})`);
}

/**
 * 启动服务器
 */
export async function startServer(preferredPort: number = 3000): Promise<number> {
  const app = createServer();
  const config = getApiConfig();

  // 自动查找可用端口
  const port = await findAvailablePort(preferredPort);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log('');
      console.log('🚀 WeekNote 服务器已启动');
      console.log(`   地址: http://localhost:${port}`);

      if (port !== preferredPort) {
        console.log(`   (端口 ${preferredPort} 被占用，自动使用 ${port})`);
      }

      console.log('');

      if (config) {
        const modelMeta = MODEL_REGISTRY[config.primary.modelId];
        console.log(`✅ 当前模型: ${modelMeta?.name || config.primary.modelId}`);
      } else {
        console.log('⚠️  未配置 API Key');
        console.log('   运行 weeknote config init 进行配置');
      }

      console.log('');
      console.log('按 Ctrl+C 停止服务器');
      console.log('');

      resolve(port);
    });

    server.on('error', (err: Error & { code?: string }) => {
      reject(err);
    });
  });
}

