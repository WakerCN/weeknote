/**
 * 日记编辑组件
 */

import { useState, useEffect } from 'react';
import { useDebounceFn } from 'ahooks';
import type { DailyRecord, SaveDayRecordParams } from '../api';
// 格式化日期显示 "12月23日"
const formatDateChinese = (date: string): string => {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
};

interface DayEditorProps {
  /** 当前日期 */
  date: string;
  /** 当前记录 */
  record: DailyRecord | null;
  /** 保存回调 */
  onSave: (params: SaveDayRecordParams) => Promise<void>;
  /** 切换日期回调 */
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function DayEditor({ date, record, onSave, onNavigate }: DayEditorProps) {
  const [plan, setPlan] = useState<string[]>([]);
  const [result, setResult] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // 当记录变化时更新状态
  useEffect(() => {
    if (record) {
      setPlan(record.plan || []);
      setResult(record.result || []);
      setIssues(record.issues || []);
      setNotes(record.notes || []);
      setSaveStatus('saved');
    } else {
      setPlan([]);
      setResult([]);
      setIssues([]);
      setNotes([]);
      setSaveStatus('saved');
    }
  }, [record, date]);

  // 防抖保存
  const { run: debouncedSave } = useDebounceFn(
    async () => {
      setSaveStatus('saving');
      try {
        await onSave({ plan, result, issues, notes });
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('unsaved');
        console.error('保存失败:', error);
      }
    },
    { wait: 1000 }
  );

  // 监听变化并保存
  useEffect(() => {
    if (record) {
      // 检查是否有变化
      const hasChanges =
        JSON.stringify(plan) !== JSON.stringify(record.plan) ||
        JSON.stringify(result) !== JSON.stringify(record.result) ||
        JSON.stringify(issues) !== JSON.stringify(record.issues) ||
        JSON.stringify(notes) !== JSON.stringify(record.notes);

      if (hasChanges) {
        setSaveStatus('unsaved');
        debouncedSave();
      }
    } else if (plan.length > 0 || result.length > 0 || issues.length > 0 || notes.length > 0) {
      // 新记录，有内容时保存
      setSaveStatus('unsaved');
      debouncedSave();
    }
  }, [plan, result, issues, notes]);

  const updateSection = (
    section: 'plan' | 'result' | 'issues' | 'notes',
    index: number,
    value: string
  ) => {
    const setter = {
      plan: setPlan,
      result: setResult,
      issues: setIssues,
      notes: setNotes,
    }[section];

    setter((prev) => {
      const newArr = [...prev];
      newArr[index] = value;
      return newArr;
    });
  };

  const addItem = (section: 'plan' | 'result' | 'issues' | 'notes') => {
    const setter = {
      plan: setPlan,
      result: setResult,
      issues: setIssues,
      notes: setNotes,
    }[section];

    setter((prev) => [...prev, '']);
  };

  const removeItem = (section: 'plan' | 'result' | 'issues' | 'notes', index: number) => {
    const setter = {
      plan: setPlan,
      result: setResult,
      issues: setIssues,
      notes: setNotes,
    }[section];

    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const renderSection = (
    title: string,
    icon: string,
    section: 'plan' | 'result' | 'issues' | 'notes',
    items: string[]
  ) => {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-[#f0f6fc] font-medium">{title}</h3>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-[#8b949e] mt-2">-</span>
              <input
                type="text"
                value={item}
                onChange={(e) => updateSection(section, index, e.target.value)}
                placeholder={`输入${title}...`}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={() => removeItem(section, index)}
                className="p-2 text-[#8b949e] hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => addItem(section)}
            className="w-full px-3 py-2 rounded-lg border border-dashed border-[#30363d] text-[#8b949e] hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-sm"
          >
            + 添加一项
          </button>
        </div>
      </div>
    );
  };

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
      <div className="flex-1 overflow-y-auto p-6">
        {renderSection('Plan', '📋', 'plan', plan)}
        {renderSection('Result', '✅', 'result', result)}
        {renderSection('Issues', '⚠️', 'issues', issues)}
        {renderSection('Notes', '📝', 'notes', notes)}
      </div>
    </div>
  );
}

