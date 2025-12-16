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

    expect(result.entries).toHaveLength(0);
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });

  it('应该处理没有日期行的输入', () => {
    const result = parseDailyLog('一些随机文本\n没有日期行');

    expect(result.entries).toHaveLength(0);
  });

  it('应该保留原始内容', () => {
    const result = parseDailyLog(SAMPLE_DAILY_LOG);

    expect(result.entries[0].rawContent).toContain('12-15 | 周一');
    expect(result.entries[0].rawContent).toContain('完成功能 A 开发');
  });
});

describe('validateDailyLog', () => {
  it('对于正确格式应该返回有效', () => {
    const result = validateDailyLog(SAMPLE_DAILY_LOG);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('对于空输入应该返回无效', () => {
    const result = validateDailyLog('');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('输入内容为空');
  });

  it('对于没有日期行的输入应该返回无效', () => {
    const result = validateDailyLog('一些随机文本');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('未找到有效的日期行');
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
