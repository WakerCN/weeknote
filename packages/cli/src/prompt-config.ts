/**
 * Prompt 模板配置管理
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 配置文件路径
 */
const CONFIG_DIR = path.join(os.homedir(), '.weeknote');
const PROMPTS_FILE = path.join(CONFIG_DIR, 'prompts.json');

/**
 * Prompt 模板结构
 */
export interface PromptTemplate {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户提示词模板，使用 {{dailyLog}} 占位符 */
  userPromptTemplate: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * Prompts 配置文件结构
 */
export interface PromptsConfig {
  /** 当前激活的模板 ID */
  activeTemplateId: string;
  /** 模板列表 */
  templates: PromptTemplate[];
}

/**
 * 默认系统提示词
 */
export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的工程师周报整理助手。你的任务是将用户提供的 Daily Log 整理为结构化的周报。

【核心原则】
1. 内容必须 100% 来源于 Daily Log，禁止虚构任何信息
2. 不扩大成果描述，不遗漏重要工作内容
3. Notes 部分仅作背景参考，不纳入正式周报内容
4. 严格按照指定的模板结构输出
5. 输出纯 Markdown 格式，不添加任何解释性文字或前言后语

【输出模板】
【本周工作总结】
- 主题/项目名：
  - 具体工作内容
  - 具体工作内容

【本周输出成果（Deliverables）】
- ✓ 已完成的交付物
- ✓ 已完成的交付物

【问题 & 风险（Issues & Risks）】
- 问题 1：问题描述
  - 影响：具体影响
  - 需要：行动项（如有）
- 风险 1：风险描述
  - 缓解方案：具体方案

【下周工作计划】
- 计划 1：具体计划内容
- 计划 2：具体计划内容

【注意事项】
- 本周工作总结需要按项目或主题归类，避免简单罗列
- 输出成果只包含已完成的交付物，使用 ✓ 标记
- 问题与风险需要说明影响和需要的支持
- 下周计划基于本周进度和最后一天的 Plan 推断
- 如果某个模块没有内容，仍然保留标题但标注"无"`;

/**
 * 默认用户提示词模板
 */
export const DEFAULT_USER_PROMPT_TEMPLATE = `请将以下 Daily Log 整理为周报：

---
{{dailyLog}}
---

请严格按照系统提示中的模板格式输出周报，注意：
1. 按项目或主题归类总结本周工作，不要简单罗列每天的内容
2. 从【结果】中提取已完成的交付物作为本周输出成果
3. 从【问题】中整理问题和风险，并分析影响
4. 基于最后一天的【计划】和整体进度推断下周工作计划
5. 【备注】内容仅作为背景参考，不直接纳入周报正文`;

/**
 * 创建默认模板
 */
function createDefaultTemplate(): PromptTemplate {
  const now = new Date().toISOString();
  return {
    id: 'default',
    name: '默认模板',
    description: '标准周报格式，包含工作总结、输出成果、问题风险和下周计划',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 获取默认配置
 */
function getDefaultConfig(): PromptsConfig {
  return {
    activeTemplateId: 'default',
    templates: [createDefaultTemplate()],
  };
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取 Prompts 配置文件
 */
export function loadPromptsConfig(): PromptsConfig {
  try {
    if (fs.existsSync(PROMPTS_FILE)) {
      const content = fs.readFileSync(PROMPTS_FILE, 'utf-8');
      const config = JSON.parse(content) as PromptsConfig;
      
      // 确保至少有一个模板
      if (!config.templates || config.templates.length === 0) {
        return getDefaultConfig();
      }
      
      // 确保激活的模板存在
      const activeExists = config.templates.some(t => t.id === config.activeTemplateId);
      if (!activeExists) {
        config.activeTemplateId = config.templates[0].id;
      }
      
      return config;
    }
  } catch {
    // 配置文件损坏，返回默认配置
  }
  return getDefaultConfig();
}

/**
 * 保存 Prompts 配置文件
 */
export function savePromptsConfig(config: PromptsConfig): void {
  ensureConfigDir();
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(config, null, 2));
}

/**
 * 获取当前激活的模板
 */
export function getActiveTemplate(): PromptTemplate {
  const config = loadPromptsConfig();
  const template = config.templates.find(t => t.id === config.activeTemplateId);
  return template || config.templates[0] || createDefaultTemplate();
}

/**
 * 设置激活的模板
 */
export function setActiveTemplate(templateId: string): boolean {
  const config = loadPromptsConfig();
  const exists = config.templates.some(t => t.id === templateId);
  
  if (!exists) {
    return false;
  }
  
  config.activeTemplateId = templateId;
  savePromptsConfig(config);
  return true;
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): PromptTemplate[] {
  const config = loadPromptsConfig();
  return config.templates;
}

/**
 * 获取指定模板
 */
export function getTemplateById(id: string): PromptTemplate | null {
  const config = loadPromptsConfig();
  return config.templates.find(t => t.id === id) || null;
}

/**
 * 创建新模板
 */
export function createTemplate(
  data: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>
): PromptTemplate {
  const config = loadPromptsConfig();
  const now = new Date().toISOString();
  
  // 生成唯一 ID
  const id = `template-${Date.now()}`;
  
  const newTemplate: PromptTemplate = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  
  config.templates.push(newTemplate);
  savePromptsConfig(config);
  
  return newTemplate;
}

/**
 * 更新模板
 */
export function updateTemplate(
  id: string,
  data: Partial<Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>>
): PromptTemplate | null {
  const config = loadPromptsConfig();
  const index = config.templates.findIndex(t => t.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const now = new Date().toISOString();
  config.templates[index] = {
    ...config.templates[index],
    ...data,
    updatedAt: now,
  };
  
  savePromptsConfig(config);
  return config.templates[index];
}

/**
 * 删除模板
 * @returns 是否删除成功，如果是最后一个模板则不允许删除
 */
export function deleteTemplate(id: string): boolean {
  const config = loadPromptsConfig();
  
  // 不能删除最后一个模板
  if (config.templates.length <= 1) {
    return false;
  }
  
  const index = config.templates.findIndex(t => t.id === id);
  if (index === -1) {
    return false;
  }
  
  config.templates.splice(index, 1);
  
  // 如果删除的是激活的模板，切换到第一个
  if (config.activeTemplateId === id) {
    config.activeTemplateId = config.templates[0].id;
  }
  
  savePromptsConfig(config);
  return true;
}

/**
 * 重置为默认模板
 */
export function resetToDefault(): PromptsConfig {
  const config = getDefaultConfig();
  savePromptsConfig(config);
  return config;
}

/**
 * 获取 Prompts 配置文件路径
 */
export function getPromptsConfigPath(): string {
  return PROMPTS_FILE;
}



