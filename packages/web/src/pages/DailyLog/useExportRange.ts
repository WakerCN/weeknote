/**
 * 导出日期范围管理 Hook
 * 
 * 管理导出的起止日期、填写天数统计、弹窗显示状态
 */

import { useState, useEffect } from 'react';
import { useRequest } from 'ahooks';
import { getDateRange } from '@/api';
import { getWeekStart, getWeekEnd } from '@/lib/date-utils';

export interface UseExportRangeReturn {
  /** 导出起始日期 */
  startDate: string;
  /** 导出结束日期 */
  endDate: string;
  /** 范围内已填写天数 */
  filledDays: number | undefined;
  /** 导出弹窗是否显示 */
  showDialog: boolean;
  /** 设置日期范围 */
  setRange: (start: string, end: string) => void;
  /** 打开导出弹窗 */
  openDialog: () => void;
  /** 关闭导出弹窗 */
  closeDialog: () => void;
  /** 刷新统计（当保存记录后调用） */
  refreshStats: () => void;
}

export function useExportRange(): UseExportRangeReturn {
  // 默认本周周一到周日
  const [startDate, setStartDate] = useState(() => getWeekStart());
  const [endDate, setEndDate] = useState(() => getWeekEnd(getWeekStart()));
  const [filledDays, setFilledDays] = useState<number | undefined>(undefined);
  const [showDialog, setShowDialog] = useState(false);

  // 加载范围内的统计
  const { run: loadStats } = useRequest(
    async () => {
      const result = await getDateRange(startDate, endDate);
      return result;
    },
    {
      manual: true,
      onSuccess: (result) => {
        setFilledDays(result?.stats?.filled ?? 0);
      },
    }
  );

  // 范围变化时重新加载统计
  useEffect(() => {
    loadStats();
  }, [startDate, endDate]);

  const setRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return {
    startDate,
    endDate,
    filledDays,
    showDialog,
    setRange,
    openDialog: () => setShowDialog(true),
    closeDialog: () => setShowDialog(false),
    refreshStats: loadStats,
  };
}
