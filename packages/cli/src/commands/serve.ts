/**
 * serve 命令 - 启动 Web 服务器
 */

import chalk from 'chalk';
import { startServer } from '../server/index.js';

interface ServeOptions {
  port?: string;
  open?: boolean;
}

/**
 * 启动 Web 服务器
 */
export async function runServe(options: ServeOptions): Promise<void> {
  const preferredPort = options.port ? parseInt(options.port, 10) : 3000;

  if (isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
    console.error(chalk.red('❌ 无效的端口号'));
    process.exit(1);
  }

  try {
    // startServer 返回实际使用的端口号
    const actualPort = await startServer(preferredPort);

    // 自动打开浏览器（使用实际端口）
    if (options.open !== false) {
      const open = await import('open');
      await open.default(`http://localhost:${actualPort}`);
    }
  } catch (error) {
    console.error(chalk.red(`❌ ${error instanceof Error ? error.message : '启动失败'}`));
    process.exit(1);
  }
}

