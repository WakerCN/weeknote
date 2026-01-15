/**
 * API 路由模块
 */

// 认证路由
export { default as authRouter } from './auth.js';

// 业务路由
export { default as dailyLogsRouter } from './daily-logs.js';
export { default as historyRouter } from './history.js';
export { default as promptTemplateRouter } from './prompt-template.js';
export { default as configRouter } from './config.js';
export { default as generationRouter } from './generation.js';
export { default as reminderRouter } from './reminder.js';
