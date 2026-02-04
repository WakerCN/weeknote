/**
 * 日记编辑组件
 * 使用 Milkdown 编辑器提供所见即所得的 Markdown 编辑体验
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronRight, Save } from 'lucide-react';
import type { DailyRecord, SaveDayRecordParams } from '../api';
import MilkdownEditor from './MilkdownEditor';
import { useAutoSave } from './useAutoSave';
import { formatFullDateChinese } from '@/lib/date-utils';

// 四个字段的类型
interface EditorValues {
  plan: string;
  result: string;
  issues: string;
  notes: string;
}

// 空值常量
const EMPTY_VALUES: EditorValues = { plan: '', result: '', issues: '', notes: '' };

interface DayEditorProps {
  date: string;
  record: DailyRecord | null;
  loading?: boolean;
  onSave: (date: string, params: SaveDayRecordParams) => Promise<void>;
  onNavigate: (direction: 'prev' | 'next') => void;
}

interface EditorSectionProps {
  title: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultExpanded?: boolean;
  editorKey: string;
  readOnly?: boolean;
}

function EditorSection({
  title,
  icon,
  value,
  onChange,
  placeholder,
  defaultExpanded = true,
  editorKey,
  readOnly = false,
}: EditorSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // 追踪是否曾经展开过（用于延迟初始化编辑器，提升性能）
  const [hasExpanded, setHasExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (!expanded && !hasExpanded) {
      setHasExpanded(true);
    }
    setExpanded(!expanded);
  };

  return (
    <div
      className={`rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden transition-all duration-300 ease-out flex flex-col ${
        expanded ? 'min-[1920px]:min-h-[280px]' : ''
      }`}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] transition-colors text-left flex-shrink-0"
      >
        <ChevronRight
          className={`w-4 h-4 text-[#8b949e] transition-transform duration-300 ${
            expanded ? 'rotate-90' : ''
          }`}
        />
        <span className="text-lg">{icon}</span>
        <h3 className="text-[#f0f6fc] font-medium">{title}</h3>
        {!expanded && value.trim() && (
          <span className="ml-auto text-xs text-[#8b949e]">
            {value.split('\n').filter((l) => l.trim()).length} 项
          </span>
        )}
      </button>

      {/* 使用 grid 动画实现平滑展开/收起 */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out flex-1 ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden flex flex-col min-h-0">
          {hasExpanded && (
            <div className="flex-1 flex flex-col min-h-0">
              <MilkdownEditor
                key={editorKey}
                defaultValue={value}
                onChange={onChange}
                placeholder={placeholder}
                readOnly={readOnly}
                minHeight="100px"
                className="flex-1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DayEditor({
  date,
  record,
  loading = false,
  onSave,
  onNavigate,
}: DayEditorProps) {
  // ===== 编辑器状态 =====
  const [values, setValues] = useState<EditorValues>(EMPTY_VALUES);
  const [initialValues, setInitialValues] = useState<EditorValues>(EMPTY_VALUES);
  const [editorVersion, setEditorVersion] = useState(0);
  const [blurActive, setBlurActive] = useState(false);
  // 是否完成首次数据加载（避免首次加载时显示空编辑器导致闪烁）
  const [isInitialized, setIsInitialized] = useState(false);

  // 追踪是否用户正在编辑（避免服务器数据覆盖用户输入）
  const isEditingRef = useRef(false);
  const prevDateRef = useRef<string | null>(null);

  // 当前日期 ref（用于保存时校验）
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  // ===== 自动保存 Hook =====
  const handleSave = useCallback(
    async (data: EditorValues) => {
      await onSave(dateRef.current, data);
    },
    [onSave]
  );

  const autoSave = useAutoSave({
    data: values,
    initialData: initialValues,
    onSave: handleSave,
    disabled: loading,
  });

  // ===== 日期切换处理 =====
  useEffect(() => {
    const isDateChanged = prevDateRef.current !== null && prevDateRef.current !== date;
    prevDateRef.current = date;

    if (isDateChanged) {
      isEditingRef.current = false;
      autoSave.reset();
    }
  }, [date, autoSave]);

  // ===== 数据同步 =====
  useEffect(() => {
    if (loading || isEditingRef.current) return;

    const newValues: EditorValues = {
      plan: record?.plan || '',
      result: record?.result || '',
      issues: record?.issues || '',
      notes: record?.notes || '',
    };

    setValues(newValues);
    setInitialValues(newValues);
    
    // 只有在已初始化后才递增版本（避免首次加载时多次重建编辑器）
    if (isInitialized) {
      setEditorVersion((v) => v + 1);
    } else {
      setIsInitialized(true);
    }

    // 延迟标记初始化完成，避免编辑器 onChange 触发误判
    const t = setTimeout(() => {
      isEditingRef.current = false;
    }, 80);

    return () => clearTimeout(t);
  }, [record, date, loading, isInitialized]);

  // ===== 毛玻璃遮罩 =====
  useEffect(() => {
    if (loading) {
      setBlurActive(true);
      return;
    }
    const t = setTimeout(() => setBlurActive(false), 600);
    return () => clearTimeout(t);
  }, [loading]);

  // ===== 字段更新 =====
  const handleChange = useCallback((field: keyof EditorValues, value: string) => {
    isEditingRef.current = true;
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ===== 渲染 =====
  const dateObj = new Date(date);
  const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()];
  const editorKey = `v${editorVersion}`;

  // 编辑器配置
  const sections = useMemo(
    () => [
      {
        field: 'plan' as const,
        title: 'Plan',
        icon: '📋',
        placeholder: '今日计划，输入 / 唤起命令菜单...',
      },
      { field: 'result' as const, title: 'Result', icon: '✅', placeholder: '完成情况...' },
      { field: 'issues' as const, title: 'Issues', icon: '⚠️', placeholder: '遇到的问题...' },
      { field: 'notes' as const, title: 'Notes', icon: '📝', placeholder: '其他备注...' },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* 头部 */}
      <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">
          {formatFullDateChinese(date)} {dayOfWeek}
        </h2>

        <div className="flex items-center gap-3">
          {/* 保存状态 */}
          <div className="text-sm text-[#8b949e] flex items-center gap-2">
            {autoSave.status === 'saved' && (
              <>
                <span className="text-emerald-400">✓ 已保存</span>
                {autoSave.lastSavedTimeText && (
                  <span className="text-[#6e7681]">· {autoSave.lastSavedTimeText}</span>
                )}
              </>
            )}
            {autoSave.status === 'saving' && <span className="text-yellow-400">保存中...</span>}
            {autoSave.status === 'unsaved' && <span className="text-amber-500">● 未保存</span>}
          </div>

          {/* 保存按钮 */}
          <button
            onClick={autoSave.save}
            disabled={autoSave.status !== 'unsaved'}
            title="保存 (⌘S)"
            className={`p-2 rounded-lg transition-colors ${
              autoSave.status === 'unsaved'
                ? 'text-[#f0f6fc] bg-emerald-600 hover:bg-emerald-500'
                : 'text-[#484f58] bg-[#21262d] cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
          </button>

          {/* 导航按钮 */}
          <div className="flex items-center border-l border-[#30363d] pl-3 ml-1">
            <button
              onClick={() => onNavigate('prev')}
              className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="relative flex-1 overflow-y-auto p-6">
        {/* 加载遮罩 */}
        <div
          className={`absolute inset-0 z-10 bg-black/35 backdrop-blur-sm transition-opacity duration-400 ease-out ${
            blurActive ? 'opacity-100 cursor-wait' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* 首次加载完成前显示骨架屏 */}
        {!isInitialized ? (
          <div className="grid grid-cols-1 min-[1920px]:grid-cols-2 gap-4">
            {sections.map(({ field, title, icon }) => (
              <div
                key={field}
                className="rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden min-[1920px]:min-h-[280px]"
              >
                <div className="w-full flex items-center gap-2 px-4 py-3 bg-[#21262d]">
                  <ChevronRight className="w-4 h-4 text-[#8b949e] rotate-90" />
                  <span className="text-lg">{icon}</span>
                  <h3 className="text-[#f0f6fc] font-medium">{title}</h3>
                </div>
                <div className="p-3">
                  <div className="h-[100px] bg-[#21262d]/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 响应式网格布局：窄屏单列，宽屏(>=1920px) 2x2 */
          <div className="grid grid-cols-1 min-[1920px]:grid-cols-2 gap-4">
            {sections.map(({ field, title, icon, placeholder }) => (
              <EditorSection
                key={field}
                title={title}
                icon={icon}
                value={values[field]}
                onChange={(v) => handleChange(field, v)}
                placeholder={placeholder}
                editorKey={editorKey}
                readOnly={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
