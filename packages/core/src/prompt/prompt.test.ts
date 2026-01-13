/**
 * Prompt 管理模块测试
 */

import { describe, it, expect } from 'vitest';
import { getSystemPrompt, buildUserPrompt, buildMessages, buildPrompt } from './index.js';
import type { WeeklyLog } from '../types/index.js';

const SAMPLE_WEEKLY_LOG: WeeklyLog = {
  entries: [
    {
      date: '12-15',
      dayOfWeek: '周一',
      plan: ['完成功能 A 开发', '代码 review'],
      result: ['完成了功能 A 的 80%', 'Review 了 3 个 PR'],
      issues: ['接口文档不清晰'],
      notes: ['下午有个会议'],
      rawContent: '',
    },
    {
      date: '12-16',
      dayOfWeek: '周二',
      plan: ['继续功能 A', '写单元测试'],
      result: ['功能 A 完成', '单元测试覆盖率 85%'],
      issues: [],
      notes: ['明天需要和产品对齐'],
      rawContent: '',
    },
  ],
  startDate: '12-15',
  endDate: '12-16',
};

describe('getSystemPrompt', () => {
  it('应该返回非空的系统 Prompt', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toBeTruthy();
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('应该包含核心原则', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain('100%');
    expect(prompt).toContain('禁止虚构');
    expect(prompt).toContain('Notes');
  });

  it('应该包含输出模板结构', () => {
    const prompt = getSystemPrompt();

    expect(prompt).toContain('【本周工作总结】');
    expect(prompt).toContain('【本周输出成果（Deliverables）】');
    expect(prompt).toContain('【问题 & 风险（Issues & Risks）】');
    expect(prompt).toContain('【下周工作计划】');
  });
});

describe('buildUserPrompt', () => {
  it('应该包含格式化的 Daily Log 内容', () => {
    const prompt = buildUserPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('12-15 | 周一');
    expect(prompt).toContain('12-16 | 周二');
  });

  it('应该包含计划内容', () => {
    const prompt = buildUserPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('【计划】');
    expect(prompt).toContain('完成功能 A 开发');
  });

  it('应该包含结果内容', () => {
    const prompt = buildUserPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('【结果】');
    expect(prompt).toContain('完成了功能 A 的 80%');
  });

  it('应该包含问题内容', () => {
    const prompt = buildUserPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('【问题】');
    expect(prompt).toContain('接口文档不清晰');
  });

  it('应该标记备注仅供参考', () => {
    const prompt = buildUserPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('【备注】（仅供参考，不纳入正式周报）');
    expect(prompt).toContain('下午有个会议');
  });

  it('应该包含整理要求', () => {
    const prompt = buildUserPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('合并同一项目的多天工作');
    expect(prompt).toContain('过程性工作不算成果');
  });
});

describe('buildMessages', () => {
  it('应该返回包含 system 和 user 消息的数组', () => {
    const messages = buildMessages(SAMPLE_WEEKLY_LOG);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system 消息应该包含系统 Prompt', () => {
    const messages = buildMessages(SAMPLE_WEEKLY_LOG);

    expect(messages[0].content).toContain('工程师周报整理助手');
  });

  it('user 消息应该包含 Daily Log 内容', () => {
    const messages = buildMessages(SAMPLE_WEEKLY_LOG);

    expect(messages[1].content).toContain('12-15 | 周一');
  });
});

describe('buildPrompt', () => {
  it('应该返回完整的 Prompt 字符串', () => {
    const prompt = buildPrompt(SAMPLE_WEEKLY_LOG);

    expect(prompt).toContain('工程师周报整理助手');
    expect(prompt).toContain('12-15 | 周一');
  });
});

describe('空数据处理', () => {
  it('应该处理空的 WeeklyLog', () => {
    const emptyLog: WeeklyLog = {
      entries: [],
      startDate: '',
      endDate: '',
    };

    const prompt = buildUserPrompt(emptyLog);

    expect(prompt).toContain('请将以下 Daily Log 整理为周报');
  });

  it('应该处理没有 issues 的条目', () => {
    const logWithoutIssues: WeeklyLog = {
      entries: [
        {
          date: '12-15',
          dayOfWeek: '周一',
          plan: ['任务 A'],
          result: ['完成任务 A'],
          issues: [],
          notes: [],
          rawContent: '',
        },
      ],
      startDate: '12-15',
      endDate: '12-15',
    };

    const prompt = buildUserPrompt(logWithoutIssues);

    expect(prompt).toContain('12-15 | 周一');
    // Daily Log 数据部分不应包含【问题】段落（但注意事项中会提到）
    expect(prompt).toContain('【计划】');
    expect(prompt).toContain('【结果】');
    // 空的 issues 不应该生成【问题】段落
    const dailyLogSection = prompt.split('---')[1];
    expect(dailyLogSection).not.toContain('【问题】');
  });
});
