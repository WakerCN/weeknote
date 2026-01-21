/**
 * WeekNote 云端后端服务入口
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDB, disconnectDB, isDBConnected } from './db/connection.js';
import { checkJwtSecretConfig } from './auth/jwt.js';
import authRouter from './routes/auth.js';
import dailyLogsRouter from './routes/daily-logs.js';
import historyRouter from './routes/history.js';
import promptTemplateRouter from './routes/prompt-template.js';
import configRouter from './routes/config.js';
import generationRouter from './routes/generation.js';
import reminderRouter from './routes/reminder.js';
import { MODEL_REGISTRY } from '@weeknote/core';
import { cloudReminderScheduler } from './services/reminder-scheduler.js';
import {
  createLogger,
  requestIdMiddleware,
  httpLoggerMiddleware,
  getLogConfig,
} from './logger/index.js';

// 加载环境变量（支持从项目根目录和当前目录加载）
dotenv.config(); // 当前目录
dotenv.config({ path: '../../.env' }); // 项目根目录（monorepo 结构）

// 创建 Logger
const logger = createLogger('Server');

// 配置
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weeknote';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求 ID 中间件（必须在 httpLogger 之前）
app.use(requestIdMiddleware());

// HTTP 请求日志中间件
app.use(httpLoggerMiddleware());

// 健康检查
app.get('/api/health', (_req, res) => {
  const dbConnected = isDBConnected();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    message: 'WeekNote API is running',
    mongodb: {
      connected: dbConnected,
      uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
    },
    timestamp: new Date().toISOString(),
  });
});

// 获取可用模型列表（无需认证）
app.get('/api/models', (_req, res) => {
  const models = Object.entries(MODEL_REGISTRY).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    isFree: meta.isFree,
  }));
  res.json({ models });
});

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/daily-logs', dailyLogsRouter);
app.use('/api/history', historyRouter);
app.use('/api/prompt-template', promptTemplateRouter);
app.use('/api/config', configRouter);
app.use('/api/generate', generationRouter);
app.use('/api/reminder', reminderRouter);

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 全局错误处理
const errorLogger = createLogger('Error');
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  errorLogger.error('服务器内部错误', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message,
  });
});

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 检查 JWT 配置
    checkJwtSecretConfig();

    // 连接 MongoDB
    logger.info('正在连接 MongoDB...');
    await connectDB();

    // 启动提醒调度器
    cloudReminderScheduler.start();

    // 获取日志配置用于展示
    const logConfig = getLogConfig();

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      logger.box({
        title: '🚀 WeekNote 后端 API 服务已启动',
        lines: [
          `📍 API 地址:     http://localhost:${PORT}`,
          `💊 健康检查:     http://localhost:${PORT}/api/health`,
          `🗄️  MongoDB:      ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`,
          `📝 日志级别:     ${logConfig.level}`,
          `📂 文件日志:     ${logConfig.enableFileLog ? logConfig.dir : '禁用'}`,
          '',
          `💡 前端开发: pnpm --filter @weeknote/web dev`,
          `   访问地址: http://localhost:5173`,
        ],
      });
    });
  } catch (error) {
    logger.error('启动失败', error as Error);
    process.exit(1);
  }
}

/**
 * 优雅关闭处理
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`收到 ${signal} 信号，正在关闭服务...`);

  try {
    // 停止提醒调度器
    cloudReminderScheduler.stop();

    // 断开数据库连接
    await disconnectDB();

    logger.info('服务已优雅关闭');
    process.exit(0);
  } catch (error) {
    logger.error('关闭服务时出错', error as Error);
    process.exit(1);
  }
}

// 注册信号处理器
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 启动服务器
startServer();
