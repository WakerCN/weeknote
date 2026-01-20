/**
 * WeekNote 云端后端服务入口
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db/connection.js';
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

// 加载环境变量
dotenv.config();

// 配置
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weeknote';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'WeekNote API is running',
    mongodb: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // 脱敏
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
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
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
    console.log('[Server] 正在连接 MongoDB...');
    await connectDB();
    console.log('[Server] MongoDB 连接成功');

    // 启动提醒调度器
    cloudReminderScheduler.start();

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('  WeekNote 后端 API 服务已启动 🚀');
      console.log('='.repeat(60));
      console.log('');
      console.log(`  API 地址:     http://localhost:${PORT}`);
      console.log(`  健康检查:     http://localhost:${PORT}/api/health`);
      console.log(`  MongoDB:      ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
      console.log('');
      console.log('  💡 前端开发: pnpm --filter @weeknote/web dev');
      console.log('     访问地址: http://localhost:5173');
      console.log('');
      console.log('='.repeat(60));
      console.log('');
    });
  } catch (error) {
    console.error('[Server] 启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n[Server] 正在关闭服务...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] 正在关闭服务...');
  process.exit(0);
});

// 启动服务器
startServer();
