/**
 * 日历组件 - 用于每日记录页面的左侧导航
 * 
 * 功能：
 * - 月份切换与日期选择
 * - 显示中国法定节假日和调休工作日
 * - 显示每日记录状态
 */

import { useState, useEffect, useMemo } from 'react';
import { useRequest } from 'ahooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthSummary } from '../api';
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils';
import { getDateLabel, getHolidayName } from '@/lib/holidays';

interface CalendarProps {
  /** 当前选中的日期 */
  selectedDate: string;
  /** 选择日期回调 */
  onSelectDate: (date: string) => void;
  /** 刷新触发器，变化时会重新加载月份数据 */
  refreshKey?: number;
}

export default function Calendar({
  selectedDate,
  onSelectDate,
  refreshKey,
}: CalendarProps) {
  // 当前显示的月份
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? parseLocalDate(selectedDate) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  // 加载月份摘要数据
  const { data: monthData, loading } = useRequest(
    () => getMonthSummary(currentMonth.year, currentMonth.month),
    {
      refreshDeps: [currentMonth.year, currentMonth.month, refreshKey],
    }
  );

  // 当选中日期变化时，自动切换到对应月份
  useEffect(() => {
    if (selectedDate) {
      const d = parseLocalDate(selectedDate);
      const newMonth = { year: d.getFullYear(), month: d.getMonth() + 1 };
      if (newMonth.year !== currentMonth.year || newMonth.month !== currentMonth.month) {
        setCurrentMonth(newMonth);
      }
    }
  }, [selectedDate]);

  // 生成日历数据
  const calendarData = useMemo(() => {
    const { year, month } = currentMonth;
    
    // 月份第一天是星期几（0=周日）
    const firstDay = new Date(year, month - 1, 1).getDay();
    
    // 月份天数
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 上个月天数（用于填充）
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    
    const days: Array<{
      date: string;
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasContent: boolean;
      isWeekend: boolean;
      dateLabel?: { label: string; type: 'holiday-name' | 'holiday' | 'workday' | 'solar-term' | 'lunar'; fullName?: string };
      holidayName?: string;
    }> = [];

    const today = formatLocalDate(new Date());

    // 填充上月日期
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: date === today,
        isSelected: date === selectedDate,
        hasContent: false,
        isWeekend: false,
        dateLabel: getDateLabel(date),
        holidayName: getHolidayName(date),
      });
    }

    // 填充当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: date === today,
        isSelected: date === selectedDate,
        hasContent: monthData?.days?.[date]?.hasContent || false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        dateLabel: getDateLabel(date),
        holidayName: getHolidayName(date),
      });
    }

    // 填充下月日期（补齐到6行）
    const remainingDays = 42 - days.length; // 6行 * 7列 = 42
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: date === today,
        isSelected: date === selectedDate,
        hasContent: false,
        isWeekend: false,
        dateLabel: getDateLabel(date),
        holidayName: getHolidayName(date),
      });
    }

    return days;
  }, [currentMonth, selectedDate, monthData]);

  // 切换月份
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // 回到今天
  const handleGoToToday = () => {
    const today = new Date();
    const todayStr = formatLocalDate(today);
    setCurrentMonth({ year: today.getFullYear(), month: today.getMonth() + 1 });
    onSelectDate(todayStr);
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 统计当月已记录天数
  const filledDaysCount = useMemo(() => {
    if (!monthData?.days) return 0;
    return Object.values(monthData.days).filter((d) => d.hasContent).length;
  }, [monthData]);

  return (
    <div className="h-full flex flex-col bg-[#161b22] border-r border-[#30363d]">
      {/* 标题 */}
      <div className="p-4 border-b border-[#30363d]">
        <h2 className="text-[#f0f6fc] font-semibold flex items-center gap-2">
          <span>📅</span>
          <span>每日记录</span>
        </h2>
      </div>

      {/* 月份切换 */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-[#30363d]">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors duration-150"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-[#f0f6fc] font-medium text-base">
          {currentMonth.year}年 {monthNames[currentMonth.month - 1]}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors duration-150"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="px-3 py-2 grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0 || index === 6 ? 'text-[#484f58]' : 'text-[#8b949e]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="flex-1 px-3 pb-3 overflow-y-auto">
        <div 
          key={`${currentMonth.year}-${currentMonth.month}`}
          className="grid grid-cols-7 gap-1 animate-in fade-in duration-150"
        >
          {calendarData.map((dayInfo) => {
            // 判断是否为节假日类型（用于文字颜色）
            const isHolidayType = dayInfo.dateLabel?.type === 'holiday' || dayInfo.dateLabel?.type === 'holiday-name';
            const isWorkdayType = dayInfo.dateLabel?.type === 'workday';
            
            return (
              <button
                key={dayInfo.date}
                onClick={() => onSelectDate(dayInfo.date)}
                title={dayInfo.holidayName}
                className={`
                  min-h-[52px] rounded-lg text-sm flex flex-col items-center justify-start pt-1.5 gap-0.5 relative cursor-pointer
                  border border-transparent
                  transition-colors duration-150
                  ${!dayInfo.isCurrentMonth ? 'text-[#30363d] opacity-40' : ''}
                  ${dayInfo.isCurrentMonth && !dayInfo.isSelected ? 
                    (dayInfo.isWeekend && !isHolidayType && !isWorkdayType
                      ? 'text-[#8b949e] hover:bg-[#21262d]' 
                      : isHolidayType
                        ? 'text-rose-400 hover:bg-[#21262d]'
                        : isWorkdayType
                          ? 'text-amber-400 hover:bg-[#21262d]'
                          : 'text-[#f0f6fc] hover:bg-[#21262d]') 
                    : ''}
                  ${dayInfo.isSelected ? 'bg-emerald-500/20 text-emerald-400 !border-emerald-500/50' : ''}
                  ${dayInfo.isToday && !dayInfo.isSelected ? '!border-cyan-500/50' : ''}
                `}
              >
                {/* 已记录角标 - 右上角小勾 */}
                {dayInfo.isCurrentMonth && dayInfo.hasContent && (
                  <span className="absolute top-0.5 right-1 text-emerald-400 text-xs font-bold leading-none">
                    ✓
                  </span>
                )}
                
                {/* 日期数字 */}
                <span className="font-medium">{dayInfo.day}</span>
                
                {/* 日期标签：节假日名称 / 休 / 班 / 节气 / 农历 */}
                {dayInfo.isCurrentMonth && dayInfo.dateLabel && (
                  <span
                    className={`text-[10px] px-1 py-px rounded-sm max-w-full truncate ${
                      dayInfo.dateLabel.type === 'holiday-name'
                        ? 'bg-rose-500/20 text-rose-400 font-medium'
                        : dayInfo.dateLabel.type === 'holiday'
                          ? 'bg-rose-500/20 text-rose-400 font-medium'
                          : dayInfo.dateLabel.type === 'workday'
                            ? 'bg-amber-500/20 text-amber-400 font-medium'
                            : dayInfo.dateLabel.type === 'solar-term'
                              ? 'text-cyan-400/90 font-medium'
                              : 'text-[#6e7681]'
                    }`}
                  >
                    {dayInfo.dateLabel.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 图例和统计信息 */}
      <div className="px-4 py-3 border-t border-[#30363d] space-y-2">
        {/* 图例 */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            <span className="px-1 py-px rounded-sm bg-rose-500/20 text-rose-400 font-medium">休</span>
            <span className="text-[#6e7681]">假期</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-px rounded-sm bg-amber-500/20 text-amber-400 font-medium">班</span>
            <span className="text-[#6e7681]">调休</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-cyan-400/90 font-medium">节气</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#6e7681]">初五</span>
            <span className="text-[#484f58]">农历</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 text-xs font-bold leading-none">✓</span>
            <span className="text-[#6e7681]">已记录</span>
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="text-sm text-[#8b949e] flex items-center justify-between">
          <span>
            {loading ? '加载中...' : `本月已记录 ${filledDaysCount} 天`}
          </span>
          <button
            onClick={handleGoToToday}
            className="text-xs px-2 py-1 rounded bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors duration-150"
          >
            今天
          </button>
        </div>
      </div>
    </div>
  );
}
