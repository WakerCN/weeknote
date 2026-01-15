/**
 * 自动保存 Hook
 * 封装定时保存、手动保存、快捷键等逻辑
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useInterval } from 'ahooks';

/** 自动保存间隔（毫秒） */
const AUTO_SAVE_INTERVAL = 60 * 1000; // 1分钟
/** 相对时间刷新间隔（毫秒） */
const TIME_REFRESH_INTERVAL = 30 * 1000; // 30秒

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export interface AutoSaveOptions<T> {
  /** 当前数据 */
  data: T;
  /** 初始数据（用于比较是否有修改） */
  initialData: T;
  /** 保存函数 */
  onSave: (data: T) => Promise<void>;
  /** 是否禁用自动保存（如加载中） */
  disabled?: boolean;
  /** 数据比较函数，默认使用 JSON.stringify 比较 */
  isEqual?: (a: T, b: T) => boolean;
}

export interface AutoSaveResult {
  /** 当前保存状态 */
  status: SaveStatus;
  /** 上次保存时间 */
  lastSavedTime: Date | null;
  /** 格式化的上次保存时间 */
  lastSavedTimeText: string;
  /** 是否有未保存的修改 */
  isDirty: boolean;
  /** 手动触发保存 */
  save: () => void;
  /** 标记数据已修改 */
  markDirty: () => void;
  /** 重置状态（切换数据源时调用） */
  reset: () => void;
}

// 默认比较函数
const defaultIsEqual = <T>(a: T, b: T): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

// 格式化上次保存时间
const formatLastSavedTime = (time: Date | null): string => {
  if (!time) return '';

  const now = new Date();
  const diffMs = now.getTime() - time.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 10) return '刚刚';
  if (diffSec < 60) return `${diffSec}秒前`;
  if (diffMin < 60) return `${diffMin}分钟前`;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export function useAutoSave<T>({
  data,
  initialData,
  onSave,
  disabled = false,
  isEqual = defaultIsEqual,
}: AutoSaveOptions<T>): AutoSaveResult {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [, setTimeRefresh] = useState(0);

  // 使用 ref 存储最新值，避免闭包陷阱
  const dataRef = useRef(data);
  const initialDataRef = useRef(initialData);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);

  // 同步 ref
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // 用于触发重新计算 isDirty
  const [dirtyCheckVersion, setDirtyCheckVersion] = useState(0);

  // 计算是否有修改（使用 ref 存储的初始值，这样保存后能正确反映状态）
  const isDirty = !isEqual(data, initialDataRef.current);

  // 同步 dirty 状态到 status
  useEffect(() => {
    if (disabled) return;

    if (isDirty && status === 'saved') {
      setStatus('unsaved');
    } else if (!isDirty && status === 'unsaved') {
      setStatus('saved');
    }
  }, [isDirty, status, disabled, dirtyCheckVersion]);

  // 执行保存
  const doSave = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;
    if (isEqual(dataRef.current, initialDataRef.current)) return true;

    isSavingRef.current = true;
    setStatus('saving');

    try {
      await onSaveRef.current(dataRef.current);
      initialDataRef.current = dataRef.current;
      setStatus('saved');
      setLastSavedTime(new Date());
      // 触发重新计算 isDirty
      setDirtyCheckVersion((v) => v + 1);
      return true;
    } catch (error) {
      setStatus('unsaved');
      console.error('保存失败:', error);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [isEqual]);

  // 手动保存
  const save = useCallback(() => {
    if (!disabled) {
      doSave();
    }
  }, [doSave, disabled]);

  // 标记为脏
  const markDirty = useCallback(() => {
    if (status !== 'unsaved') {
      setStatus('unsaved');
    }
  }, [status]);

  // 重置状态
  const reset = useCallback(() => {
    isSavingRef.current = false;
    setStatus('saved');
    setLastSavedTime(null);
    // 触发重新计算 isDirty
    setDirtyCheckVersion((v) => v + 1);
  }, []);

  // 定时自动保存
  useInterval(() => {
    if (!disabled && !isEqual(dataRef.current, initialDataRef.current)) {
      doSave();
    }
  }, AUTO_SAVE_INTERVAL);

  // 定时刷新相对时间显示
  useInterval(() => {
    if (lastSavedTime) {
      setTimeRefresh((v) => v + 1);
    }
  }, TIME_REFRESH_INTERVAL);

  // 快捷键 Cmd/Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  return {
    status,
    lastSavedTime,
    lastSavedTimeText: formatLastSavedTime(lastSavedTime),
    isDirty,
    save,
    markDirty,
    reset,
  };
}
