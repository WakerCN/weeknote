/**
 * 日期选择器组件
 */

import { useState } from 'react';

interface DatePickerProps {
  /** 当前选中的日期 */
  value?: string;
  /** 选择日期回调 */
  onSelect: (date: string) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 最大可选日期（默认今天） */
  maxDate?: Date;
}

export default function DatePicker({ value, onSelect, onClose, maxDate = new Date() }: DatePickerProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 获取月份第一天是星期几
  const firstDay = new Date(year, month, 1).getDay();
  
  // 获取月份天数
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // 生成日期数组
  const days: (number | null)[] = [];
  // 填充前面的空位
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // 填充日期
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelect = (day: number) => {
    const selectedDate = new Date(year, month, day);
    
    // 检查是否超过最大日期
    if (selectedDate > maxDate) {
      return;
    }
    
    // 使用本地时间格式化日期，避免时区问题
    const yearStr = selectedDate.getFullYear();
    const monthStr = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = selectedDate.getDate().toString().padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    
    onSelect(dateStr);
    onClose();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    );
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const selected = new Date(value);
    return (
      year === selected.getFullYear() &&
      month === selected.getMonth() &&
      day === selected.getDate()
    );
  };

  const isDisabled = (day: number) => {
    const date = new Date(year, month, day);
    return date > maxDate;
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 w-[320px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-[#f0f6fc] font-medium">
            {year}年 {monthNames[month]}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs text-[#8b949e] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} />;
            }

            const today = isToday(day);
            const selected = isSelected(day);
            const disabled = isDisabled(day);

            return (
              <button
                key={index}
                onClick={() => !disabled && handleSelect(day)}
                disabled={disabled}
                className={`
                  aspect-square rounded text-sm transition-colors
                  ${disabled
                    ? 'text-[#484f58] cursor-not-allowed'
                    : selected
                      ? 'bg-emerald-500 text-white'
                      : today
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'text-[#f0f6fc] hover:bg-[#21262d]'
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* 提示 */}
        <div className="mt-4 text-xs text-[#8b949e] text-center">
          💡 只能选择今天及之前的日期
        </div>

        {/* 按钮 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

