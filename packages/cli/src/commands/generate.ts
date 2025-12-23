/**
 * generate 命令实现
 */

import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import clipboard from 'clipboardy';
import {
  parseDailyLog,
  validateDailyLog,
  generateReport,
  generateReportStream,
  MODEL_REGISTRY,
  isValidModelId,
} from '@weeknote/core';
import { getEffectiveConfig } from '../config.js';

export interface GenerateOptions {
  file?: string;
  output?: string;
  copy?: boolean;
  stream?: boolean;
  model?: string;
}

/**
 * 从 stdin 读取输入
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', reject);

    // 如果是 TTY，说明没有管道输入
    if (process.stdin.isTTY) {
      reject(new Error('没有输入内容。请使用 -f 指定文件，或通过管道输入'));
    }
  });
}

/**
 * 执行 generate 命令
 */
export async function runGenerate(options: GenerateOptions): Promise<void> {
  const spinner = ora();

  try {
    // 1. 获取输入内容
    let input: string;

    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(chalk.red(`❌ 文件不存在: ${options.file}`));
        process.exit(1);
      }
      input = fs.readFileSync(options.file, 'utf-8');
    } else {
      try {
        input = await readStdin();
      } catch (error) {
        console.error(chalk.red(`❌ ${(error as Error).message}`));
        console.log(chalk.gray('\n使用方法:'));
        console.log(chalk.gray('  weeknote generate -f <daily-log.md>'));
        console.log(chalk.gray('  cat daily-log.md | weeknote generate'));
        process.exit(1);
      }
    }

    // 2. 验证输入（软校验）
    const validation = validateDailyLog(input);
    if (validation.status === 'error') {
      console.error(chalk.red(`❌ ${validation.error}`));
      process.exit(1);
    }

    // 显示格式警告（但继续生成）
    if (validation.status === 'warning' && validation.warnings.length > 0) {
      console.log(chalk.yellow('\n💡 格式提示\n'));
      validation.warnings.forEach((w) => {
        console.log(chalk.yellow(`⚠️  ${w.message}`));
        const suggestionLines = w.suggestion.split('\n').map((l) => `   ${l}`);
        console.log(chalk.gray(suggestionLines.join('\n')));
        console.log('');
      });
    }

    // 3. 解析 Daily Log
    spinner.start('解析 Daily Log...');
    const weeklyLog = parseDailyLog(input);
    spinner.succeed(chalk.green(`解析完成，共 ${weeklyLog.entries.length} 天的日志`));

    // 4. 获取配置
    const config = getEffectiveConfig();
    if (!config) {
      console.error(chalk.red('\n❌ 未配置模型'));
      console.log(chalk.gray('\n请先配置:'));
      console.log(
        chalk.gray('  weeknote config set -m siliconflow/qwen2.5-7b -k <your-api-key>')
      );
      console.log(chalk.gray('\n或设置环境变量:'));
      console.log(chalk.gray('  export SILICONFLOW_API_KEY=<your-api-key>'));
      process.exit(1);
    }

    // 如果指定了模型，覆盖配置
    if (options.model) {
      if (!isValidModelId(options.model)) {
        console.error(chalk.red(`❌ 无效的模型: ${options.model}`));
        console.log(chalk.gray('使用 weeknote config models 查看可用模型'));
        process.exit(1);
      }
      config.primary.modelId = options.model;
    }

    const modelMeta = MODEL_REGISTRY[config.primary.modelId];
    const modelDisplay = modelMeta
      ? `${modelMeta.name} (${config.primary.modelId})`
      : config.primary.modelId;

    console.log(chalk.cyan(`🤖 使用模型: ${modelDisplay}`));
    if (modelMeta?.isFree) {
      console.log(chalk.gray('   💡 免费模型'));
    }

    // 5. 生成周报
    let reportContent: string;

    if (options.stream) {
      console.log(chalk.gray('\n⏳ 正在生成周报...\n'));
      console.log('='.repeat(60));

      const result = await generateReportStream(weeklyLog, config, (chunk) => {
        process.stdout.write(chunk);
      });

      reportContent = result.report.rawMarkdown;

      console.log('\n' + '='.repeat(60));
    } else {
      spinner.start('正在生成周报...');

      const result = await generateReport(weeklyLog, config);
      reportContent = result.report.rawMarkdown;

      spinner.succeed(chalk.green('生成完成！'));

      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold('📋 生成的周报:'));
      console.log('='.repeat(60));
      console.log(reportContent);
      console.log('='.repeat(60));
    }

    // 6. 输出到文件
    if (options.output) {
      fs.writeFileSync(options.output, reportContent);
      console.log(chalk.green(`\n📄 已保存到: ${options.output}`));
    }

    // 7. 复制到剪贴板
    if (options.copy) {
      await clipboard.write(reportContent);
      console.log(chalk.green('📋 已复制到剪贴板'));
    }

    console.log(chalk.green('\n✅ 完成！'));
  } catch (error) {
    spinner.fail(chalk.red('生成失败'));
    console.error(chalk.red(`\n❌ 错误: ${(error as Error).message}`));
    process.exit(1);
  }
}
