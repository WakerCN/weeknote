/**
 * WeekNote 云端后端服务入口
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 静态文件服务（前端）
// 说明：
// - 生产环境执行的是 packages/server/dist/index.js，因此 __dirname 指向 dist/ 目录
// - Web 构建产物位于 packages/cli/web-dist
const webDistPath = path.resolve(__dirname, '../../cli/web-dist');
app.use(express.static(webDistPath));

// SPA 路由回退
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
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

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('  WeekNote 云端服务已启动 🚀');
      console.log('='.repeat(60));
      console.log('');
      console.log(`  服务地址:     http://localhost:${PORT}`);
      console.log(`  Web UI:       http://localhost:${PORT}`);
      console.log(`  健康检查:     http://localhost:${PORT}/api/health`);
      console.log('');
      console.log(`  MongoDB:      ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
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
