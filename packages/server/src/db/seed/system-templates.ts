/**
 * 系统模板初始化脚本
 * 在服务启动时检查并创建系统默认模板
 */

import { PromptTemplate } from '../models/PromptTemplate.js';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT_TEMPLATE } from '@weeknote/core';
import { createLogger } from '../../logger/index.js';

const logger = createLogger('Seed');

/**
 * 系统默认模板配置
 */
const SYSTEM_TEMPLATES = [
  {
    name: '标准周报模板',
    description: '官方推荐的标准周报生成模板，输出格式规范、内容全面，适合日常工作汇报',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
  },
];

/**
 * 初始化系统模板
 * 如果系统模板不存在，则创建默认的系统模板
 */
export async function seedSystemTemplates(): Promise<void> {
  try {
    // 检查是否已存在系统模板
    const existingSystemTemplates = await PromptTemplate.findSystemTemplates();

    if (existingSystemTemplates.length > 0) {
      logger.debug(`系统模板已存在 (${existingSystemTemplates.length} 个)，跳过初始化`);
      return;
    }

    // 创建系统模板
    for (const template of SYSTEM_TEMPLATES) {
      await PromptTemplate.create({
        ...template,
        userId: null, // 系统模板无所有者
        visibility: 'system',
        isActive: false,
        usageCount: 0,
        likeCount: 0,
        commentCount: 0,
      });

      logger.success(`创建系统模板: ${template.name}`);
    }

    logger.info(`系统模板初始化完成，共创建 ${SYSTEM_TEMPLATES.length} 个模板`);
  } catch (error) {
    logger.error('系统模板初始化失败', error as Error);
    throw error;
  }
}

/**
 * 更新系统模板内容
 * 当 core 包中的默认 prompt 更新时，同步更新数据库中的系统模板
 */
export async function updateSystemTemplates(): Promise<void> {
  try {
    const systemTemplates = await PromptTemplate.findSystemTemplates();

    for (const template of systemTemplates) {
      // 查找对应的配置
      const config = SYSTEM_TEMPLATES.find((t) => t.name === template.name);
      if (!config) continue;

      // 检查是否需要更新
      if (
        template.systemPrompt !== config.systemPrompt ||
        template.userPromptTemplate !== config.userPromptTemplate
      ) {
        template.systemPrompt = config.systemPrompt;
        template.userPromptTemplate = config.userPromptTemplate;
        template.description = config.description;
        await template.save();

        logger.info(`更新系统模板: ${template.name}`);
      }
    }
  } catch (error) {
    logger.error('更新系统模板失败', error as Error);
    throw error;
  }
}
