/**
 * 日期切换过渡 Hook
 * 
 * 管理日期切换时的 loading 遮罩状态，确保只有"主动切换日期"时才显示遮罩
 */

import { useState, useEffect, useRef } from 'react';

export interface UseDateSwitchingOptions {
  /** URL 中的日期参数 */
  urlDate: string | undefined;
  /** 当前选中日期 */
  selectedDate: string;
  /** 记录是否正在加载 */
  recordLoading: boolean;
}

export interface UseDateSwitchingReturn {
  /** 是否正在切换日期（用于显示遮罩） */
  isSwitching: boolean;
  /** 触发日期切换（在 setSelectedDate 前调用） */
  startSwitch: (targetDate: string) => void;
}

export function useDateSwitching({
  urlDate,
  selectedDate,
  recordLoading,
}: UseDateSwitchingOptions): UseDateSwitchingReturn {
  const [isSwitching, setIsSwitching] = useState(false);
  
  // 记录切换目标和是否已经看到 loading 状态
  const switchRef = useRef<{ target: string | null; sawLoading: boolean }>({
    target: null,
    sawLoading: false,
  });
  
  // 记录上一次处理的 URL 日期
  const prevUrlDateRef = useRef<string | undefined>(urlDate);

  // 当 URL 参数变化时触发切换
  useEffect(() => {
    if (urlDate && urlDate !== prevUrlDateRef.current) {
      prevUrlDateRef.current = urlDate;
      
      if (urlDate !== selectedDate) {
        setIsSwitching(true);
        switchRef.current = { target: urlDate, sawLoading: false };
      }
    }
  }, [urlDate, selectedDate]);

  // 监听 recordLoading：只有"因切换日期"触发的加载才会驱动结束
  useEffect(() => {
    const { target, sawLoading } = switchRef.current;
    if (!isSwitching || !target || target !== selectedDate) return;

    if (recordLoading) {
      if (!sawLoading) {
        switchRef.current = { target, sawLoading: true };
      }
      return;
    }

    if (sawLoading) {
      setIsSwitching(false);
      switchRef.current = { target: null, sawLoading: false };
    }
  }, [recordLoading, selectedDate, isSwitching]);

  const startSwitch = (targetDate: string) => {
    setIsSwitching(true);
    switchRef.current = { target: targetDate, sawLoading: false };
  };

  return {
    isSwitching,
    startSwitch,
  };
}
