/**
 * 日记编辑组件
 * 使用 Milkdown 编辑器提供所见即所得的 Markdown 编辑体验
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounceFn } from 'ahooks';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DailyRecord, SaveDayRecordParams } from '../api';
import MilkdownEditor from './MilkdownEditor';

// 格式化日期显示 "12月23日"
const formatDateChinese = (date: string): string => {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
};

/**
 * 将旧格式 (string[]) 转换为 Markdown 字符串
 * 兼容旧数据格式
 */
const migrateToMarkdown = (data: string[] | string | undefined): string => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  // 将数组转换为 Markdown 列表
  return data
    .filter((item) => item.trim())
    .map((item) => `- ${item}`)
    .join('\n');
};

/**
 * 将 Markdown 字符串转换为旧格式 (string[])
 * 用于保存时兼容后端
 */
const markdownToArray = (markdown: string): string[] => {
  if (!markdown.trim()) return [];

  // 解析 Markdown 列表项
  const lines = markdown.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 匹配列表项: "- item" 或 "* item" 或 "1. item"
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      items.push(listMatch[1]);
    } else if (trimmed && !trimmed.startsWith('#')) {
      // 非列表格式的文本也保留
      items.push(trimmed);
    }
  }

  return items;
};

interface DayEditorProps {
  /** 当前日期 */
  date: string;
  /** 当前记录 */
  record: DailyRecord | null;
  /** 当前日期记录是否正在加载 */
  loading?: boolean;
  /** 保存回调 */
  onSave: (date: string, params: SaveDayRecordParams) => Promise<void>;
  /** 切换日期回调 */
  onNavigate: (direction: 'prev' | 'next') => void;
}

interface EditorSectionProps {
  title: string;
  icon: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultExpanded?: boolean;
  /** 编辑器重建 key */
  editorKey: string;
  /** 是否只读 */
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

  return (
    <div className="bg-[#161b22] rounded-lg border border-[#30363d]">
      {/* 标题栏 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-4 py-3 bg-[#21262d] hover:bg-[#30363d] transition-colors text-left ${expanded ? 'rounded-t-lg' : 'rounded-lg'}`}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#8b949e]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#8b949e]" />
        )}
        <span className="text-lg">{icon}</span>
        <h3 className="text-[#f0f6fc] font-medium">{title}</h3>
        {!expanded && value.trim() && (
          <span className="ml-auto text-xs text-[#8b949e]">
            {value.split('\n').filter((l) => l.trim()).length} 项
          </span>
        )}
      </button>

      {/* 编辑器内容 - 使用 editorKey 强制重建 */}
      {expanded && (
        <div className="p-3">
          <MilkdownEditor
            key={editorKey}
            defaultValue={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            minHeight="100px"
          />
        </div>
      )}
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
  // 使用 Markdown 字符串格式存储
  const [plan, setPlan] = useState('');
  const [result, setResult] = useState('');
  const [issues, setIssues] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  // 右侧毛玻璃遮罩：用于在切换日期/编辑器重建期间盖住闪白（带最小停留时间）
  const [blurActive, setBlurActive] = useState(false);

  // 用于追踪初始值，避免初始化时触发保存
  const initialValuesRef = useRef({ plan: '', result: '', issues: '', notes: '' });
  const isInitializedRef = useRef(false);
  // 追踪是否正在编辑（用户输入后变为 true）
  const isEditingRef = useRef(false);
  // 追踪上一个 date
  const prevDateRef = useRef<string | null>(null);
  // 编辑器版本号，用于强制重建编辑器
  const [editorVersion, setEditorVersion] = useState(0);

  // 编辑器 key - 只在“内容真正切换完成”时变更，避免切换日期瞬间就销毁/重建导致闪动
  const editorKey = `v${editorVersion}`;

  // 防抖保存 - 使用 cancel 在日期变化时取消未完成的保存
  // 注意：必须在 useEffect 之前定义，因为 useEffect 中需要使用 cancelDebouncedSave
  const { run: debouncedSave, cancel: cancelDebouncedSave } = useDebounceFn(
    async (
      planVal: string,
      resultVal: string,
      issuesVal: string,
      notesVal: string,
      targetDate: string
    ) => {
      // 再次检查日期是否匹配，防止竞态条件
      if (targetDate !== date) {
        console.warn('保存已取消：日期已切换', { targetDate, currentDate: date });
        return;
      }

      setSaveStatus('saving');
      try {
        // 转换为数组格式以兼容后端
        await onSave(targetDate, {
          plan: markdownToArray(planVal),
          result: markdownToArray(resultVal),
          issues: markdownToArray(issuesVal),
          notes: markdownToArray(notesVal),
        });
        // 防止“保存完成时已经切走日期”导致新日期 UI 被旧保存覆盖
        if (targetDate !== date) return;
        setSaveStatus('saved');
      } catch (error) {
        if (targetDate !== date) return;
        setSaveStatus('unsaved');
        console.error('保存失败:', error);
      }
    },
    { wait: 1000 }
  );

  // 日期变化：立即取消旧的防抖保存，并冻结“初始化/编辑”标记
  useEffect(() => {
    const isDateChanged = prevDateRef.current !== null && prevDateRef.current !== date;
    prevDateRef.current = date;

    if (isDateChanged) {
      cancelDebouncedSave();
      isEditingRef.current = false;
      isInitializedRef.current = false;
      // 切换日期时先标记为已保存，避免 UI 抖动（真正的数据落地后会再次设为 saved）
      setSaveStatus('saved');
    }
  }, [date, cancelDebouncedSave]);

  // 数据就绪后再落地内容，并只在此时触发一次编辑器重建（减少闪动/卡顿）
  useEffect(() => {
    if (loading) return;

    // 如果用户正在编辑（且不是日期切换引起的），跳过来自服务器的刷新
    // 这里的“日期切换”已经在上一个 effect 中把 isEditingRef 置为 false
    if (isEditingRef.current) return;

    // 进入一次“初始化同步”窗口，避免 setPlan 触发 onChange -> 自动保存
    isInitializedRef.current = false;

    const newPlan = record ? migrateToMarkdown(record.plan) : '';
    const newResult = record ? migrateToMarkdown(record.result) : '';
    const newIssues = record ? migrateToMarkdown(record.issues) : '';
    const newNotes = record ? migrateToMarkdown(record.notes) : '';

    setPlan(newPlan);
    setResult(newResult);
    setIssues(newIssues);
    setNotes(newNotes);

    initialValuesRef.current = {
      plan: newPlan,
      result: newResult,
      issues: newIssues,
      notes: newNotes,
    };

    setSaveStatus('saved');

    // 关键：只在“内容已确定”时增加版本号，触发 4 个编辑器同步重建一次
    setEditorVersion((v) => v + 1);

    const t = setTimeout(() => {
      isInitializedRef.current = true;
    }, 80);

    return () => clearTimeout(t);
  }, [record, date, loading]);

  // 控制毛玻璃遮罩的展示时长：加载结束后延迟退出，避免感知到闪烁
  useEffect(() => {
    // 进入 loading：立刻开启遮罩
    if (loading) {
      setBlurActive(true);
      return;
    }

    // 退出 loading：遮罩至少再停留一小段时间再淡出
    const t = setTimeout(() => {
      setBlurActive(false);
    }, 600);

    return () => clearTimeout(t);
  }, [loading]);

  // 处理内容变化
  const handleChange = useCallback(
    (field: 'plan' | 'result' | 'issues' | 'notes', value: string) => {
      const setters = { plan: setPlan, result: setResult, issues: setIssues, notes: setNotes };
      setters[field](value);

      // 只有初始化后才触发保存
      if (!isInitializedRef.current) return;

      // 标记用户正在编辑
      isEditingRef.current = true;

      // 检查是否与初始值相同（避免不必要的保存）
      const newValues = {
        plan: field === 'plan' ? value : plan,
        result: field === 'result' ? value : result,
        issues: field === 'issues' ? value : issues,
        notes: field === 'notes' ? value : notes,
      };

      const hasChanges =
        newValues.plan !== initialValuesRef.current.plan ||
        newValues.result !== initialValuesRef.current.result ||
        newValues.issues !== initialValuesRef.current.issues ||
        newValues.notes !== initialValuesRef.current.notes;

      if (hasChanges) {
        setSaveStatus('unsaved');
        // 传入当前日期，用于在执行时验证日期是否仍然匹配
        debouncedSave(newValues.plan, newValues.result, newValues.issues, newValues.notes, date);
      }
    },
    [plan, result, issues, notes, debouncedSave, date]
  );

  const dateObj = new Date(date);
  const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()];

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* 头部 */}
      <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#f0f6fc]">
            {formatDateChinese(date)} {dayOfWeek}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-[#8b949e]">
            {saveStatus === 'saved' && <span className="text-emerald-400">✓ 已保存</span>}
            {saveStatus === 'saving' && <span className="text-yellow-400">保存中...</span>}
            {saveStatus === 'unsaved' && <span className="text-gray-500">未保存</span>}
          </div>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="relative flex-1 overflow-y-auto p-6 space-y-4">
        {/* 切换日期加载中：右侧区域整体毛玻璃（不展示文案），并拦截交互 */}
        <div
          className={`absolute inset-0 z-10 bg-black/35 backdrop-blur-sm transition-opacity duration-400 ease-out ${
            blurActive ? 'opacity-100 cursor-wait' : 'opacity-0 pointer-events-none'
          }`}
        />
        <EditorSection
          title="Plan"
          icon="📋"
          value={plan}
          onChange={(v) => handleChange('plan', v)}
          placeholder="今日计划，输入 / 唤起命令菜单..."
          editorKey={editorKey}
          readOnly={loading}
        />
        <EditorSection
          title="Result"
          icon="✅"
          value={result}
          onChange={(v) => handleChange('result', v)}
          placeholder="完成情况..."
          editorKey={editorKey}
          readOnly={loading}
        />
        <EditorSection
          title="Issues"
          icon="⚠️"
          value={issues}
          onChange={(v) => handleChange('issues', v)}
          placeholder="遇到的问题..."
          editorKey={editorKey}
          readOnly={loading}
        />
        <EditorSection
          title="Notes"
          icon="📝"
          value={notes}
          onChange={(v) => handleChange('notes', v)}
          placeholder="其他备注..."
          editorKey={editorKey}
          readOnly={loading}
        />
      </div>
    </div>
  );
}
