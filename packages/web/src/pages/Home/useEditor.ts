/**
 * 编辑器状态 Hook
 * 管理 Daily Log 内容和日期范围
 */
import { useState } from 'react';
import type { DateRange } from '@/api';

/**
 * 编辑器状态
 */
interface EditorState {
  /** Daily Log 内容 */
  dailyLog: string;
  /** 导入的日期范围（手动编辑后为 null） */
  dateRange: DateRange | null;
}

/**
 * 编辑器状态管理 Hook
 * @param defaultValue - 默认的 Daily Log 内容
 */
export function useEditor(defaultValue: string = '') {
  const [state, setState] = useState<EditorState>({
    dailyLog: defaultValue,
    dateRange: null,
  });

  /** 设置 Daily Log 内容 */
  const setDailyLog = (value: string) => {
    setState((prev) => ({ ...prev, dailyLog: value }));
  };

  /** 导入每日记录（同时设置内容和日期范围） */
  const importDailyRecords = (data: {
    text: string;
    startDate: string;
    endDate: string;
  }) => {
    setState({
      dailyLog: data.text,
      dateRange: { startDate: data.startDate, endDate: data.endDate },
    });
  };

  /** 清除日期范围（用户手动编辑后调用） */
  const clearDateRange = () => {
    setState((prev) => ({ ...prev, dateRange: null }));
  };

  /** 重置为初始值 */
  const reset = (newDefault?: string) => {
    setState({
      dailyLog: newDefault ?? defaultValue,
      dateRange: null,
    });
  };

  return {
    // 状态
    dailyLog: state.dailyLog,
    dateRange: state.dateRange,
    // 方法
    setDailyLog,
    importDailyRecords,
    clearDateRange,
    reset,
  };
}
