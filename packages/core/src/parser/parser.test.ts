/**
 * Daily Log 解析器测试
 */

import { describe, it, expect } from 'vitest';
import { parseDailyLog, validateDailyLog, formatWeeklyLog } from './index.js';

const SAMPLE_DAILY_LOG = `12-15 | 周一
Plan
- 完成功能 A 开发
- 代码 review

Result
- 完成了功能 A 的 80%
- Review 了 3 个 PR

Issues
- 接口文档不清晰

Notes
- 下午有个会议

12-16 | 周二
Plan
- 继续功能 A
- 写单元测试

Result
- 功能 A 完成
- 单元测试覆盖率 85%

Issues

Notes
- 明天需要和产品对齐

12-17 | 周三
Plan
- 开始功能 B

Result
- 功能 B 完成 50%

Issues
- 依赖的服务有 bug

Notes
`;

describe('parseDailyLog', () => {
  it('应该解析多个每日条目', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries).toHaveLength(3);
    expect(result.startDate).toBe('12-15');
    expect(result.endDate).toBe('12-17');
  });

  it('应该正确解析日期和星期', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].date).toBe('12-15');
    expect(result.entries[0].dayOfWeek).toBe('周一');
    expect(result.entries[1].date).toBe('12-16');
    expect(result.entries[1].dayOfWeek).toBe('周二');
  });

  it('应该支持年月日格式的日期行', () => {
    const input = `2024-12-23 | 周一
Plan
- 计划任务

Result
- 完成内容

2024-12-24 | 周二
Plan
- 另一个任务`;

    const result = parseDailyLog(input);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].date).toBe('2024-12-23');
    expect(result.entries[0].dayOfWeek).toBe('周一');
    expect(result.entries[1].date).toBe('2024-12-24');
    expect(result.entries[1].dayOfWeek).toBe('周二');
    expect(result.startDate).toBe('2024-12-23');
    expect(result.endDate).toBe('2024-12-24');
  });

  it('应该解析 Plan 段落', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].plan).toEqual(['完成功能 A 开发', '代码 review']);
    expect(result.entries[1].plan).toEqual(['继续功能 A', '写单元测试']);
  });

  it('应该解析 Result 段落', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].result).toEqual(['完成了功能 A 的 80%', 'Review 了 3 个 PR']);
  });

  it('应该解析 Issues 段落', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].issues).toEqual(['接口文档不清晰']);
    expect(result.entries[1].issues).toEqual([]); // 空的 Issues
  });

  it('应该解析 Notes 段落', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].notes).toEqual(['下午有个会议']);
    expect(result.entries[1].notes).toEqual(['明天需要和产品对齐']);
  });

  it('应该处理空输入', () => {
    const result = parseDailyLog('');

    // 空输入也会创建一个条目（无日期行分支）
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].date).toBe('未标注');
    expect(result.entries[0].result).toHaveLength(0);
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });

  it('应该处理没有日期行的输入（整体作为一个条目）', () => {
    const result = parseDailyLog('一些随机文本\n没有日期行');

    // 没有日期行时，整体作为一个条目，内容放入 result
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].date).toBe('未标注');
    expect(result.entries[0].result).toContain('一些随机文本');
    expect(result.entries[0].result).toContain('没有日期行');
  });

  it('应该保留段落标题之前的内容（不静默丢弃）', () => {
    const input = `这是介绍性文字
另一行前置内容

Plan
- 计划任务 1

Result
- 完成内容 1`;

    const result = parseDailyLog(input);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].date).toBe('未标注');
    // 段落标题之前的内容应该放入 result
    expect(result.entries[0].result).toContain('这是介绍性文字');
    expect(result.entries[0].result).toContain('另一行前置内容');
    expect(result.entries[0].result).toContain('完成内容 1');
    // Plan 段落正常解析
    expect(result.entries[0].plan).toContain('计划任务 1');
  });

  it('应该保留原始内容', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].rawContent).toContain('12-15 | 周一');
    expect(result.entries[0].rawContent).toContain('完成功能 A 开发');
  });
});

describe('validateDailyLog', () => {
  it('对于正确格式应该返回 valid 状态', () => {
    const result = validateDailyLog(SAMPLE_DAILY_LOG);

    expect(result.status).toBe('valid');
    expect(result.warnings).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it('对于空输入应该返回 error 状态', () => {
    const result = validateDailyLog('');

    expect(result.status).toBe('error');
    expect(result.error).toBe('请输入 Daily Log 内容');
  });

  it('对于没有日期行的输入应该返回 warning 状态（软校验）', () => {
    const result = validateDailyLog('一些随机文本');

    expect(result.status).toBe('warning');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.type === 'no_date_line')).toBe(true);
  });

  it('对于没有段落结构的输入应该返回 warning', () => {
    const result = validateDailyLog('12-23 | 周一\n完成了一些工作');

    expect(result.status).toBe('warning');
    expect(result.warnings.some((w) => w.type === 'no_sections')).toBe(true);
  });

  it('对于有日期行和段落结构但缺少一些段落的输入应该返回 valid', () => {
    const result = validateDailyLog('12-23 | 周一\nPlan\n- 计划任务');

    expect(result.status).toBe('valid');
  });

  it('对于年月日格式的日期行应该返回 valid', () => {
    const result = validateDailyLog('2024-12-23 | 周一\nPlan\n- 计划任务');

    expect(result.status).toBe('valid');
  });
});

describe('formatWeeklyLog', () => {
  it('应该将周日志格式化为文本', () => {
    const parsed = parseDailyLog(SAMPLE_DAILY_LOG);
    const formatted = formatWeeklyLog(parsed);

    expect(formatted).toContain('12-15 | 周一');
    expect(formatted).toContain('Plan');
    expect(formatted).toContain('- 完成功能 A 开发');
  });
});
