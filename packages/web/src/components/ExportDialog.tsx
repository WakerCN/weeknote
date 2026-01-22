/**
 * 每日记录导出弹窗组件
 * 支持 Markdown 和 JSON 格式导出，带进度显示
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, FileJson, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import {
  getDailyLogsForExport,
  type DailyRecord,
  type ExportFormat,
  type ExportProgress,
} from '../api';
import {
  getDayCount,
  splitDateRangeByMonth,
  formatLocalDate,
  parseLocalDate,
  getWeekStart,
  getWeekEnd,
  getLastWeekStart,
  getLastWeekEnd,
  getMonthStart,
  getMonthEnd,
  getLastMonthStart,
  getLastMonthEnd,
  getYearStart,
  getToday,
  getThreeMonthsAgo,
  EXPORT_LIMITS,
} from '../lib/date-utils';

interface ExportDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 初始开始日期 */
  initialStartDate: string;
  /** 初始结束日期 */
  initialEndDate: string;
  /** 初始已记录天数（可选） */
  initialFilledDays?: number;
}

// 快捷选项
const QUICK_OPTIONS = [
  { label: '本周', getRange: () => ({ start: getWeekStart(), end: getWeekEnd(getWeekStart()) }) },
  { label: '上周', getRange: () => ({ start: getLastWeekStart(), end: getLastWeekEnd() }) },
  { label: '本月', getRange: () => ({ start: getMonthStart(), end: getMonthEnd() }) },
  { label: '上月', getRange: () => ({ start: getLastMonthStart(), end: getLastMonthEnd() }) },
  { label: '近三月', getRange: () => ({ start: getThreeMonthsAgo(), end: getToday() }) },
  { label: '今年', getRange: () => ({ start: getYearStart(), end: getToday() }) },
];

/**
 * 单月日历面板（与 DateRangePicker 保持一致）
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
    <div className="w-[200px]">
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

/**
 * 格式化为 Markdown
 */
function formatToMarkdown(
  records: DailyRecord[],
  startDate: string,
  endDate: string,
  totalDays: number,
  filledDays: number,
  includeEmpty: boolean
): string {
  const lines: string[] = [];
  const now = new Date();
  const exportTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 头部信息
  lines.push('# 每日记录');
  lines.push('');
  lines.push(`> 📅 日期范围：${startDate} ~ ${endDate}`);
  lines.push(`> 📊 共 ${totalDays} 天，其中 ${filledDays} 天有记录`);
  lines.push(`> 🕐 导出时间：${exportTime}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 创建日期到记录的映射
  const recordMap = new Map<string, DailyRecord>();
  for (const record of records) {
    recordMap.set(record.date, record);
  }

  // 遍历日期范围
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateStr = formatLocalDate(current);
    const record = recordMap.get(dateStr);
    
    if (record) {
      // 有记录的日期
      const hasContent = record.plan || record.result || record.issues || record.notes;
      
      if (hasContent) {
        lines.push(`## ${dateStr} | ${record.dayOfWeek}`);
        lines.push('');
        
        if (record.plan) {
          lines.push('### 📋 Plan');
          lines.push(record.plan);
          lines.push('');
        }
        
        if (record.result) {
          lines.push('### ✅ Result');
          lines.push(record.result);
          lines.push('');
        }
        
        if (record.issues) {
          lines.push('### ⚠️ Issues');
          lines.push(record.issues);
          lines.push('');
        }
        
        if (record.notes) {
          lines.push('### 📝 Notes');
          lines.push(record.notes);
          lines.push('');
        }
        
        lines.push('---');
        lines.push('');
      } else if (includeEmpty) {
        // 有记录但内容为空
        lines.push(`## ${dateStr} | ${record.dayOfWeek}`);
        lines.push('');
        lines.push('*（当天无记录）*');
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    } else if (includeEmpty) {
      // 没有记录
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][current.getDay()];
      lines.push(`## ${dateStr.slice(5)} | ${dayOfWeek}`);
      lines.push('');
      lines.push('*（当天无记录）*');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    current.setDate(current.getDate() + 1);
  }

  return lines.join('\n');
}

/**
 * 格式化为 JSON
 */
function formatToJson(
  records: DailyRecord[],
  startDate: string,
  endDate: string,
  totalDays: number,
  filledDays: number
): string {
  const exportData = {
    exportInfo: {
      version: '1.0.0',
      type: 'dailyLogs',
      exportedAt: new Date().toISOString(),
      dateRange: {
        startDate,
        endDate,
      },
      stats: {
        totalDays,
        filledDays,
      },
    },
    data: records.map((r) => ({
      date: r.date,
      dayOfWeek: r.dayOfWeek,
      plan: r.plan,
      result: r.result,
      issues: r.issues,
      notes: r.notes,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 触发文件下载
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 验证日期字符串格式是否为 YYYY-MM-DD
 */
function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = parseLocalDate(dateStr);
  return !isNaN(d.getTime());
}

export default function ExportDialog({
  open,
  onClose,
  initialStartDate,
  initialEndDate,
  initialFilledDays,
}: ExportDialogProps) {
  // 日期范围
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  
  // 日期输入框状态
  const [inputStartDate, setInputStartDate] = useState(initialStartDate);
  const [inputEndDate, setInputEndDate] = useState(initialEndDate);
  const [inputError, setInputError] = useState<string | null>(null);
  
  // 日历状态
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStartDate, setTempStartDate] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = parseLocalDate(initialStartDate);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  
  // 右侧面板的月份
  const nextMonth = useMemo(() => {
    if (currentMonth.month === 12) {
      return { year: currentMonth.year + 1, month: 1 };
    }
    return { year: currentMonth.year, month: currentMonth.month + 1 };
  }, [currentMonth]);
  
  // 导出选项
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeEmpty, setIncludeEmpty] = useState(false);
  
  // 进度状态
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  
  // 取消标记
  const cancelledRef = useRef(false);
  
  // 计算天数
  const dayCount = useMemo(() => getDayCount(startDate, endDate), [startDate, endDate]);
  const isOverLimit = dayCount > EXPORT_LIMITS.MAX_DAYS;
  const needsProgress = dayCount > EXPORT_LIMITS.INSTANT_THRESHOLD;
  
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
        setStartDate(start);
        setEndDate(end);
        // 同步输入框
        setInputStartDate(start);
        setInputEndDate(end);
        setInputError(null);
      }
      setTempStartDate(null);
      setSelectingStart(true);
    }
  };

  // 处理输入框确认
  const handleInputConfirm = () => {
    // 验证格式
    if (!isValidDateString(inputStartDate)) {
      setInputError('开始日期格式错误，请使用 YYYY-MM-DD 格式');
      return;
    }
    if (!isValidDateString(inputEndDate)) {
      setInputError('结束日期格式错误，请使用 YYYY-MM-DD 格式');
      return;
    }
    
    // 确保开始日期不晚于结束日期
    const [start, end] = inputStartDate <= inputEndDate 
      ? [inputStartDate, inputEndDate] 
      : [inputEndDate, inputStartDate];
    
    setStartDate(start);
    setEndDate(end);
    setInputStartDate(start);
    setInputEndDate(end);
    setInputError(null);
    
    // 更新日历显示
    const d = parseLocalDate(start);
    setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  // 处理输入框键盘事件
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputConfirm();
    }
  };
  
  // 离开日历时清除 hover 状态
  const handleMouseLeave = () => {
    setHoverDate(null);
  };
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 处理快捷选项
  const handleQuickOption = (option: typeof QUICK_OPTIONS[0]) => {
    const { start, end } = option.getRange();
    setStartDate(start);
    setEndDate(end);
    // 同步输入框
    setInputStartDate(start);
    setInputEndDate(end);
    setInputError(null);
    // 重置日历选择状态
    setTempStartDate(null);
    setSelectingStart(true);
    // 更新日历显示到选中的开始日期
    const d = parseLocalDate(start);
    setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  // 关闭弹窗
  const handleClose = useCallback(() => {
    if (progress && progress.status === 'exporting') {
      cancelledRef.current = true;
    }
    setProgress(null);
    onClose();
  }, [progress, onClose]);

  // 执行导出
  const handleExport = useCallback(async () => {
    cancelledRef.current = false;
    
    const chunks = splitDateRangeByMonth(startDate, endDate);
    const allRecords: DailyRecord[] = [];
    let processedDays = 0;

    // 初始化进度
    setProgress({
      status: 'preparing',
      currentChunk: 0,
      totalChunks: chunks.length,
      percentage: 0,
      currentLabel: '',
      processedDays: 0,
      totalDays: dayCount,
    });

    try {
      // 分块请求
      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) {
          setProgress((prev) => prev ? { ...prev, status: 'cancelled' } : null);
          return;
        }

        const chunk = chunks[i];
        
        // 更新进度
        setProgress({
          status: 'exporting',
          currentChunk: i + 1,
          totalChunks: chunks.length,
          percentage: Math.round((i / chunks.length) * 90), // 留 10% 给格式化
          currentLabel: chunk.label,
          processedDays,
          totalDays: dayCount,
        });

        // 请求当月数据
        const result = await getDailyLogsForExport(chunk.start, chunk.end);
        allRecords.push(...result.records);
        processedDays += getDayCount(chunk.start, chunk.end);
      }

      // 格式化阶段
      setProgress((prev) => prev ? {
        ...prev,
        status: 'formatting',
        percentage: 95,
        currentLabel: '正在生成文件...',
      } : null);

      // 计算实际填充天数
      const filledDays = allRecords.filter((r) => 
        r.plan || r.result || r.issues || r.notes
      ).length;

      // 格式化内容
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'markdown') {
        content = formatToMarkdown(allRecords, startDate, endDate, dayCount, filledDays, includeEmpty);
        filename = `dailylog-${startDate}-${endDate}.md`;
        mimeType = 'text/markdown;charset=utf-8';
      } else {
        content = formatToJson(allRecords, startDate, endDate, dayCount, filledDays);
        filename = `dailylog-${startDate}-${endDate}.json`;
        mimeType = 'application/json;charset=utf-8';
      }

      // 下载文件
      downloadFile(content, filename, mimeType);

      // 完成
      setProgress({
        status: 'done',
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        percentage: 100,
        currentLabel: filename,
        processedDays: dayCount,
        totalDays: dayCount,
      });

    } catch (error) {
      setProgress((prev) => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '导出失败',
      } : null);
    }
  }, [startDate, endDate, format, includeEmpty, dayCount]);

  // 取消导出
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <h2 className="text-lg font-semibold text-[#f0f6fc] flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            导出每日记录
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-6">
          {/* 进度显示（导出中/完成/错误状态） */}
          {progress && (
            <div className="space-y-4">
              {progress.status === 'exporting' || progress.status === 'formatting' ? (
                <>
                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#8b949e]">
                        {progress.status === 'formatting' ? '正在生成文件...' : `正在导出 ${progress.currentLabel}...`}
                      </span>
                      <span className="text-emerald-400">{progress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#8b949e]">
                      <span>已处理 {progress.currentChunk} / {progress.totalChunks} 个月份</span>
                      <button
                        onClick={handleCancel}
                        className="text-red-400 hover:text-red-300"
                      >
                        取消导出
                      </button>
                    </div>
                  </div>
                </>
              ) : progress.status === 'done' ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <div className="text-center">
                    <p className="text-[#f0f6fc] font-medium">导出完成</p>
                    <p className="text-sm text-[#8b949e] mt-1">
                      📄 {progress.currentLabel}
                    </p>
                    <p className="text-xs text-[#8b949e] mt-1">
                      共 {progress.totalDays} 天
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                  >
                    完成
                  </button>
                </div>
              ) : progress.status === 'error' ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                  <div className="text-center">
                    <p className="text-[#f0f6fc] font-medium">导出失败</p>
                    <p className="text-sm text-red-400 mt-1">{progress.error}</p>
                  </div>
                  <button
                    onClick={() => setProgress(null)}
                    className="mt-2 px-4 py-2 rounded-lg bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] transition-colors text-sm font-medium"
                  >
                    重试
                  </button>
                </div>
              ) : progress.status === 'cancelled' ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <AlertCircle className="w-12 h-12 text-amber-400" />
                  <div className="text-center">
                    <p className="text-[#f0f6fc] font-medium">导出已取消</p>
                  </div>
                  <button
                    onClick={() => setProgress(null)}
                    className="mt-2 px-4 py-2 rounded-lg bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] transition-colors text-sm font-medium"
                  >
                    重新配置
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* 配置表单（非进度状态时显示） */}
          {!progress && (
            <>
              {/* 日期范围 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#f0f6fc]">📅 日期范围</label>
                
                {/* 日期输入区域 */}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#8b949e]" />
                  <input
                    type="text"
                    value={inputStartDate}
                    onChange={(e) => {
                      setInputStartDate(e.target.value);
                      setInputError(null);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="开始日期 YYYY-MM-DD"
                    className="w-[130px] px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] placeholder-[#484f58] focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[#8b949e]">~</span>
                  <input
                    type="text"
                    value={inputEndDate}
                    onChange={(e) => {
                      setInputEndDate(e.target.value);
                      setInputError(null);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="结束日期 YYYY-MM-DD"
                    className="w-[130px] px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] placeholder-[#484f58] focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleInputConfirm}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
                  >
                    确定
                  </button>
                </div>
                
                {/* 输入错误提示 */}
                {inputError && (
                  <div className="text-xs text-red-400">
                    {inputError}
                  </div>
                )}
                
                {/* 快捷选项 */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleQuickOption(option)}
                      className="px-2.5 py-1 rounded-md text-xs bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* 双月日历面板 */}
                <div 
                  className="bg-[#0d1117] rounded-lg border border-[#30363d] p-3"
                  onMouseLeave={handleMouseLeave}
                >
                  {/* 月份切换头部 */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 rounded hover:bg-[#21262d] text-[#8b949e]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-[#f0f6fc] font-medium">
                        {currentMonth.year}年{monthNames[currentMonth.month - 1]}
                      </span>
                      <span className="text-sm text-[#f0f6fc] font-medium">
                        {nextMonth.year}年{monthNames[nextMonth.month - 1]}
                      </span>
                    </div>
                    <button
                      onClick={handleNextMonth}
                      className="p-1 rounded hover:bg-[#21262d] text-[#8b949e]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 提示文字 */}
                  <div className="text-xs text-[#8b949e] text-center mb-2">
                    {selectingStart ? '点击选择开始日期，或直接在上方输入' : '点击选择结束日期'}
                  </div>

                  {/* 双月面板 */}
                  <div className="flex gap-4 justify-center">
                    <MonthPanel
                      year={currentMonth.year}
                      month={currentMonth.month}
                      startDate={tempStartDate || startDate}
                      endDate={tempStartDate ? null : endDate}
                      hoverDate={hoverDate}
                      selectingStart={selectingStart}
                      onDateClick={handleDateClick}
                      onDateHover={setHoverDate}
                    />
                    <div className="w-px bg-[#30363d]" />
                    <MonthPanel
                      year={nextMonth.year}
                      month={nextMonth.month}
                      startDate={tempStartDate || startDate}
                      endDate={tempStartDate ? null : endDate}
                      hoverDate={hoverDate}
                      selectingStart={selectingStart}
                      onDateClick={handleDateClick}
                      onDateHover={setHoverDate}
                    />
                  </div>
                </div>

                {/* 统计信息 */}
                <div className="text-sm text-[#8b949e]">
                  📊 共 <span className="text-[#f0f6fc]">{dayCount}</span> 天
                  {initialFilledDays !== undefined && (
                    <span>，已记录 <span className="text-emerald-400">{initialFilledDays}</span> 天</span>
                  )}
                  {isOverLimit && (
                    <span className="text-red-400 ml-2">
                      ⚠️ 超出单次最大导出限制（{EXPORT_LIMITS.MAX_DAYS}天）
                    </span>
                  )}
                  {!isOverLimit && needsProgress && (
                    <span className="text-amber-400 ml-2">
                      💡 大范围导出，将显示进度
                    </span>
                  )}
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-[#30363d]" />

              {/* 导出格式 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#f0f6fc]">📄 导出格式</label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      format === 'markdown'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-[#30363d] hover:border-[#484f58]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="markdown"
                      checked={format === 'markdown'}
                      onChange={() => setFormat('markdown')}
                      className="sr-only"
                    />
                    <FileText className={`w-5 h-5 ${format === 'markdown' ? 'text-emerald-400' : 'text-[#8b949e]'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${format === 'markdown' ? 'text-[#f0f6fc]' : 'text-[#8b949e]'}`}>
                        Markdown (.md)
                      </p>
                      <p className="text-xs text-[#8b949e]">适合阅读、分享、存档到语雀/Notion</p>
                    </div>
                    {format === 'markdown' && (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    )}
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      format === 'json'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-[#30363d] hover:border-[#484f58]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={format === 'json'}
                      onChange={() => setFormat('json')}
                      className="sr-only"
                    />
                    <FileJson className={`w-5 h-5 ${format === 'json' ? 'text-emerald-400' : 'text-[#8b949e]'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${format === 'json' ? 'text-[#f0f6fc]' : 'text-[#8b949e]'}`}>
                        JSON (.json)
                      </p>
                      <p className="text-xs text-[#8b949e]">适合数据备份、后续导入恢复</p>
                    </div>
                    {format === 'json' && (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    )}
                  </label>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-[#30363d]" />

              {/* 额外选项 */}
              {format === 'markdown' && (
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setIncludeEmpty(!includeEmpty)}
                >
                  <Checkbox
                    checked={includeEmpty}
                    onChange={setIncludeEmpty}
                    size="sm"
                  />
                  <span className="text-sm text-[#8b949e]">
                    包含空白天（显示"当天无记录"）
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮（非进度状态时显示） */}
        {!progress && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#30363d] bg-[#0d1117]">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={isOverLimit || dayCount <= 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isOverLimit || dayCount <= 0
                  ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400'
              }`}
            >
              <Download className="w-4 h-4" />
              下载文件
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
