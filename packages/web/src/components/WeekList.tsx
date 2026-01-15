/**
 * 周列表组件
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, FolderOpen, MoreVertical, Trash2 } from 'lucide-react';
import type { WeekSummary, DailyRecord } from '../api';
import { openInExplorer, deleteWeek } from '../api';
import { formatMonthDay } from '../lib/date-utils';
import { toast } from 'sonner';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  weekStart: string;
  fileName: string;
}

interface DeleteConfirmState {
  visible: boolean;
  fileName: string;
  weekLabel: string;
}

interface WeekListProps {
  /** 周摘要列表 */
  weeks: WeekSummary[];
  /** 当前选中的日期 */
  selectedDate: string;
  /** 选择日期回调 */
  onSelectDate: (date: string) => void;
  /** 周数据 */
  weekData?: Record<string, DailyRecord>;
  /** 当前周的起始日期 */
  currentWeekStart: string;
  /** 补录回调 */
  onBackfill: () => void;
  /** 刷新列表回调 */
  onRefresh?: () => void;
}

export default function WeekList({
  weeks,
  selectedDate,
  onSelectDate,
  weekData = {},
  currentWeekStart,
  onBackfill,
  onRefresh,
}: WeekListProps) {
  // 获取今天的日期字符串
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set([currentWeekStart]));
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    weekStart: '',
    fileName: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    visible: false,
    fileName: '',
    weekLabel: '',
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    // 延迟添加监听器，避免当前右键事件立即触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // 当 currentWeekStart 变化时，自动展开该周
  useEffect(() => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      newSet.add(currentWeekStart);
      return newSet;
    });
  }, [currentWeekStart]);

  const toggleWeek = (weekStart: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekStart)) {
      newExpanded.delete(weekStart);
    } else {
      newExpanded.add(weekStart);
    }
    setExpandedWeeks(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, weekStart: string, fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      weekStart,
      fileName,
    });
  };

  const handleMoreClick = (e: React.MouseEvent, weekStart: string, fileName: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: rect.left,
      y: rect.bottom + 4,
      weekStart,
      fileName,
    });
  };

  const handleOpenInExplorer = async () => {
    try {
      await openInExplorer(contextMenu.weekStart);
      toast.success('已在资源管理器中打开');
    } catch {
      toast.error('打开失败');
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleDeleteClick = () => {
    const week = weeks.find((w) => w.weekStart === contextMenu.weekStart);
    if (!contextMenu.fileName) {
      toast.info('该周还没有记录，无需删除');
      setContextMenu((prev) => ({ ...prev, visible: false }));
      return;
    }
    if (week) {
      setDeleteConfirm({
        visible: true,
        fileName: contextMenu.fileName,
        weekLabel: `${week.year} / ${formatMonthDay(week.weekStart)}~${formatMonthDay(week.weekEnd)}`,
      });
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteWeek(deleteConfirm.fileName);
      toast.success('删除成功');
      onRefresh?.();
    } catch {
      toast.error('删除失败');
    }
    setDeleteConfirm({ visible: false, fileName: '', weekLabel: '' });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ visible: false, fileName: '', weekLabel: '' });
  };

  const getWeekDates = (weekStart: string, weekEnd: string): string[] => {
    // 防御性检查
    if (!weekStart || !weekEnd) {
      console.warn('[WeekList] getWeekDates 收到无效参数:', { weekStart, weekEnd });
      return [];
    }
    const dates: string[] = [];
    const start = new Date(weekStart);
    const end = new Date(weekEnd);

    // 检查日期是否有效
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('[WeekList] 无效的日期:', { weekStart, weekEnd });
      return [];
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates;
  };

  const hasContent = (date: string): boolean => {
    const record = weekData[date];
    if (!record) return false;
    // 防御性检查：确保字段是字符串
    const plan = record.plan || '';
    const result = record.result || '';
    const issues = record.issues || '';
    const notes = record.notes || '';
    return plan.length > 0 || result.length > 0 || issues.length > 0 || notes.length > 0;
  };

  const isWeekend = (date: string): boolean => {
    const d = new Date(date);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="h-full flex flex-col bg-[#161b22] border-r border-[#30363d]">
      {/* 标题 */}
      <div className="p-4 border-b border-[#30363d]">
        <h2 className="text-[#f0f6fc] font-semibold flex items-center gap-2">
          <span>📅</span>
          <span>历史记录</span>
        </h2>
      </div>

      {/* 周列表 */}
      <div className="flex-1 overflow-y-auto">
        {weeks.length === 0 ? (
          <div className="p-4 text-center text-[#8b949e] text-sm">暂无记录</div>
        ) : (
          <div className="p-2">
            {weeks.map((week) => {
              const isExpanded = expandedWeeks.has(week.weekStart);
              const dates = getWeekDates(week.weekStart, week.weekEnd);
              const weekdays = dates.filter((d) => !isWeekend(d));
              const weekends = dates.filter((d) => isWeekend(d));
              const weekendHasRecords = weekends.some((d) => hasContent(d));

              return (
                <div key={week.fileName || week.weekStart} className="mb-2">
                  {/* 周标题 */}
                  <div className="flex items-center group">
                    <button
                      onClick={() => toggleWeek(week.weekStart)}
                      onContextMenu={(e) => handleContextMenu(e, week.weekStart, week.fileName)}
                      className="flex-1 px-3 py-2 rounded-lg flex items-center justify-between text-left hover:bg-[#21262d] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          className={`w-4 h-4 text-[#8b949e] transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                        <span className="text-sm text-[#f0f6fc]">
                          {week.year} / {formatMonthDay(week.weekStart)}~
                          {formatMonthDay(week.weekEnd)}
                        </span>
                      </div>
                      <span className="text-xs text-[#8b949e]">({week.filledDays})</span>
                    </button>
                    <button
                      onClick={(e) => handleMoreClick(e, week.weekStart, week.fileName)}
                      className="p-1 rounded hover:bg-[#30363d] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="更多选项"
                    >
                      <MoreVertical className="w-4 h-4 text-[#8b949e]" />
                    </button>
                  </div>

                  {/* 日期列表 - 使用 grid 实现高度动画 */}
                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-6 mt-1 space-y-1">
                        {/* 工作日 */}
                        {weekdays.map((date, index) => {
                          const hasRecord = hasContent(date);
                          const isSelected = selectedDate === date;
                          const isToday = date === todayStr;
                          const record = weekData[date];

                          return (
                            <button
                              key={date}
                              onClick={() => onSelectDate(date)}
                              style={{
                                transitionProperty:
                                  'transform, opacity, background-color, border-color',
                                transitionDuration: '150ms',
                                transitionDelay: isExpanded
                                  ? `${index * 50}ms, ${index * 50}ms, 0ms, 0ms`
                                  : '0ms',
                              }}
                              className={`
                                w-full px-3 py-1.5 rounded-lg flex items-center justify-between text-left text-sm border
                                ${
                                  isExpanded
                                    ? 'translate-x-0 opacity-100'
                                    : '-translate-x-2 opacity-0'
                                }
                                ${
                                  isSelected
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                    : isToday
                                      ? 'border-cyan-500/50 hover:bg-[#21262d] text-[#f0f6fc]'
                                      : 'border-transparent hover:bg-[#21262d] text-[#f0f6fc]'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{formatMonthDay(date)}</span>
                                {isToday && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">
                                    今天
                                  </span>
                                )}
                                <span className="text-xs text-[#8b949e]">
                                  {record?.dayOfWeek || ''}
                                </span>
                              </div>
                              <span className={hasRecord ? 'text-emerald-400' : 'text-[#484f58]'}>
                                {hasRecord ? '●' : '○'}
                              </span>
                            </button>
                          );
                        })}

                        {/* 周末 */}
                        {weekends.length > 0 && (
                          <div
                            className={`pt-2 border-t border-[#30363d] transition-all duration-150 ${
                              isExpanded ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{
                              transitionDelay: isExpanded ? `${weekdays.length * 50}ms` : '0ms',
                            }}
                          >
                            <div className="text-xs text-[#8b949e] px-3 py-1">
                              周末{' '}
                              {weekendHasRecords && (
                                <span className="text-emerald-400">有记录</span>
                              )}
                            </div>
                            {weekends.map((date, index) => {
                              const hasRecord = hasContent(date);
                              const isSelected = selectedDate === date;
                              const isToday = date === todayStr;
                              const record = weekData[date];

                              return (
                                <button
                                  key={date}
                                  onClick={() => onSelectDate(date)}
                                  style={{
                                    transitionProperty:
                                      'transform, opacity, background-color, border-color',
                                    transitionDuration: '150ms',
                                    transitionDelay: isExpanded
                                      ? `${(weekdays.length + 1 + index) * 50}ms, ${(weekdays.length + 1 + index) * 50}ms, 0ms, 0ms`
                                      : '0ms',
                                  }}
                                  className={`
                                    w-full px-3 py-1.5 rounded-lg flex items-center justify-between text-left text-sm border
                                    ${
                                      isExpanded
                                        ? 'translate-x-0 opacity-100'
                                        : '-translate-x-2 opacity-0'
                                    }
                                    ${
                                      isSelected
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                        : isToday
                                          ? 'border-cyan-500/50 hover:bg-[#21262d] text-[#8b949e]'
                                          : 'border-transparent hover:bg-[#21262d] text-[#8b949e]'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">
                                      {formatMonthDay(date)}
                                    </span>
                                    {isToday && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">
                                        今天
                                      </span>
                                    )}
                                    <span className="text-xs text-[#8b949e]">
                                      {record?.dayOfWeek || ''}
                                    </span>
                                  </div>
                                  <span
                                    className={hasRecord ? 'text-emerald-400' : 'text-[#484f58]'}
                                  >
                                    {hasRecord ? '●' : '○'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 补录按钮 */}
      <div className="p-4 border-t border-[#30363d]">
        <button
          onClick={onBackfill}
          className="w-full px-4 py-2 rounded-lg bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>补录其他日期</span>
        </button>
      </div>

      {/* 右键菜单 - 使用 Portal 渲染到 body */}
      {contextMenu.visible &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-[#21262d] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleOpenInExplorer}
              className="w-full px-3 py-2 text-left text-sm text-[#f0f6fc] hover:bg-[#30363d] flex items-center gap-2 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              <span>在资源管理器中打开</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#30363d] flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>删除本周记录</span>
            </button>
          </div>,
          document.body
        )}

      {/* 删除确认弹窗 */}
      {deleteConfirm.visible &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
            <div className="bg-[#21262d] border border-[#30363d] rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-[#f0f6fc] mb-2">确认删除</h3>
              <p className="text-[#8b949e] mb-4">
                确定要删除 <span className="text-[#f0f6fc] font-medium">{deleteConfirm.weekLabel}</span> 的所有记录吗？此操作不可恢复。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 rounded-lg bg-[#30363d] text-[#f0f6fc] hover:bg-[#484f58] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
