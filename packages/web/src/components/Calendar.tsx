/**
 * 日历组件 - 用于每日记录页面的左侧导航
 */

import { useState, useEffect, useMemo } from 'react';
import { useRequest } from 'ahooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthSummary } from '../api';
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils';

interface CalendarProps {
  /** 当前选中的日期 */
  selectedDate: string;
  /** 选择日期回调 */
  onSelectDate: (date: string) => void;
}

export default function Calendar({
  selectedDate,
  onSelectDate,
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
      refreshDeps: [currentMonth.year, currentMonth.month],
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
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#30363d]">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-[#f0f6fc] font-medium">
          {currentMonth.year}年 {monthNames[currentMonth.month - 1]}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="px-4 py-2 grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs py-1 ${
              index === 0 || index === 6 ? 'text-[#484f58]' : 'text-[#8b949e]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="flex-1 px-4 pb-2">
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((dayInfo, index) => (
            <button
              key={index}
              onClick={() => onSelectDate(dayInfo.date)}
              className={`
                aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-all relative cursor-pointer
                ${!dayInfo.isCurrentMonth ? 'text-[#30363d]' : ''}
                ${dayInfo.isCurrentMonth && !dayInfo.isSelected ? 
                  (dayInfo.isWeekend ? 'text-[#8b949e] hover:bg-[#21262d]' : 'text-[#f0f6fc] hover:bg-[#21262d]') : ''}
                ${dayInfo.isSelected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : ''}
                ${dayInfo.isToday && !dayInfo.isSelected ? 'border border-cyan-500/50' : ''}
              `}
            >
              <span>{dayInfo.day}</span>
              {dayInfo.isCurrentMonth && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dayInfo.hasContent ? 'bg-emerald-400' : 'bg-[#30363d]'
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="px-4 py-3 border-t border-[#30363d]">
        <div className="text-sm text-[#8b949e] flex items-center justify-between">
          <span>
            {loading ? '加载中...' : `本月已记录 ${filledDaysCount} 天`}
          </span>
          <button
            onClick={handleGoToToday}
            className="text-xs px-2 py-1 rounded bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
          >
            今天
          </button>
        </div>
      </div>
    </div>
  );
}
