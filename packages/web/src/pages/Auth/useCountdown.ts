/**
 * 倒计时 Hook
 * 管理验证码发送倒计时逻辑
 */
import { useState, useEffect, useCallback } from 'react';

export interface UseCountdownReturn {
  /** 当前倒计时秒数 */
  countdown: number;
  /** 开始倒计时 */
  start: (seconds?: number) => void;
  /** 重置倒计时 */
  reset: () => void;
  /** 是否正在倒计时 */
  isActive: boolean;
}

/**
 * 倒计时 Hook
 * @param initialSeconds - 默认倒计时秒数，默认60秒
 */
export function useCountdown(initialSeconds: number = 60): UseCountdownReturn {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const start = useCallback((seconds?: number) => {
    setCountdown(seconds ?? initialSeconds);
  }, [initialSeconds]);

  const reset = useCallback(() => {
    setCountdown(0);
  }, []);

  return {
    countdown,
    start,
    reset,
    isActive: countdown > 0,
  };
}
