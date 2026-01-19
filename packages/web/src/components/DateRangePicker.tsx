/**
 * 日期范围选择器组件 - 类似 Ant Design RangePicker
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatLocalDate,
  parseLocalDate,
  formatShortDate,
  getWeekStart,
  getWeekEnd,
  getLastWeekStart,
  getLastWeekEnd,
  getMonthStart,
  getMonthEnd,
  getDaysAgo,
  getDayCount,
} from '@/lib/date-utils';

interface DateRangePickerProps {
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 日期范围变化回调 */
  onChange: (startDate: string, endDate: string) => void;
  /** 已记录天数（用于显示统计） */
  filledDays?: number;
}

// 快捷选项
const QUICK_OPTIONS = [
  { label: '本周', getRange: () => ({ start: getWeekStart(), end: getWeekEnd(getWeekStart()) }) },
  { label: '上周', getRange: () => ({ start: getLastWeekStart(), end: getLastWeekEnd() }) },
  { label: '本月', getRange: () => ({ start: getMonthStart(), end: getMonthEnd() }) },
  { label: '近7天', getRange: () => ({ start: getDaysAgo(7), end: formatLocalDate(new Date()) }) },
  { label: '近30天', getRange: () => ({ start: getDaysAgo(30), end: formatLocalDate(new Date()) }) },
];

/**
 * 单月日历面板
 */
function MonthPanel({
  year,
  month,
  startDate,
  endDate,
  hoverDate,
  selectingStart,
  onDateClick,
  onDateHover,
}: {
  year: number;
  month: number;
  startDate: string | null;
  endDate: string | null;
  hoverDate: string | null;
  selectingStart: boolean;
  onDateClick: (date: string) => void;
  onDateHover: (date: string | null) => void;
}) {
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = formatLocalDate(new Date());
    
    const days: Array<{
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, isCurrentMonth: false, isToday: false });
    }

    // 填充当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: date === today,
      });
    }

    return days;
  }, [year, month]);

  // 判断日期是否在范围内
  const isInRange = (date: string) => {
    if (!startDate) return false;
    
    const effectiveEnd = endDate || (selectingStart ? null : hoverDate);
    if (!effectiveEnd) return false;
    
    const [rangeStart, rangeEnd] = startDate <= effectiveEnd 
      ? [startDate, effectiveEnd] 
      : [effectiveEnd, startDate];
    
    return date > rangeStart && date < rangeEnd;
  };

  // 判断是否是范围起点
  const isRangeStart = (date: string) => {
    if (!startDate) return false;
    const effectiveEnd = endDate || (selectingStart ? null : hoverDate);
    if (!effectiveEnd) return date === startDate;
    return date === (startDate <= effectiveEnd ? startDate : effectiveEnd);
  };

  // 判断是否是范围终点
  const isRangeEnd = (date: string) => {
    if (!startDate) return false;
    const effectiveEnd = endDate || (selectingStart ? null : hoverDate);
    if (!effectiveEnd) return false;
    return date === (startDate <= effectiveEnd ? effectiveEnd : startDate);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="w-[220px]">
      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-[#8b949e] py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-0">
        {calendarData.map((dayInfo, index) => {
          if (!dayInfo.isCurrentMonth) {
            return <div key={index} className="h-7" />;
          }

          const inRange = isInRange(dayInfo.date);
          const isStart = isRangeStart(dayInfo.date);
          const isEnd = isRangeEnd(dayInfo.date);
          const isSelected = isStart || isEnd;

          return (
            <div
              key={index}
              className={`
                h-7 flex items-center justify-center relative
                ${inRange ? 'bg-emerald-500/10' : ''}
                ${isStart ? 'rounded-l-md' : ''}
                ${isEnd ? 'rounded-r-md' : ''}
              `}
            >
              <button
                onClick={() => onDateClick(dayInfo.date)}
                onMouseEnter={() => onDateHover(dayInfo.date)}
                className={`
                  w-6 h-6 rounded-md text-xs flex items-center justify-center transition-colors z-10
                  ${isSelected 
                    ? 'bg-emerald-500 text-white' 
                    : dayInfo.isToday
                      ? 'text-cyan-400 hover:bg-[#30363d]'
                      : 'text-[#f0f6fc] hover:bg-[#30363d]'
                  }
                `}
              >
                {dayInfo.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  filledDays,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStartDate, setTempStartDate] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0, openUpward: false });
  
  // 当前显示的月份（左侧面板）
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = startDate ? parseLocalDate(startDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  // 右侧面板的月份
  const nextMonth = useMemo(() => {
    if (currentMonth.month === 12) {
      return { year: currentMonth.year + 1, month: 1 };
    }
    return { year: currentMonth.year, month: currentMonth.month + 1 };
  }, [currentMonth]);

  // 日历弹窗的预估高度
  const PICKER_HEIGHT = 320;

  // 计算选中的天数
  const totalDays = useMemo(() => getDayCount(startDate, endDate), [startDate, endDate]);

  // 处理快捷选项
  const handleQuickOption = (option: typeof QUICK_OPTIONS[0]) => {
    const { start, end } = option.getRange();
    onChange(start, end);
    setIsOpen(false);
  };

  // 打开选择器
  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const openUpward = spaceBelow < PICKER_HEIGHT;
      
      setPickerPosition({
        x: rect.left,
        y: openUpward ? rect.top : rect.bottom + 4,
        openUpward,
      });
    }
    setTempStartDate(null);
    setSelectingStart(true);
    setHoverDate(null);
    setIsOpen(true);
  };

  // 处理日期点击
  const handleDateClick = (date: string) => {
    if (selectingStart) {
      // 第一次点击，选择开始日期
      setTempStartDate(date);
      setSelectingStart(false);
    } else {
      // 第二次点击，选择结束日期并确认
      if (tempStartDate) {
        const [start, end] = tempStartDate <= date 
          ? [tempStartDate, date] 
          : [date, tempStartDate];
        onChange(start, end);
      }
      setIsOpen(false);
      setTempStartDate(null);
      setSelectingStart(true);
    }
  };

  // 切换到上一个月
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  // 切换到下一个月
  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const pickerElement = document.querySelector('.date-range-picker-popup');
      if (pickerElement && !pickerElement.contains(target) &&
          !triggerRef.current?.contains(target)) {
        setIsOpen(false);
        setTempStartDate(null);
        setSelectingStart(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 离开弹窗时清除 hover 状态
  const handleMouseLeave = () => {
    setHoverDate(null);
  };

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="flex items-center gap-3">
      {/* 快捷选项 */}
      <div className="flex items-center gap-1">
        {QUICK_OPTIONS.map((option) => (
          <button
            key={option.label}
            onClick={() => handleQuickOption(option)}
            className="px-2 py-1 rounded text-xs text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-[#30363d]" />

      {/* 日期范围触发器 */}
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] transition-colors text-sm"
      >
        <CalendarIcon className="w-4 h-4 text-[#8b949e]" />
        <span>{formatShortDate(startDate)}</span>
        <span className="text-[#8b949e]">~</span>
        <span>{formatShortDate(endDate)}</span>
      </button>

      {/* 统计信息 */}
      <div className="text-sm text-[#8b949e]">
        共 {totalDays} 天
        {filledDays !== undefined && (
          <span className="ml-1">
            ，已记录 <span className="text-emerald-400">{filledDays}</span> 天
          </span>
        )}
      </div>

      {/* 日期选择弹窗 */}
      {isOpen &&
        createPortal(
          <div
            className="date-range-picker-popup fixed z-[9999] bg-[#21262d] border border-[#30363d] rounded-lg shadow-xl p-4"
            style={
              pickerPosition.openUpward
                ? { left: pickerPosition.x, bottom: window.innerHeight - pickerPosition.y + 4 }
                : { left: pickerPosition.x, top: pickerPosition.y }
            }
            onMouseLeave={handleMouseLeave}
          >
            {/* 头部：月份切换 */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-[#30363d] text-[#8b949e]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-8">
                <span className="text-sm text-[#f0f6fc] font-medium">
                  {currentMonth.year}年{monthNames[currentMonth.month - 1]}
                </span>
                <span className="text-sm text-[#f0f6fc] font-medium">
                  {nextMonth.year}年{monthNames[nextMonth.month - 1]}
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-[#30363d] text-[#8b949e]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 提示文字 */}
            <div className="text-xs text-[#8b949e] text-center mb-3">
              {selectingStart ? '请选择开始日期' : '请选择结束日期'}
            </div>

            {/* 双月日历面板 */}
            <div className="flex gap-4">
              <MonthPanel
                year={currentMonth.year}
                month={currentMonth.month}
                startDate={tempStartDate}
                endDate={selectingStart ? null : null}
                hoverDate={hoverDate}
                selectingStart={selectingStart}
                onDateClick={handleDateClick}
                onDateHover={setHoverDate}
              />
              <div className="w-px bg-[#30363d]" />
              <MonthPanel
                year={nextMonth.year}
                month={nextMonth.month}
                startDate={tempStartDate}
                endDate={selectingStart ? null : null}
                hoverDate={hoverDate}
                selectingStart={selectingStart}
                onDateClick={handleDateClick}
                onDateHover={setHoverDate}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
