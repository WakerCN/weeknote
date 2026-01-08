#!/usr/bin/env node

/**
 * @weeknote/cli
 * 周报优化器命令行工具
 */

import { Command } from 'commander';
import {
  runGenerate,
  runConfigSet,
  runConfigShow,
  runConfigModels,
  runConfigKey,
  runConfigDefault,
  runConfigInit,
  runConfigEndpoint,
  runServe,
} from './commands/index.js';

const program = new Command();

program
  .name('weeknote')
  .description('面向工程师的 AI 周报生成工具')
  .version('1.0.0');

// generate 命令
program
  .command('generate')
  .description('从 Daily Log 生成周报')
  .option('-f, --file <path>', 'Daily Log 文件路径')
  .option('-o, --output <path>', '输出文件路径')
  .option('-c, --copy', '复制结果到剪贴板')
  .option('-s, --stream', '启用流式输出')
  .option('-m, --model <id>', '指定模型 (如: siliconflow/qwen2.5-7b)')
  .action(async (options) => {
    await runGenerate(options);
  });

// config 命令组
const configCmd = program.command('config').description('管理配置');

configCmd
  .command('init')
  .description('交互式配置向导')
  .action(async () => {
    await runConfigInit();
  });

configCmd
  .command('set')
  .description('设置模型和 API Key（同时设置）')
  .requiredOption('-m, --model <id>', '模型 ID (如: siliconflow/qwen2.5-7b)')
  .requiredOption('-k, --key <apiKey>', 'API Key')
  .action((options) => {
    runConfigSet(options);
  });

configCmd
  .command('key')
  .description('设置平台 API Key')
  .requiredOption('-p, --platform <name>', '平台名称 (siliconflow/deepseek/openai/doubao)')
  .requiredOption('-k, --key <apiKey>', 'API Key')
  .action((options) => {
    runConfigKey(options);
  });

configCmd
  .command('endpoint')
  .description('设置豆包（火山方舟）接入点 ID')
  .requiredOption('-e, --endpoint <id>', '接入点 ID (如: ep-xxxxx)')
  .action((options) => {
    runConfigEndpoint(options);
  });

configCmd
  .command('default [modelId]')
  .description('交互式选择默认模型（或直接指定模型ID）')
  .action(async (modelId) => {
    await runConfigDefault(modelId);
  });

configCmd
  .command('show')
  .description('显示当前配置')
  .action(() => {
    runConfigShow();
  });

configCmd
  .command('models')
  .description('显示所有可用模型')
  .action(() => {
    runConfigModels();
  });

// serve 命令 - 启动 Web 界面
program
  .command('serve')
  .alias('web')
  .description('启动 Web 界面')
  .option('-p, --port <port>', '服务器端口', '3000')
  .option('--no-open', '不自动打开浏览器')
  .action(async (options) => {
    await runServe(options);
  });

program.parse();
