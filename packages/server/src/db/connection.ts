/**
 * MongoDB 数据库连接
 */

import mongoose from 'mongoose';

/**
 * MongoDB 连接地址
 * 可通过环境变量 MONGODB_URI 配置
 */
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weeknote';

/**
 * 连接状态
 */
let isConnected = false;

/**
 * 连接数据库
 */
export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('[DB] 已连接，跳过重复连接');
    return;
  }

  try {
    // 设置 Mongoose 配置
    mongoose.set('strictQuery', true);

    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    isConnected = true;

    console.log('[DB] MongoDB 连接成功');
    console.log(`[DB] 连接地址: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//*****:*****@')}`);

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      console.error('[DB] MongoDB 连接错误:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DB] MongoDB 连接已断开');
      isConnected = false;
    });

  } catch (error) {
    console.error('[DB] MongoDB 连接失败:', error);
    throw error;
  }
}

/**
 * 断开数据库连接
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[DB] MongoDB 已断开连接');
  } catch (error) {
    console.error('[DB] 断开连接失败:', error);
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
