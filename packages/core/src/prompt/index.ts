/**
 * Prompt 管理模块
 * 管理 AI 周报生成的 Prompt 模板
 */

import type { WeeklyLog } from '../types/index.js';

/**
 * 获取 AI 系统 Prompt
 * @returns 系统 Prompt 字符串
 */
export function getSystemPrompt(): string {
  return `你是一位专业的工程师周报整理助手。你的任务是将用户提供的 Daily Log 整理为结构化的周报。

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
}

/**
 * 格式化 Daily Log 为 Prompt 内容
 * @param weeklyLog - 解析后的周日志
 * @returns 格式化的 Daily Log 字符串
 */
function formatDailyLogForPrompt(weeklyLog: WeeklyLog): string {
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
 * @returns 用户 Prompt 字符串
 */
export function buildUserPrompt(weeklyLog: WeeklyLog): string {
  const formattedLog = formatDailyLogForPrompt(weeklyLog);

  return `请将以下 Daily Log 整理为周报：

---
${formattedLog}
---

请严格按照系统提示中的模板格式输出周报，注意：
1. 按项目或主题归类总结本周工作，不要简单罗列每天的内容
2. 从【结果】中提取已完成的交付物作为本周输出成果
3. 从【问题】中整理问题和风险，并分析影响
4. 基于最后一天的【计划】和整体进度推断下周工作计划
5. 【备注】内容仅作为背景参考，不直接纳入周报正文`;
}

/**
 * 构建完整的消息数组（供 OpenAI API 使用）
 * @param weeklyLog - 解析后的周日志数据
 * @returns OpenAI 消息格式数组
 */
export function buildMessages(
  weeklyLog: WeeklyLog
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: getSystemPrompt(),
    },
    {
      role: 'user',
      content: buildUserPrompt(weeklyLog),
    },
  ];
}

/**
 * 构建完整 Prompt（旧版兼容，返回单个字符串）
 * @param weeklyLog - 解析后的周日志数据
 * @returns 完整的 Prompt 字符串
 * @deprecated 建议使用 buildMessages() 获取结构化消息
 */
export function buildPrompt(weeklyLog: WeeklyLog): string {
  return `${getSystemPrompt()}\n\n${buildUserPrompt(weeklyLog)}`;
}
