/**
 * Prompt 预览侧边面板
 * 从右侧滑出，展示完整的 System Prompt 和 User Prompt
 * 支持拖拽左边缘调整宽度
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, MessageSquare, Copy, Check, GripVertical } from 'lucide-react';
import { useRequest } from 'ahooks';
import { getPrompts, type PromptTemplate } from '../api';
import { toast } from 'sonner';

interface PromptPanelProps {
  /** 是否显示面板 */
  open: boolean;
  /** 关闭面板回调 */
  onClose: () => void;
  /** 当前的 Daily Log 内容（用于预览完整的 User Prompt） */
  dailyLog: string;
}

type TabType = 'system' | 'user';

// 宽度限制
const MIN_WIDTH = 400;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 580;
const STORAGE_KEY = 'weeknote-prompt-panel-width';

// 从 localStorage 读取保存的宽度
function getSavedWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        return width;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH;
}

// 保存宽度到 localStorage
function saveWidth(width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // ignore
  }
}

export default function PromptPanel({ open, onClose, dailyLog }: PromptPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('system');
  const [copiedTab, setCopiedTab] = useState<TabType | null>(null);
  const [panelWidth, setPanelWidth] = useState(getSavedWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 获取 Prompt 模板
  const { data: promptsData, loading } = useRequest(getPrompts, {
    refreshDeps: [open],
    ready: open,
  });

  // 获取当前激活的模板
  const activeTemplate = promptsData?.templates.find(
    (t: PromptTemplate) => t.id === promptsData.activeTemplateId
  );

  // 系统提示词
  const systemPrompt = activeTemplate?.systemPrompt || promptsData?.defaults?.systemPrompt || '';

  // 用户提示词（替换占位符）
  const userPromptTemplate =
    activeTemplate?.userPromptTemplate || promptsData?.defaults?.userPromptTemplate || '';
  const userPrompt = userPromptTemplate.replace(/\{\{dailyLog\}\}/g, dailyLog || '（Daily Log 为空）');

  // 复制功能
  const handleCopy = async (type: TabType) => {
    const content = type === 'system' ? systemPrompt : userPrompt;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTab(type);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  // 开始调整大小
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // 调整大小过程
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      // 计算新宽度：窗口宽度 - 鼠标位置
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setPanelWidth(clampedWidth);
    },
    [isResizing]
  );

  // 结束调整大小
  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      saveWidth(panelWidth);
    }
  }, [isResizing, panelWidth]);

  // 监听鼠标移动和释放事件
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      // 防止选中文本
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isResizing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isResizing]);

  // 计算实际显示宽度（考虑视口限制）
  const displayWidth = Math.min(panelWidth, window.innerWidth * 0.9);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={isResizing ? undefined : onClose}
      />

      {/* 侧边面板 */}
      <div
        ref={panelRef}
        style={{ width: displayWidth }}
        className={`
          fixed top-0 right-0 h-full bg-[#161b22] border-l border-[#30363d] z-50
          transform transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {/* 左侧拖拽手柄 */}
        <div
          onMouseDown={handleResizeStart}
          className={`
            absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10
            flex items-center justify-center
            group hover:bg-emerald-500/20 transition-colors
            ${isResizing ? 'bg-emerald-500/30' : ''}
          `}
        >
          {/* 拖拽指示器 */}
          <div
            className={`
              absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
              w-5 h-12 rounded-full bg-[#21262d] border border-[#30363d]
              flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-opacity
              ${isResizing ? 'opacity-100 bg-emerald-500/20 border-emerald-500/50' : ''}
            `}
          >
            <GripVertical className="w-3 h-3 text-[#8b949e]" />
          </div>
          {/* 高亮线条 */}
          <div
            className={`
              absolute left-0 top-0 bottom-0 w-0.5
              transition-colors
              ${isResizing ? 'bg-emerald-500' : 'group-hover:bg-emerald-500/50'}
            `}
          />
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#f0f6fc]">Prompt 预览</h2>
              <p className="text-xs text-[#8b949e]">
                {activeTemplate ? `模板：${activeTemplate.name}` : '使用默认模板'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 宽度指示 */}
            <span className="text-xs text-[#484f58] tabular-nums">
              {Math.round(displayWidth)}px
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-[#30363d]">
          <button
            onClick={() => setActiveTab('system')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === 'system'
                  ? 'text-[#f0f6fc] border-b-2 border-emerald-500 bg-[#21262d]/50'
                  : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]/30'
              }
            `}
          >
            <FileText className="w-4 h-4" />
            System Prompt
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors
              ${
                activeTab === 'user'
                  ? 'text-[#f0f6fc] border-b-2 border-cyan-500 bg-[#21262d]/50'
                  : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]/30'
              }
            `}
          >
            <MessageSquare className="w-4 h-4" />
            User Prompt
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-[#8b949e]">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                加载中...
              </div>
            </div>
          ) : (
            <>
              {/* 提示信息 */}
              <div className="px-4 py-3 bg-[#21262d]/50 border-b border-[#30363d]">
                {activeTab === 'system' ? (
                  <p className="text-xs text-[#8b949e]">
                    💡 System Prompt 定义了 AI 的角色和输出格式，是生成周报的核心指令。
                  </p>
                ) : (
                  <p className="text-xs text-[#8b949e]">
                    💡 User Prompt 包含实际的 Daily Log 内容，已替换 {'{{dailyLog}}'} 占位符。
                  </p>
                )}
              </div>

              {/* Prompt 内容 */}
              <div className="flex-1 overflow-auto p-4">
                <pre className="text-sm text-[#c9d1d9] whitespace-pre-wrap font-mono leading-relaxed">
                  {activeTab === 'system' ? systemPrompt : userPrompt}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-4 py-3 border-t border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#8b949e]">
              {activeTab === 'system' ? (
                <span>共 {systemPrompt.length} 字符</span>
              ) : (
                <span>共 {userPrompt.length} 字符</span>
              )}
            </div>
            <button
              onClick={() => handleCopy(activeTab)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
            >
              {copiedTab === activeTab ? (
                <>
                  <Check className="w-4 h-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制 {activeTab === 'system' ? 'System' : 'User'} Prompt
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
