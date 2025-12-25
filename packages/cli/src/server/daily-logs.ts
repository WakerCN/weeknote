/**
 * 每日记录 API 路由
 */

import { Router, type Router as ExpressRouter } from 'express';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import {
  dailyLogManager,
  getDayOfWeek,
  getWeekStart,
  getWeekInfo,
  getWeekEnd,
  getWeekFileName,
  DAILY_LOG_DIR,
} from '@weeknote/core';

const router: ExpressRouter = Router();

/**
 * 获取所有周文件列表
 */
router.get('/weeks', async (_req, res) => {
  try {
    const summaries = await dailyLogManager.getWeekSummaries();
    res.json({ weeks: summaries });
  } catch (error) {
    res.status(500).json({ error: '获取周列表失败', message: (error as Error).message });
  }
});

/**
 * 获取某周的所有记录
 */
router.get('/week', async (req, res) => {
  try {
    const date = req.query.date as string || new Date().toISOString();
    const weekFile = await dailyLogManager.getWeek(date);
    
    if (!weekFile) {
      // 如果周文件不存在，返回空结构
      const weekStart = getWeekStart(new Date(date));
      const { year, week } = getWeekInfo(new Date(date));
      const weekEnd = getWeekEnd(weekStart);
      
      res.json({
        version: 1,
        year,
        week,
        weekStart,
        weekEnd,
        days: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      res.json(weekFile);
    }
  } catch (error) {
    res.status(500).json({ error: '获取周记录失败', message: (error as Error).message });
  }
});

/**
 * 获取某天的记录
 */
router.get('/day/:date', async (req, res) => {
  try {
    const record = await dailyLogManager.getDay(req.params.date);
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '获取记录失败', message: (error as Error).message });
  }
});

/**
 * 保存某天的记录
 */
router.post('/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { plan, result, issues, notes } = req.body;
    
    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日期格式错误，应为 YYYY-MM-DD' });
    }
    
    // 验证日期不能是未来
    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dateObj > today) {
      return res.status(400).json({ error: '不能记录未来的日期' });
    }
    
    const dayOfWeek = getDayOfWeek(date);
    
    await dailyLogManager.saveDay({
      date,
      dayOfWeek,
      plan: Array.isArray(plan) ? plan : [],
      result: Array.isArray(result) ? result : [],
      issues: Array.isArray(issues) ? issues : [],
      notes: Array.isArray(notes) ? notes : [],
    });
    
    const updated = await dailyLogManager.getDay(date);
    res.json({ success: true, record: updated });
  } catch (error) {
    res.status(500).json({ error: '保存记录失败', message: (error as Error).message });
  }
});

/**
 * 导出为文本格式
 */
router.get('/export', async (req, res) => {
  try {
    const date = req.query.date as string || new Date().toISOString();
    const text = await dailyLogManager.exportAsText(date);
    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: '导出失败', message: (error as Error).message });
  }
});

/**
 * 获取记录统计
 */
router.get('/stats', async (req, res) => {
  try {
    const date = req.query.date as string || new Date().toISOString();
    const stats = await dailyLogManager.getWeekStats(date);
    
    if (!stats) {
      const weekStart = getWeekStart(new Date(date));
      const weekEnd = getWeekEnd(weekStart);
      res.json({
        weekStart,
        weekEnd,
        filledDays: 0,
        weekdaysFilled: 0,
        totalDays: 7,
      });
    } else {
      res.json(stats);
    }
  } catch (error) {
    res.status(500).json({ error: '获取统计失败', message: (error as Error).message });
  }
});

/**
 * 删除某周的记录
 */
router.delete('/week', async (req, res) => {
  try {
    const fileName = req.query.fileName as string;
    
    if (!fileName) {
      return res.status(400).json({ error: '缺少文件名参数' });
    }
    
    const success = await dailyLogManager.deleteWeekByFileName(fileName);
    
    if (success) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ error: '未找到该周的记录文件' });
    }
  } catch (error) {
    res.status(500).json({ error: '删除失败', message: (error as Error).message });
  }
});

/**
 * 在资源管理器中打开文件位置
 */
router.post('/open-in-explorer', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: '缺少日期参数' });
    }
    
    const fileName = getWeekFileName(date);
    const filePath = path.join(DAILY_LOG_DIR, fileName);
    const platform = os.platform();
    
    let command: string;
    if (platform === 'darwin') {
      // macOS: 使用 open -R 在 Finder 中显示文件
      command = `open -R "${filePath}"`;
    } else if (platform === 'win32') {
      // Windows: 使用 explorer /select
      command = `explorer /select,"${filePath}"`;
    } else {
      // Linux: 使用 xdg-open 打开目录
      command = `xdg-open "${DAILY_LOG_DIR}"`;
    }
    
    exec(command, (error) => {
      if (error) {
        // 如果文件不存在，打开目录
        const dirCommand = platform === 'darwin' 
          ? `open "${DAILY_LOG_DIR}"`
          : platform === 'win32'
            ? `explorer "${DAILY_LOG_DIR}"`
            : `xdg-open "${DAILY_LOG_DIR}"`;
        
        exec(dirCommand, (dirError) => {
          if (dirError) {
            res.status(500).json({ error: '无法打开资源管理器', message: dirError.message });
          } else {
            res.json({ success: true, opened: 'directory' });
          }
        });
      } else {
        res.json({ success: true, opened: 'file' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: '打开失败', message: (error as Error).message });
  }
});

export default router;

