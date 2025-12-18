/**
 * 周报生成器核心
 */

import type { WeeklyLog, WeeklyReport } from '../types/index.js';
import type { GeneratorConfig, ModelId } from './types.js';
import { MODEL_REGISTRY } from './types.js';
import { buildMessages, type CustomPromptTemplate } from '../prompt/index.js';
import { ModelManager } from './model-manager.js';

/**
 * 生成结果
 */
export interface GenerateResult {
  /** 生成的周报 */
  report: WeeklyReport;
  /** 实际使用的模型 ID */
  modelId: ModelId;
  /** 实际使用的模型名称 */
  modelName: string;
}

/**
 * 从 Markdown 解析周报结构
 */
function parseReportFromMarkdown(markdown: string): WeeklyReport {
  const report: WeeklyReport = {
    summary: [],
    deliverables: [],
    issuesAndRisks: [],
    nextWeekPlan: [],
    rawMarkdown: markdown,
  };

  try {
    const summaryMatch = markdown.match(/【本周工作总结】([\s\S]*?)(?=【|$)/);
    const deliverablesMatch = markdown.match(/【本周输出成果[^】]*】([\s\S]*?)(?=【|$)/);
    const issuesMatch = markdown.match(/【问题\s*[&＆]\s*风险[^】]*】([\s\S]*?)(?=【|$)/);
    const planMatch = markdown.match(/【下周工作计划】([\s\S]*?)(?=【|$)/);

    if (summaryMatch) {
      report.summary = extractListItems(summaryMatch[1]);
    }

    if (deliverablesMatch) {
      report.deliverables = extractListItems(deliverablesMatch[1]);
    }

    if (issuesMatch) {
      report.issuesAndRisks = extractIssues(issuesMatch[1]);
    }

    if (planMatch) {
      report.nextWeekPlan = extractListItems(planMatch[1]);
    }
  } catch {
    console.warn('[Generator] 周报结构解析失败，使用原始 Markdown');
  }

  return report;
}

/**
 * 提取列表项
 */
function extractListItems(text: string): string[] {
  const lines = text.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('✓')) {
      items.push(trimmed.replace(/^[-•✓]\s*/, ''));
    }
  }

  return items;
}

/**
 * 提取问题和风险
 */
function extractIssues(
  text: string
): Array<{ title: string; impact?: string; action?: string }> {
  const issues: Array<{ title: string; impact?: string; action?: string }> = [];
  const lines = text.split('\n');

  let currentIssue: { title: string; impact?: string; action?: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.startsWith('-') &&
      !trimmed.includes('影响') &&
      !trimmed.includes('需要') &&
      !trimmed.includes('缓解')
    ) {
      if (currentIssue) {
        issues.push(currentIssue);
      }
      currentIssue = { title: trimmed.replace(/^[-•]\s*/, '') };
    } else if (currentIssue) {
      if (trimmed.includes('影响：') || trimmed.includes('影响:')) {
        currentIssue.impact = trimmed.replace(/.*影响[：:]\s*/, '');
      } else if (
        trimmed.includes('需要：') ||
        trimmed.includes('需要:') ||
        trimmed.includes('缓解')
      ) {
        currentIssue.action = trimmed.replace(/.*[需要缓解][：:方案]*\s*/, '');
      }
    }
  }

  if (currentIssue) {
    issues.push(currentIssue);
  }

  return issues;
}

/**
 * 生成选项
 */
export interface GenerateOptions {
  /** 自定义 Prompt 模板 */
  customTemplate?: CustomPromptTemplate;
}

/**
 * 从解析后的日志生成周报
 */
export async function generateReport(
  weeklyLog: WeeklyLog,
  config: GeneratorConfig,
  options?: GenerateOptions
): Promise<GenerateResult> {
  const messages = buildMessages(weeklyLog, options?.customTemplate);

  const manager = new ModelManager({
    primary: config.primary,
  });

  const { content, modelId } = await manager.generate(messages);
  const report = parseReportFromMarkdown(content);
  const modelMeta = MODEL_REGISTRY[modelId];

  return {
    report,
    modelId,
    modelName: modelMeta?.name || modelId,
  };
}

/**
 * 流式生成周报
 */
export async function generateReportStream(
  weeklyLog: WeeklyLog,
  config: GeneratorConfig,
  onChunk: (chunk: string) => void,
  options?: GenerateOptions
): Promise<GenerateResult> {
  const messages = buildMessages(weeklyLog, options?.customTemplate);

  const manager = new ModelManager({
    primary: config.primary,
  });

  const { content, modelId } = await manager.generateStream(messages, onChunk);
  const report = parseReportFromMarkdown(content);
  const modelMeta = MODEL_REGISTRY[modelId];

  return {
    report,
    modelId,
    modelName: modelMeta?.name || modelId,
  };
}
