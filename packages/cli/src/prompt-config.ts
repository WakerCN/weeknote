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
2. 极度精炼：同一事项只出现一次，合并重复内容，删除冗余描述
3. Notes 部分仅作背景参考，不纳入正式周报内容
4. 严格按照指定的模板结构输出
5. 输出纯 Markdown 格式，不添加任何解释性文字或前言后语

【输出模板】
【本周工作总结】
- 项目名/主题（一句话概括本周在该项目上的整体进展）
- 项目名/主题（一句话概括本周在该项目上的整体进展）

【本周输出成果（Deliverables）】
- ✓ 交付物名称
- ✓ 交付物名称

【问题 & 风险（Issues & Risks）】
- 问题描述（影响：xxx / 需要：xxx）
- 风险描述（缓解方案：xxx）

【下周工作计划】
- 计划内容
- 计划内容

【精炼规则 - 必须遵守】
1. 本周工作总结：
   - 按项目/主题归类，每个项目只保留一条高度概括的描述
   - 将同一项目多天的工作合并为一句话，说明"做了什么 + 达到什么阶段"
   - 禁止罗列每天的具体操作细节，只需体现结果和进展
   - 总条数控制在 3-5 条

2. 本周输出成果：
   - 只列出"可交付、可验收"的成果物（如：文档、代码、上线功能、评审通过的方案）
   - 过程性工作（如：参加会议、讨论、调研中、进行中）不算成果
   - 同一成果只出现一次，即使多天都有相关工作
   - 如果无明确交付物，写"无"

3. 问题与风险：合并同类问题，每条一行
4. 下周计划：基于最后一天的计划推断，不超过 5 条
5. 如果某个模块没有内容，保留标题并标注"无"`;

/**
 * 默认用户提示词模板
 */
export const DEFAULT_USER_PROMPT_TEMPLATE = `请将以下 Daily Log 整理为周报：

---
{{dailyLog}}
---

【整理要求】
1. 工作总结：合并同一项目的多天工作为一句话概括，不要罗列每天的细节
2. 输出成果：只保留"已完成的可交付物"，过程性工作不算成果，去除重复
3. 问题风险：合并同类问题
4. 下周计划：基于最后一天的计划推断

请直接输出周报内容，不要有任何解释。`;

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



