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
import {
  loadPromptsConfig,
  getActiveTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setActiveTemplate,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
} from '../prompt-config.js';
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

  // ========== Prompt 模板 API ==========

  // 获取所有模板和激活状态
  app.get('/api/prompts', (_req, res) => {
    try {
      const config = loadPromptsConfig();
      res.json({
        activeTemplateId: config.activeTemplateId,
        templates: config.templates,
        defaults: {
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
        },
      });
    } catch (error) {
      console.error('[API] 获取模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取模板失败',
      });
    }
  });

  // 创建新模板
  app.post('/api/prompts', (req, res) => {
    try {
      const { name, description, systemPrompt, userPromptTemplate } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: '模板名称不能为空' });
      }

      if (!systemPrompt || typeof systemPrompt !== 'string') {
        return res.status(400).json({ error: '系统提示词不能为空' });
      }

      if (!userPromptTemplate || typeof userPromptTemplate !== 'string') {
        return res.status(400).json({ error: '用户提示词模板不能为空' });
      }

      // 验证用户提示词模板包含 {{dailyLog}} 占位符
      if (!userPromptTemplate.includes('{{dailyLog}}')) {
        return res.status(400).json({ error: '用户提示词模板必须包含 {{dailyLog}} 占位符' });
      }

      const template = createTemplate({
        name,
        description,
        systemPrompt,
        userPromptTemplate,
      });

      console.log(`[API] 创建模板: ${template.name} (${template.id})`);

      res.json({ success: true, template });
    } catch (error) {
      console.error('[API] 创建模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '创建模板失败',
      });
    }
  });

  // 更新模板
  app.put('/api/prompts/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, systemPrompt, userPromptTemplate } = req.body;

      // 验证用户提示词模板包含 {{dailyLog}} 占位符
      if (userPromptTemplate && !userPromptTemplate.includes('{{dailyLog}}')) {
        return res.status(400).json({ error: '用户提示词模板必须包含 {{dailyLog}} 占位符' });
      }

      const template = updateTemplate(id, {
        name,
        description,
        systemPrompt,
        userPromptTemplate,
      });

      if (!template) {
        return res.status(404).json({ error: '模板不存在' });
      }

      console.log(`[API] 更新模板: ${template.name} (${template.id})`);

      res.json({ success: true, template });
    } catch (error) {
      console.error('[API] 更新模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '更新模板失败',
      });
    }
  });

  // 删除模板
  app.delete('/api/prompts/:id', (req, res) => {
    try {
      const { id } = req.params;

      const success = deleteTemplate(id);

      if (!success) {
        return res.status(400).json({ error: '无法删除模板（可能是最后一个模板或模板不存在）' });
      }

      console.log(`[API] 删除模板: ${id}`);

      res.json({ success: true });
    } catch (error) {
      console.error('[API] 删除模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '删除模板失败',
      });
    }
  });

  // 激活模板
  app.post('/api/prompts/:id/activate', (req, res) => {
    try {
      const { id } = req.params;

      const success = setActiveTemplate(id);

      if (!success) {
        return res.status(404).json({ error: '模板不存在' });
      }

      console.log(`[API] 激活模板: ${id}`);

      res.json({ success: true });
    } catch (error) {
      console.error('[API] 激活模板失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '激活模板失败',
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

      // 获取激活的 Prompt 模板
      const activeTemplate = getActiveTemplate();

      console.log(`[API] 开始生成周报，模型: ${config.primary.modelId}，模板: ${activeTemplate.name}`);

      // 解析 Daily Log
      const weeklyLog = parseDailyLog(dailyLog);
      console.log(`[API] 解析完成，共 ${weeklyLog.entries.length} 天`);

      // 生成周报（使用自定义模板）
      const result = await generateReport(weeklyLog, config, {
        customTemplate: {
          systemPrompt: activeTemplate.systemPrompt,
          userPromptTemplate: activeTemplate.userPromptTemplate,
        },
      });

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

      // 获取激活的 Prompt 模板
      const activeTemplate = getActiveTemplate();

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const weeklyLog = parseDailyLog(dailyLog);

      console.log(`[API] 开始流式生成，模型: ${config.primary.modelId}，模板: ${activeTemplate.name}`);

      const result = await generateReportStream(
        weeklyLog,
        config,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        {
          customTemplate: {
            systemPrompt: activeTemplate.systemPrompt,
            userPromptTemplate: activeTemplate.userPromptTemplate,
          },
        }
      );

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

