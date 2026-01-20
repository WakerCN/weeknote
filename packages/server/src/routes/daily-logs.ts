/**
 * 每日记录 API 路由
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';
import { DailyLog, type IDailyLog } from '../db/models/DailyLog.js';
import { authMiddleware, validateRequest, AuthRequest } from '../middleware/index.js';
import {
  getWeekStart,
  getWeekEnd,
  getWeekInfo,
  parseLocalDate,
  formatLocalDate,
} from '@weeknote/core';

const router: Router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/daily-logs/day/:date
 * 获取某天的记录
 */
router.get(
  '/day/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('日期格式应为 YYYY-MM-DD'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { date } = req.params;

      const record = await DailyLog.findByUserAndDate(userId, date);

      res.json({
        success: true,
        record: record || null,
      });
    } catch (error) {
      console.error('[Daily Log] 获取记录失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取记录失败',
      });
    }
  }
);

/**
 * 获取日期的星期几
 */
function getDayOfWeek(dateStr: string): string {
  const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const d = parseLocalDate(dateStr);
  return WEEKDAY_NAMES[d.getDay()];
}

/**
 * POST /api/daily-logs/day/:date
 * 保存某天的记录
 */
router.post(
  '/day/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('日期格式应为 YYYY-MM-DD'),
    // dayOfWeek 改为可选，后端自动计算
    body('dayOfWeek').optional().isIn(['周一', '周二', '周三', '周四', '周五', '周六', '周日']),
    body('plan').optional().isString(),
    body('result').optional().isString(),
    body('issues').optional().isString(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {

      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { date } = req.params;
      const { plan, result, issues, notes } = req.body;
      // 自动计算 dayOfWeek，如果前端没传的话
      const dayOfWeek = req.body.dayOfWeek || getDayOfWeek(date);

      // 验证日期不能是未来
      const dateObj = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dateObj > today) {
        res.status(400).json({ error: '不能记录未来的日期' });
        return;
      }

      // 使用 findOneAndUpdate 实现 upsert（插入或更新）
      const record = await DailyLog.findOneAndUpdate(
        { userId, date },
        {
          userId,
          date,
          dayOfWeek,
          plan: plan || '',
          result: result || '',
          issues: issues || '',
          notes: notes || '',
        },
        { upsert: true, new: true }
      );

      console.log(`[Daily Log] 保存记录: ${req.user!.email} - ${date}`);

      res.json({
        success: true,
        record,
      });
    } catch (error) {
      console.error('[Daily Log] 保存记录失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '保存记录失败',
      });
    }
  }
);

/**
 * GET /api/daily-logs/range
 * 获取指定时间段的记录
 */
router.get(
  '/range',
  [
    query('startDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('开始日期格式应为 YYYY-MM-DD'),
    query('endDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('结束日期格式应为 YYYY-MM-DD'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };

      // 验证日期范围
      if (startDate > endDate) {
        res.status(400).json({ error: '开始日期不能晚于结束日期' });
        return;
      }

      const records = await DailyLog.findByUserAndDateRange(userId, startDate, endDate);

      // 计算统计信息
      const filled = records.filter((r) => {
        return r.plan.trim() || r.result.trim() || r.issues.trim() || r.notes.trim();
      }).length;

      res.json({
        success: true,
        records,
        stats: {
          total: records.length,
          filled,
          startDate,
          endDate,
        },
      });
    } catch (error) {
      console.error('[Daily Log] 获取时间段记录失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取记录失败',
      });
    }
  }
);

/**
 * DELETE /api/daily-logs/day/:date
 * 删除某天的记录
 */
router.delete(
  '/day/:date',
  [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('日期格式应为 YYYY-MM-DD'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const { date } = req.params;

      const result = await DailyLog.deleteOne({ userId, date });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: '记录不存在' });
        return;
      }

      console.log(`[Daily Log] 删除记录: ${req.user!.email} - ${date}`);

      res.json({
        success: true,
        message: '删除成功',
      });
    } catch (error) {
      console.error('[Daily Log] 删除记录失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '删除记录失败',
      });
    }
  }
);

/**
 * GET /api/daily-logs/weeks
 * 获取所有周的摘要列表
 */
router.get('/weeks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    // 获取用户所有记录，按日期降序
    const records = await DailyLog.find({ userId }).sort({ date: -1 });

    // 按周分组
    const weekMap = new Map<
      string,
      {
        weekStart: string;
        weekEnd: string;
        year: number;
        week: number;
        filledDays: number;
        lastUpdated: Date;
      }
    >();

    for (const record of records) {
      const weekStart = getWeekStart(record.date);
      if (!weekMap.has(weekStart)) {
        const weekEnd = getWeekEnd(weekStart);
        const { year, week } = getWeekInfo(parseLocalDate(weekStart));
        weekMap.set(weekStart, {
          weekStart,
          weekEnd,
          year,
          week,
          filledDays: 0,
          lastUpdated: record.updatedAt,
        });
      }
      const weekInfo = weekMap.get(weekStart)!;
      // 只有有内容的记录才算填充
      if (
        record.plan.trim() ||
        record.result.trim() ||
        record.issues.trim() ||
        record.notes.trim()
      ) {
        weekInfo.filledDays++;
      }
      if (record.updatedAt > weekInfo.lastUpdated) {
        weekInfo.lastUpdated = record.updatedAt;
      }
    }

    // 转换为数组并按周开始日期降序排序
    const weeks = Array.from(weekMap.values())
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      .map((w) => ({
        fileName: `${w.year}-W${String(w.week).padStart(2, '0')}.json`,
        year: w.year,
        week: w.week,
        weekStart: w.weekStart,
        weekEnd: w.weekEnd,
        filledDays: w.filledDays,
        lastUpdated: w.lastUpdated.toISOString(),
      }));

    res.json({ weeks });
  } catch (error) {
    console.error('[Daily Log] 获取周列表失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取周列表失败',
    });
  }
});

/**
 * GET /api/daily-logs/week
 * 获取某周的所有记录
 */
router.get('/week', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const dateParam = (req.query.date as string) || formatLocalDate(new Date());
    const weekStart = getWeekStart(dateParam);
    const weekEnd = getWeekEnd(weekStart);
    const { year, week } = getWeekInfo(parseLocalDate(weekStart));

    const records = await DailyLog.findByUserAndDateRange(userId, weekStart, weekEnd);

    // 转换为 { date: record } 格式
    const days: Record<string, IDailyLog> = {};
    for (const record of records) {
      days[record.date] = record;
    }

    res.json({
      version: 1,
      year,
      week,
      weekStart,
      weekEnd,
      days,
      createdAt: records.length > 0 ? records[0].createdAt : new Date().toISOString(),
      updatedAt:
        records.length > 0 ? records[records.length - 1].updatedAt : new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Daily Log] 获取周记录失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取周记录失败',
    });
  }
});

/**
 * GET /api/daily-logs/export
 * 导出记录为文本格式（支持日期范围或按周导出）
 *
 * 参数：
 * - startDate + endDate: 按日期范围导出（新方式）
 * - date: 按该日期所在周导出（兼容旧方式）
 */
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    let startDate: string;
    let endDate: string;

    // 判断使用哪种方式
    if (req.query.startDate && req.query.endDate) {
      // 新方式：按日期范围
      startDate = req.query.startDate as string;
      endDate = req.query.endDate as string;

      // 验证日期格式
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
        res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' });
        return;
      }

      // 验证日期范围
      if (startDate > endDate) {
        res.status(400).json({ error: '开始日期不能晚于结束日期' });
        return;
      }
    } else {
      // 兼容旧方式：按周导出
      const dateParam = (req.query.date as string) || formatLocalDate(new Date());
      startDate = getWeekStart(dateParam);
      endDate = getWeekEnd(startDate);
    }

    const records = await DailyLog.findByUserAndDateRange(userId, startDate, endDate);

    if (records.length === 0) {
      res.json({ text: '', startDate, endDate, filledDays: 0 });
      return;
    }

    // 生成文本格式（符合 Daily Log 解析器期望的格式）
    const lines: string[] = [];
    let filledDays = 0;

    for (const record of records) {
      const hasContent =
        record.plan.trim() || record.result.trim() || record.issues.trim() || record.notes.trim();
      if (!hasContent) continue;

      filledDays++;
      
      // 日期格式：从 "2024-12-23" 提取 "12-23"，配合 "周X"
      const shortDate = record.date.slice(5); // "12-23"
      lines.push(`${shortDate} | ${record.dayOfWeek}`);
      
      // Plan 段落
      lines.push('Plan');
      if (record.plan.trim()) {
        lines.push(record.plan.trim());
      }
      lines.push('');
      
      // Result 段落
      lines.push('Result');
      if (record.result.trim()) {
        lines.push(record.result.trim());
      }
      lines.push('');
      
      // Issues 段落
      lines.push('Issues');
      if (record.issues.trim()) {
        lines.push(record.issues.trim());
      }
      lines.push('');
      
      // Notes 段落
      lines.push('Notes');
      if (record.notes.trim()) {
        lines.push(record.notes.trim());
      }
      lines.push('');
      lines.push('');
    }

    res.json({
      text: lines.join('\n').trim(),
      startDate,
      endDate,
      filledDays,
    });
  } catch (error) {
    console.error('[Daily Log] 导出失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '导出失败',
    });
  }
});

/**
 * GET /api/daily-logs/month-summary
 * 获取月份记录摘要（用于日历显示）
 */
router.get(
  '/month-summary',
  [
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('年份格式不正确'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('月份应为 1-12'),
  ],
  validateRequest,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.userId);
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);

      // 计算月份的开始和结束日期
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const records = await DailyLog.findByUserAndDateRange(userId, startDate, endDate);

      // 构建每天的记录状态
      const days: Record<string, { hasContent: boolean }> = {};
      for (const record of records) {
        const hasContent = !!(
          record.plan.trim() ||
          record.result.trim() ||
          record.issues.trim() ||
          record.notes.trim()
        );
        days[record.date] = { hasContent };
      }

      res.json({
        success: true,
        year,
        month,
        startDate,
        endDate,
        days,
      });
    } catch (error) {
      console.error('[Daily Log] 获取月份摘要失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '获取月份摘要失败',
      });
    }
  }
);

/**
 * GET /api/daily-logs/stats
 * 获取某周的统计信息
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const dateParam = (req.query.date as string) || formatLocalDate(new Date());
    const weekStart = getWeekStart(dateParam);
    const weekEnd = getWeekEnd(weekStart);

    const records = await DailyLog.findByUserAndDateRange(userId, weekStart, weekEnd);

    // 计算填充天数
    let filledDays = 0;
    let weekdaysFilled = 0;

    for (const record of records) {
      const hasContent =
        record.plan.trim() || record.result.trim() || record.issues.trim() || record.notes.trim();
      if (hasContent) {
        filledDays++;
        // 判断是否工作日（周一到周五）
        const d = parseLocalDate(record.date);
        const dayOfWeek = d.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekdaysFilled++;
        }
      }
    }

    res.json({
      weekStart,
      weekEnd,
      filledDays,
      weekdaysFilled,
      totalDays: 7,
    });
  } catch (error) {
    console.error('[Daily Log] 获取统计失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取统计失败',
    });
  }
});

export default router;
