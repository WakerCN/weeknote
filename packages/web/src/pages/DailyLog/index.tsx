/**
 * 每日记录页面
 *
 * 改版：使用日历视图替代周列表，支持任意日期范围导出
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import { Home as HomeIcon, Settings, Download } from 'lucide-react';
import { useTransitionNavigate } from '../../lib/navigation';
import Calendar from '@/components/Calendar';
import DayEditor from '@/components/DayEditor';
import DateRangePicker from '@/components/DateRangePicker';
import ExportDialog from '@/components/ExportDialog';
import UserMenu from '@/components/UserMenu';
import { getDay, saveDay, exportRange as exportRangeApi, type SaveDayRecordParams } from '@/api';
import { formatLocalDate } from '@/lib/date-utils';
import { useExportRange } from './useExportRange';
import { useDateSwitching } from './useDateSwitching';

export default function DailyLog() {
  const { date: urlDate } = useParams<{ date?: string }>();
  const navigate = useTransitionNavigate();

  // 初始化日期（优先使用 URL 参数）
  const initialDate = useMemo(() => urlDate || formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // 导出范围管理
  const exportRange = useExportRange();

  // 日历刷新触发器
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // 加载当前日期记录
  const {
    data: currentRecord,
    refresh: refreshRecord,
    loading: recordLoading,
  } = useRequest(() => getDay(selectedDate), {
    refreshDeps: [selectedDate],
  });

  // 日期切换过渡
  const dateSwitching = useDateSwitching({
    urlDate,
    selectedDate,
    recordLoading,
  });

  // 当 URL 参数变化时更新选中日期
  useEffect(() => {
    if (urlDate && urlDate !== selectedDate) {
      dateSwitching.startSwitch(urlDate);
      setSelectedDate(urlDate);
    }
  }, [urlDate]);

  // 保存记录
  const handleSave = async (date: string, params: SaveDayRecordParams) => {
    // 注意：错误 toast 已由 api-client 统一处理，这里无需重复调用
    await saveDay(date, params);
    if (date === selectedDate) {
      await refreshRecord();
    }
    // 刷新日历状态
    setCalendarRefreshKey((prev) => prev + 1);
    // 如果保存的日期在导出范围内，刷新统计
    if (date >= exportRange.startDate && date <= exportRange.endDate) {
      exportRange.refreshStats();
    }
  };

  // 选择日期
  const handleSelectDate = (date: string) => {
    if (date === selectedDate) return;

    dateSwitching.startSwitch(date);
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

  // 导入到首页
  const handleImportToHome = async () => {
    try {
      const result = await exportRangeApi(exportRange.startDate, exportRange.endDate);
      if (!result.text) {
        toast.warning('所选时间段暂无记录');
        return;
      }
      // 使用 sessionStorage 传递一次性数据，避免 location.state 导致的重复触发问题
      sessionStorage.setItem('weeknote_import', JSON.stringify({
        dailyLog: result.text,
        dateRange: { startDate: exportRange.startDate, endDate: exportRange.endDate },
        filledDays: result.filledDays,
      }));
      navigate('/', { scope: 'root' });
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
        <div className="w-[380px] flex-shrink-0">
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            refreshKey={calendarRefreshKey}
          />
        </div>

        {/* 右侧：编辑区 */}
        <div className="flex-1 overflow-hidden">
          <DayEditor
            date={selectedDate}
            record={safeCurrentRecord}
            loading={dateSwitching.isSwitching || recordLoading}
            onSave={handleSave}
            onNavigate={handleNavigate}
          />
        </div>
      </main>

      {/* 底部操作栏 */}
      <div className="h-16 flex items-center justify-between px-6 bg-[#161b22] border-t border-[#30363d]">
      <DateRangePicker
          startDate={exportRange.startDate}
          endDate={exportRange.endDate}
          onChange={exportRange.setRange}
          filledDays={exportRange.filledDays}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={exportRange.openDialog}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] transition-all font-medium text-sm border border-[#30363d]"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={handleImportToHome}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition-all font-medium text-sm"
          >
            🚀 导入到首页生成周报
          </button>
        </div>
      </div>

      {/* 导出弹窗 */}
      <ExportDialog
        open={exportRange.showDialog}
        onClose={exportRange.closeDialog}
        initialStartDate={exportRange.startDate}
        initialEndDate={exportRange.endDate}
        initialFilledDays={exportRange.filledDays}
      />
    </div>
  );
}
