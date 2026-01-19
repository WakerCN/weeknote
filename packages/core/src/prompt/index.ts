/**
 * Prompt 管理模块
 * 管理 AI 周报生成的 Prompt 模板
 */

import type { WeeklyLog } from '../types/index.js';

/**
 * 自定义模板参数
 */
export interface CustomPromptTemplate {
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户提示词模板，使用 {{dailyLog}} 占位符 */
  userPromptTemplate: string;
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
 * 获取默认系统提示词
 * @returns 默认系统 Prompt 字符串
 */
export function getDefaultSystemPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * 获取默认用户提示词模板
 * @returns 默认用户 Prompt 模板字符串
 */
export function getDefaultUserPromptTemplate(): string {
  return DEFAULT_USER_PROMPT_TEMPLATE;
}

/**
 * 格式化 Daily Log 为 Prompt 内容
 * @param weeklyLog - 解析后的周日志
 * @returns 格式化的 Daily Log 字符串
 */
export function formatDailyLogForPrompt(weeklyLog: WeeklyLog): string {
  const lines: string[] = [];

  for (const entry of weeklyLog.entries) {
    lines.push(`${entry.date} | ${entry.dayOfWeek}`);

    if (entry.plan.length > 0) {
      lines.push('【计划】');
      entry.plan.forEach((item) => lines.push(`- ${item}`));
    }

    if (entry.result.length > 0) {
      lines.push('【结果】');
      entry.result.forEach((item) => lines.push(`- ${item}`));
    }

    if (entry.issues.length > 0) {
      lines.push('【问题】');
      entry.issues.forEach((item) => lines.push(`- ${item}`));
    }

    if (entry.notes.length > 0) {
      lines.push('【备注】（仅供参考，不纳入正式周报）');
      entry.notes.forEach((item) => lines.push(`- ${item}`));
    }

    lines.push(''); // 空行分隔每天
  }

  return lines.join('\n').trim();
}

/**
 * 构建用户 Prompt（注入 Daily Log 数据）
 * @param weeklyLog - 解析后的周日志数据
 * @param template - 可选的自定义用户提示词模板
 * @returns 用户 Prompt 字符串
 */
export function buildUserPrompt(weeklyLog: WeeklyLog, template?: string): string {
  const formattedLog = formatDailyLogForPrompt(weeklyLog);
  const userTemplate = template || DEFAULT_USER_PROMPT_TEMPLATE;
  
  // 替换 {{dailyLog}} 占位符
  return userTemplate.replace(/\{\{dailyLog\}\}/g, formattedLog);
}

/**
 * 构建完整的消息数组（供 OpenAI API 使用）
 * @param weeklyLog - 解析后的周日志数据
 * @param customTemplate - 可选的自定义模板
 * @returns OpenAI 消息格式数组
 */
export function buildMessages(
  weeklyLog: WeeklyLog,
  customTemplate?: CustomPromptTemplate
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = customTemplate?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const userPromptTemplate = customTemplate?.userPromptTemplate;
  
  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: buildUserPrompt(weeklyLog, userPromptTemplate),
    },
  ];
}

