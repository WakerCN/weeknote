/**
 * 每日记录页面
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import { Home as HomeIcon, Settings } from 'lucide-react';
import { useTransitionNavigate } from '../lib/navigation';
import WeekList from '../components/WeekList';
import DayEditor from '../components/DayEditor';
import DatePicker from '../components/DatePicker';
import UserMenu from '../components/UserMenu';
import {
  getWeekSummaries,
  getWeek,
  getDay,
  saveDay,
  exportWeek,
  getWeekStats,
  type WeekSummary,
  type DailyRecord,
  type SaveDayRecordParams,
} from '../api';
import { getWeekStart, getWeekDates } from '../lib/date-utils';

export default function DailyLog() {
  const { date: urlDate } = useParams<{ date?: string }>();
  const navigate = useTransitionNavigate();
  
  // 初始化日期（优先使用 URL 参数）
  const initialDate = useMemo(() => urlDate || new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 当前周的起始日期（用于控制周数据请求，只在周变化时更新）
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(initialDate));
  
  // 仅在"切换日期"时展示右侧模糊遮罩
  const [isSwitchingDate, setIsSwitchingDate] = useState(false);
  const dateSwitchRef = useRef<{ target: string | null; sawLoading: boolean }>({
    target: null,
    sawLoading: false,
  });
  
  // 记录上一次处理的 URL 日期，避免重复处理
  const prevUrlDateRef = useRef<string | undefined>(urlDate);

  // 加载周列表（只在初始化时加载一次）
  const { data: weeksData, refresh: refreshWeeks } = useRequest(getWeekSummaries);

  // 加载当前周数据 - 只在 currentWeekStart 变化时请求
  const { data: weekData, refresh: refreshWeek } = useRequest(
    () => getWeek(currentWeekStart),
    {
      refreshDeps: [currentWeekStart],
    }
  );

  // 加载当前日期记录 - 每次日期变化都请求
  const { data: currentRecord, refresh: refreshRecord, loading: recordLoading } = useRequest(
    () => getDay(selectedDate),
    {
      refreshDeps: [selectedDate],
    }
  );

  // 加载统计信息 - 只在周变化时请求
  const { data: stats } = useRequest(
    () => getWeekStats(currentWeekStart),
    {
      refreshDeps: [currentWeekStart],
    }
  );

  // 当 URL 参数变化时更新选中日期（仅处理真正的变化）
  useEffect(() => {
    if (urlDate && urlDate !== prevUrlDateRef.current) {
      prevUrlDateRef.current = urlDate;
      
      if (urlDate !== selectedDate) {
        setIsSwitchingDate(true);
        dateSwitchRef.current = { target: urlDate, sawLoading: false };
        setSelectedDate(urlDate);
        
        // 检查是否需要切换周
        const newWeekStart = getWeekStart(urlDate);
        if (newWeekStart !== currentWeekStart) {
          setCurrentWeekStart(newWeekStart);
        }
      }
    }
  }, [urlDate, selectedDate, currentWeekStart]);

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
        await refreshWeek();
      }
      await refreshWeeks();
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
    
    // 检查是否需要切换周
    const newWeekStart = getWeekStart(date);
    if (newWeekStart !== currentWeekStart) {
      setCurrentWeekStart(newWeekStart);
    }
    
    navigate(`/daily/${date}`, { replace: true });
  };

  // 导航到相邻日期
  const handleNavigate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    const newDateStr = newDate.toISOString().split('T')[0];
    handleSelectDate(newDateStr);
  };

  // 补录日期
  const handleBackfill = () => {
    setShowDatePicker(true);
  };

  // 日期选择器回调
  const handleDateSelect = (date: string) => {
    handleSelectDate(date);
  };

  // 导入到首页
  const handleImportToHome = async () => {
    try {
      const { text } = await exportWeek(selectedDate);
      if (!text) {
        toast.warning('本周暂无记录');
        return;
      }
      navigate('/', { state: { dailyLog: text }, scope: 'root' });
      toast.success('已导入到首页');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const weeks: WeekSummary[] = weeksData?.weeks || [];
  const records: Record<string, DailyRecord> = weekData?.days || {};
  const safeCurrentRecord =
    currentRecord && currentRecord.date === selectedDate ? currentRecord : null;

  // 今天所在的周
  const todayWeekStart = getWeekStart();

  // 确保"今天所在的周"和"当前选中的周"都在列表中
  const allWeeks = [...weeks];
  
  // 添加今天所在的周（如果不存在）
  const todayWeekExists = allWeeks.some((w) => w.weekStart === todayWeekStart);
  if (!todayWeekExists) {
    const weekDates = getWeekDates(todayWeekStart);
    const weekEnd = weekDates[weekDates.length - 1].date;
    allWeeks.unshift({
      fileName: '',
      year: new Date(todayWeekStart).getFullYear(),
      week: 0,
      weekStart: todayWeekStart,
      weekEnd,
      filledDays: 0,
      lastUpdated: new Date().toISOString(),
    });
  }

  // 添加当前选中的周（如果不存在且与今天不同）
  if (currentWeekStart !== todayWeekStart) {
    const currentWeekExists = allWeeks.some((w) => w.weekStart === currentWeekStart);
    if (!currentWeekExists) {
      const weekDates = getWeekDates(currentWeekStart);
      const weekEnd = weekDates[weekDates.length - 1].date;
      const insertIndex = allWeeks.findIndex((w) => w.weekStart < currentWeekStart);
      const newWeek = {
        fileName: '',
        year: new Date(currentWeekStart).getFullYear(),
        week: 0,
        weekStart: currentWeekStart,
        weekEnd,
        filledDays: 0,
        lastUpdated: new Date().toISOString(),
      };
      if (insertIndex === -1) {
        allWeeks.push(newWeek);
      } else {
        allWeeks.splice(insertIndex, 0, newWeek);
      }
    }
  }

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
        {/* 左侧：周列表 */}
        <div className="w-64 flex-shrink-0">
          <WeekList
            weeks={allWeeks}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            weekData={records}
            currentWeekStart={currentWeekStart}
            onBackfill={handleBackfill}
            onRefresh={refreshWeeks}
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
        <div className="text-sm text-[#8b949e]">
          {stats && (
            <>
              本周已记录 {stats.weekdaysFilled}/5 个工作日
              {stats.filledDays > stats.weekdaysFilled && (
                <span className="ml-2 text-[#484f58]">
                  （含周末 {stats.filledDays - stats.weekdaysFilled} 天）
                </span>
              )}
            </>
          )}
        </div>
        <button
          onClick={handleImportToHome}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition-all font-medium text-sm"
        >
          🚀 导入本周到首页生成周报
        </button>
      </div>

      {/* 日期选择器 */}
      {showDatePicker && (
        <DatePicker
          value={selectedDate}
          onSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}
