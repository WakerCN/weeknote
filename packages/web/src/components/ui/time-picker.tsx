/**
 * 自定义时间选择器组件
 * 深色主题，与项目风格一致
 */

import { useState, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  disabled?: boolean;
}

/**
 * 格式化时间显示
 */
function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * 时间滚动列表
 */
function TimeColumn({
  values,
  selected,
  onSelect,
  label,
}: {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemHeight = 28;

  // 滚动到选中项
  useEffect(() => {
    if (listRef.current) {
      const scrollTop = selected * itemHeight;
      listRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [selected]);

  return (
    <div className="flex flex-col bg-[#0d1117] rounded overflow-hidden border border-[#30363d]">
      <div className="text-[10px] text-[#8b949e] text-center py-1 bg-[#161b22] border-b border-[#30363d]">
        {label}
      </div>
      <div
        ref={listRef}
        className="h-[140px] w-12 overflow-y-auto overflow-x-hidden bg-[#0d1117] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-[#0d1117] [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#484f58]"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#30363d #0d1117',
        }}
      >
        {values.map((value) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`
              w-full h-7 flex items-center justify-center text-xs transition-colors
              ${
                value === selected
                  ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                  : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
              }
            `}
          >
            {String(value).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 快捷时间选项（精简版）
 */
const QUICK_TIMES = [
  { label: '09:00', hour: 9, minute: 0 },
  { label: '10:00', hour: 10, minute: 0 },
  { label: '14:00', hour: 14, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '20:00', hour: 20, minute: 0 },
];

export function TimePicker({ hour, minute, onChange, disabled }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempHour, setTempHour] = useState(hour);
  const [tempMinute, setTempMinute] = useState(minute);

  // 同步外部值
  useEffect(() => {
    setTempHour(hour);
    setTempMinute(minute);
  }, [hour, minute]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    onChange(tempHour, tempMinute);
    setOpen(false);
  };

  const handleQuickSelect = (h: number, m: number) => {
    setTempHour(h);
    setTempMinute(m);
    onChange(h, m);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg
            text-sm text-[#f0f6fc] transition-colors
            hover:border-[#58a6ff] focus:outline-none focus:border-[#58a6ff]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <Clock className="w-4 h-4 text-[#8b949e]" />
          <span className="font-mono">{formatTime(hour, minute)}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl shadow-black/50 animate-in fade-in-0 zoom-in-95"
          sideOffset={4}
          align="start"
        >
          <div className="p-3">
            {/* 快捷选项 */}
            <div className="flex gap-1 mb-3 pb-2 border-b border-[#30363d]">
              {QUICK_TIMES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleQuickSelect(t.hour, t.minute)}
                  className={`
                    px-2 py-1 text-xs rounded transition-colors
                    ${
                      tempHour === t.hour && tempMinute === t.minute
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 时间选择器 */}
            <div className="flex items-center justify-center gap-1">
              <TimeColumn
                label="时"
                values={hours}
                selected={tempHour}
                onSelect={setTempHour}
              />
              <div className="flex items-center justify-center text-[#484f58] text-xl font-bold px-1">:</div>
              <TimeColumn
                label="分"
                values={minutes}
                selected={tempMinute}
                onSelect={setTempMinute}
              />
            </div>

            {/* 确认按钮 */}
            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-[#30363d]">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1 text-xs text-[#8b949e] hover:text-[#f0f6fc] rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="px-3 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
