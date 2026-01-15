/**
 * 周报生成 API 路由
 */

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { DailyLog } from '../db/models/DailyLog.js';
import { GenerationHistory } from '../db/models/GenerationHistory.js';
import { User } from '../db/models/User.js';
import { PromptTemplate } from '../db/models/PromptTemplate.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import {
  parseDailyLog,
  validateDailyLog,
  generateReport,
  generateReportStream,
  isReasoningModel,
  type GeneratorConfig,
  type StreamCallbacks,
  type ValidationWarning,
} from '@weeknote/core';

const router: Router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * 处理验证错误
 */
function handleValidationErrors(req: AuthRequest, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: '参数验证失败',
      details: errors.array().map((e) => ({
        field: 'path' in e ? e.path : 'unknown',
        message: e.msg,
      })),
    });
    return true;
  }
  return false;
}

/**
 * 将 Daily Log 记录格式化为文本
 */
function formatDailyLogsToText(logs: any[]): string {
  const lines: string[] = [];

  for (const log of logs) {
    lines.push(`${log.date} | ${log.dayOfWeek}`);
    lines.push('Plan');
    if (log.plan.trim()) {
      lines.push(log.plan.trim());
    }
    lines.push('');

    lines.push('Result');
    if (log.result.trim()) {
      lines.push(log.result.trim());
    }
    lines.push('');

    lines.push('Issues');
    if (log.issues.trim()) {
      lines.push(log.issues.trim());
    }
    lines.push('');

    lines.push('Notes');
    if (log.notes.trim()) {
      lines.push(log.notes.trim());
    }
    lines.push('');
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * POST /api/generate
 * 生成周报（非流式）
 */
router.post(
  '/',
  [
    body('startDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('开始日期格式应为 YYYY-MM-DD'),
    body('endDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('结束日期格式应为 YYYY-MM-DD'),
    body('modelId').optional().isString().withMessage('模型 ID 必须是字符串'),
    body('promptTemplateId')
      .optional()
      .isMongoId()
      .withMessage('Prompt 模板 ID 格式不正确'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { startDate, endDate, modelId, promptTemplateId } = req.body;

      // 验证日期范围
      if (startDate > endDate) {
        res.status(400).json({ error: '开始日期不能晚于结束日期' });
        return;
      }

      // 获取用户配置
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: '用户不存在' });
        return;
      }

      // 获取 Daily Log
      const logs = await DailyLog.findByUserAndDateRange(userId, startDate, endDate);

      if (logs.length === 0) {
        res.status(400).json({ error: '该时间段没有记录，无法生成周报' });
        return;
      }

      // 格式化为文本
      const inputText = formatDailyLogsToText(logs);

      // 解析为 WeeklyLog
      const weeklyLog = parseDailyLog(inputText);

      // 获取 Prompt 模板
      let customTemplate;
      let usedTemplateName = 'Default';
      let usedTemplateId;

      if (promptTemplateId) {
        const template = await PromptTemplate.findById(promptTemplateId);
        if (template) {
          customTemplate = {
            systemPrompt: template.systemPrompt,
            userPromptTemplate: template.userPromptTemplate,
          };
          usedTemplateName = template.name;
          usedTemplateId = template._id;
        }
      } else {
        // 使用用户激活的模板
        const activeTemplate = await PromptTemplate.findActiveByUser(userId);
        if (activeTemplate) {
          customTemplate = {
            systemPrompt: activeTemplate.systemPrompt,
            userPromptTemplate: activeTemplate.userPromptTemplate,
          };
          usedTemplateName = activeTemplate.name;
          usedTemplateId = activeTemplate._id;
        }
      }

      // 获取使用的模型 ID
      const usedModelId = modelId || user.config.defaultModel;
      if (!usedModelId) {
        res.status(400).json({ error: '未配置默认模型，请先在设置中配置 API Key 和模型' });
        return;
      }

      // 获取对应的 API Key（模型 ID 格式: platform/model-name）
      const apiKeys = user.config.apiKeys;
      const platform = usedModelId.split('/')[0] as 'siliconflow' | 'deepseek' | 'openai' | 'doubao';
      const apiKey = apiKeys?.[platform];

      if (!apiKey) {
        res.status(400).json({ error: `未配置 ${platform} 的 API Key，请先在设置中配置` });
        return;
      }

      // 构建 GeneratorConfig
      const generatorConfig: GeneratorConfig = {
        primary: {
          modelId: usedModelId as any,
          apiKey,
          baseUrl: user.config.doubaoEndpoint || undefined,
        },
      };

      // 调用生成器
      const result = await generateReport(weeklyLog, generatorConfig, {
        customTemplate,
      });

      // 保存生成历史
      const history = await GenerationHistory.create({
        userId,
        weekStart: startDate,
        weekEnd: endDate,
        inputText,
        outputMarkdown: result.report.rawMarkdown,
        modelId: result.modelId,
        modelName: result.modelName,
        promptTemplateId: usedTemplateId,
        promptTemplateName: usedTemplateName,
        generatedAt: new Date(),
      });

      console.log(`[Generate] 生成周报: ${req.user!.email} - ${startDate} ~ ${endDate} - ${result.modelId}`);

      res.json({
        success: true,
        report: result.report.rawMarkdown,
        historyId: history._id,
        model: {
          id: result.modelId,
          name: result.modelName,
        },
      });
    } catch (error) {
      console.error('[Generate] 生成周报失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '生成周报失败',
      });
    }
  }
);

/**
 * 从模型 ID 获取平台
 */
function getPlatformFromModelId(modelId: string): 'siliconflow' | 'deepseek' | 'openai' | 'doubao' {
  const platform = modelId.split('/')[0];
  if (['siliconflow', 'deepseek', 'openai', 'doubao'].includes(platform)) {
    return platform as 'siliconflow' | 'deepseek' | 'openai' | 'doubao';
  }
  return 'siliconflow'; // 默认
}

/**
 * POST /api/generate/stream
 * 生成周报（流式）
 */
router.post('/stream', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const { dailyLog, modelId, thinkingMode } = req.body;

    // 验证 dailyLog
    if (!dailyLog || typeof dailyLog !== 'string') {
      res.status(400).json({ error: 'Daily Log 内容不能为空' });
      return;
    }

    // 验证输入格式（软校验）
    const validation = validateDailyLog(dailyLog);
    if (validation.status === 'error') {
      res.status(400).json({ error: validation.error });
      return;
    }

    // 收集警告信息
    const warnings: ValidationWarning[] = validation.warnings || [];

    // 获取用户配置
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    // 获取使用的模型 ID
    const usedModelId = modelId || user.config.defaultModel;
    if (!usedModelId) {
      res.status(400).json({ error: '未配置默认模型，请先在设置中配置 API Key 和模型' });
      return;
    }

    // 获取对应的 API Key
    const apiKeys = user.config.apiKeys;
    const platform = getPlatformFromModelId(usedModelId);
    const apiKey = apiKeys?.[platform];

    if (!apiKey) {
      res.status(400).json({ error: `未配置 ${platform} 的 API Key，请先在设置中配置` });
      return;
    }

    // 获取 Prompt 模板
    let customTemplate;
    const activeTemplate = await PromptTemplate.findActiveByUser(userId);
    if (activeTemplate) {
      customTemplate = {
        systemPrompt: activeTemplate.systemPrompt,
        userPromptTemplate: activeTemplate.userPromptTemplate,
      };
    }

    // 构建 GeneratorConfig
    const generatorConfig: GeneratorConfig = {
      primary: {
        modelId: usedModelId as any,
        apiKey,
        endpointId: platform === 'doubao' ? user.config.doubaoEndpoint : undefined,
      },
    };

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
    res.flushHeaders(); // 立即发送响应头

    // 解析 Daily Log
    const weeklyLog = parseDailyLog(dailyLog);

    // 判断是否是推理模型
    const isReasoning = isReasoningModel(usedModelId as any);
    const thinkingEnabled = isReasoning && thinkingMode !== 'disabled';

    console.log(
      `[Generate/Stream] 开始流式生成: ${req.user!.email}, 模型: ${usedModelId}${thinkingEnabled ? ', 推理模式: ' + (thinkingMode || 'auto') : ''}`
    );

    // 辅助函数：刷新响应
    const flushResponse = () => {
      if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
      }
    };

    // 流式回调
    const streamCallbacks: StreamCallbacks = {
      onChunk: (chunk: string) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        flushResponse();
      },
      onThinking: thinkingEnabled ? (thinking: string) => {
        res.write(`data: ${JSON.stringify({ thinking })}\n\n`);
        flushResponse();
      } : undefined,
    };

    // 调用流式生成
    const result = await generateReportStream(
      weeklyLog,
      generatorConfig,
      streamCallbacks,
      { customTemplate }
    );

    console.log(`[Generate/Stream] 流式生成完成: ${req.user!.email}`);

    // 发送完成事件
    res.write(
      `data: ${JSON.stringify({
        done: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        model: { id: result.modelId, name: result.modelName },
      })}\n\n`
    );

    res.end();
  } catch (error) {
    console.error('[Generate/Stream] 流式生成错误:', error);

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

export default router;
