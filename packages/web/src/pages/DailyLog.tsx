/**
 * 每日记录页面
 * 
 * 改版：使用日历视图替代周列表，支持任意日期范围导出
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import { Home as HomeIcon, Settings } from 'lucide-react';
import { useTransitionNavigate } from '../lib/navigation';
import Calendar from '../components/Calendar';
import DayEditor from '../components/DayEditor';
import DateRangePicker from '../components/DateRangePicker';
import UserMenu from '../components/UserMenu';
import {
  getDay,
  saveDay,
  exportRange,
  getDateRange,
  type SaveDayRecordParams,
} from '../api';
import { formatLocalDate, getWeekStart, getWeekEnd } from '@/lib/date-utils';

export default function DailyLog() {
  const { date: urlDate } = useParams<{ date?: string }>();
  const navigate = useTransitionNavigate();
  
  // 初始化日期（优先使用 URL 参数）
  const initialDate = useMemo(() => urlDate || formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  
  // 导出日期范围（默认本周周一到周日）
  const [exportStartDate, setExportStartDate] = useState(() => getWeekStart());
  const [exportEndDate, setExportEndDate] = useState(() => getWeekEnd(getWeekStart()));
  
  // 导出范围内的记录统计
  const [exportFilledDays, setExportFilledDays] = useState<number | undefined>(undefined);
  
  // 仅在"切换日期"时展示右侧模糊遮罩
  const [isSwitchingDate, setIsSwitchingDate] = useState(false);
  const dateSwitchRef = useRef<{ target: string | null; sawLoading: boolean }>({
    target: null,
    sawLoading: false,
  });
  
  // 记录上一次处理的 URL 日期，避免重复处理
  const prevUrlDateRef = useRef<string | undefined>(urlDate);

  // 加载当前日期记录
  const { data: currentRecord, refresh: refreshRecord, loading: recordLoading } = useRequest(
    () => getDay(selectedDate),
    {
      refreshDeps: [selectedDate],
    }
  );

  // 加载导出范围内的统计
  const { run: loadExportStats } = useRequest(
    async () => {
      const result = await getDateRange(exportStartDate, exportEndDate);
      return result;
    },
    {
      manual: true,
      onSuccess: (result) => {
        setExportFilledDays(result?.stats?.filled ?? 0);
      },
    }
  );

  // 导出范围变化时重新加载统计
  useEffect(() => {
    loadExportStats();
  }, [exportStartDate, exportEndDate]);

  // 当 URL 参数变化时更新选中日期
  useEffect(() => {
    if (urlDate && urlDate !== prevUrlDateRef.current) {
      prevUrlDateRef.current = urlDate;
      
      if (urlDate !== selectedDate) {
        setIsSwitchingDate(true);
        dateSwitchRef.current = { target: urlDate, sawLoading: false };
        setSelectedDate(urlDate);
      }
    }
  }, [urlDate, selectedDate]);

  // 监听 recordLoading：只有"因切换日期"触发的加载才会驱动 isSwitchingDate 结束
  useEffect(() => {
    const { target, sawLoading } = dateSwitchRef.current;
    if (!isSwitchingDate || !target || target !== selectedDate) return;

    if (recordLoading) {
      if (!sawLoading) {
        dateSwitchRef.current = { target, sawLoading: true };
      }
      return;
    }

    if (sawLoading) {
      setIsSwitchingDate(false);
      dateSwitchRef.current = { target: null, sawLoading: false };
    }
  }, [recordLoading, selectedDate, isSwitchingDate]);

  // 保存记录
  const handleSave = async (date: string, params: SaveDayRecordParams) => {
    try {
      await saveDay(date, params);
      if (date === selectedDate) {
        await refreshRecord();
      }
      // 如果保存的日期在导出范围内，刷新统计
      if (date >= exportStartDate && date <= exportEndDate) {
        loadExportStats();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
      throw error;
    }
  };

  // 选择日期
  const handleSelectDate = (date: string) => {
    if (date === selectedDate) return;
    
    setIsSwitchingDate(true);
    dateSwitchRef.current = { target: date, sawLoading: false };
    setSelectedDate(date);
    
    navigate(`/daily/${date}`, { replace: true });
  };

  // 导航到相邻日期
  const handleNavigate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    const newDateStr = formatLocalDate(newDate);
    handleSelectDate(newDateStr);
  };

  // 日期范围变化
  const handleRangeChange = (start: string, end: string) => {
    setExportStartDate(start);
    setExportEndDate(end);
  };

  // 导入到首页
  const handleImportToHome = async () => {
    try {
      const result = await exportRange(exportStartDate, exportEndDate);
      if (!result.text) {
        toast.warning('所选时间段暂无记录');
        return;
      }
      navigate('/', { 
        state: { 
          dailyLog: result.text,
          dateRange: { startDate: exportStartDate, endDate: exportEndDate }
        }, 
        scope: 'root' 
      });
      toast.success('已导入到首页');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const safeCurrentRecord =
    currentRecord && currentRecord.date === selectedDate ? currentRecord : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117]">
      {/* 顶部导航栏 */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
            W
          </div>
          <h1 className="text-lg font-semibold text-[#f0f6fc]">WeekNote</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#8b949e]">每日记录</span>
          <button
            onClick={() => navigate('/', { scope: 'root' })}
            className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            title="首页"
          >
            <HomeIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/settings', { scope: 'root' })}
            className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          <UserMenu />
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：日历 */}
        <div className="w-72 flex-shrink-0">
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        </div>

        {/* 右侧：编辑区 */}
        <div className="flex-1 overflow-hidden">
          <DayEditor
            date={selectedDate}
            record={safeCurrentRecord}
            loading={isSwitchingDate}
            onSave={handleSave}
            onNavigate={handleNavigate}
          />
        </div>
      </main>

      {/* 底部操作栏 */}
      <div className="h-16 flex items-center justify-between px-6 bg-[#161b22] border-t border-[#30363d]">
        <DateRangePicker
          startDate={exportStartDate}
          endDate={exportEndDate}
          onChange={handleRangeChange}
          filledDays={exportFilledDays}
        />
        <button
          onClick={handleImportToHome}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition-all font-medium text-sm"
        >
          🚀 导入到首页生成周报
        </button>
      </div>
    </div>
  );
}
