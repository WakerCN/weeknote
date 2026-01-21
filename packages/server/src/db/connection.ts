/**
 * MongoDB 数据库连接
 */

import mongoose from 'mongoose';
import { createLogger } from '../logger/index.js';

const logger = createLogger('DB');

/**
 * MongoDB 连接地址
 * 可通过环境变量 MONGODB_URI 配置
 */
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weeknote';

/**
 * 连接选项配置
 * 优化长连接稳定性
 */
const connectionOptions: mongoose.ConnectOptions = {
  // 连接池配置
  maxPoolSize: 10,              // 最大连接数
  minPoolSize: 2,               // 最小连接数（保持最小连接池）

  // 连接超时配置
  serverSelectionTimeoutMS: 5000,  // 服务器选择超时（5秒）
  socketTimeoutMS: 45000,          // Socket 超时（45秒）
  connectTimeoutMS: 10000,         // 连接超时（10秒）

  // 重试配置
  retryWrites: true,               // 启用写入重试
  retryReads: true,                // 启用读取重试
};

/**
 * 连接状态
 */
let isConnected = false;

/**
 * 事件监听器是否已注册（防止重复注册）
 */
let eventListenersRegistered = false;

/**
 * 注册连接事件监听器（只注册一次）
 */
function registerConnectionEvents(): void {
  if (eventListenersRegistered) {
    return;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.success('MongoDB 连接已建立');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB 已重新连接');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB 连接已断开');
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB 连接错误', error);
  });

  eventListenersRegistered = true;
}

/**
 * 连接数据库
 */
export async function connectDB(): Promise<void> {
  // 如果已经连接，检查实际状态
  if (isConnected && mongoose.connection.readyState === 1) {
    logger.debug('已连接，跳过重复连接');
    return;
  }

  try {
    // 设置 Mongoose 配置
    mongoose.set('strictQuery', true);

    // 注册事件监听器（在连接前注册，确保能捕获所有事件）
    registerConnectionEvents();

    // 连接数据库（使用配置选项）
    await mongoose.connect(MONGODB_URI, connectionOptions);

    // 确保状态正确（事件可能已经触发）
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
    }

    logger.success('MongoDB 连接成功');
    logger.info(`连接地址: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//*****:*****@')}`);

  } catch (error) {
    logger.error('MongoDB 连接失败', error as Error);
    throw error;
  }
}

/**
 * 断开数据库连接
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB 已断开连接');
  } catch (error) {
    logger.error('断开连接失败', error as Error);
    throw error;
  }
}

/**
 * 获取连接状态
 */
export function isDBConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * 获取 Mongoose 实例（用于高级操作）
 */
export { mongoose };
