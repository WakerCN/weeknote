/**
 * 同步滚动编辑器组件
 * 支持 Monaco Editor 和 Markdown 预览的双向同步滚动（百分比同步）
 * 左右编辑器+预览在同一个卡片容器内，体现关联关系
 */

import { useRef, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { throttle } from 'lodash-es';

interface SyncScrollEditorProps {
  /** 编辑器内容 */
  value: string;
  /** 内容变更回调 */
  onChange?: (value: string) => void;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 编辑器标题 */
  title: string;
  /** 编辑器标题图标 */
  titleIcon: string;
  /** 预览区标题 */
  previewTitle: string;
  /** 预览区标题图标 */
  previewIcon: string;
  /** 内容为空时显示的占位内容 */
  placeholder?: ReactNode;
  /** 标题栏右侧自定义内容 */
  headerRight?: ReactNode;
  /** 是否显示生成中状态 */
  showGenerating?: boolean;
}

// Monaco Editor 实例类型
type MonacoEditor = Parameters<OnMount>[0];

export function SyncScrollEditor({
  value,
  onChange,
  readOnly = false,
  title,
  titleIcon,
  previewTitle,
  previewIcon,
  placeholder,
  headerRight,
  showGenerating = false,
}: SyncScrollEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isScrollingFromEditor = useRef(false);
  const isScrollingFromPreview = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 自动滚动控制：用户手动滚动时暂停自动滚动
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 当开始生成时，重新启用自动滚动
  useEffect(() => {
    if (showGenerating) {
      setAutoScrollEnabled(true);
    }
  }, [showGenerating]);

  // 流式生成时自动滚动到底部
  useEffect(() => {
    if (!showGenerating || !autoScrollEnabled) return;

    // 滚动编辑器到底部
    if (editorRef.current) {
      const editor = editorRef.current;
      // 使用 requestAnimationFrame 确保在内容更新后滚动
      requestAnimationFrame(() => {
        const scrollHeight = editor.getScrollHeight();
        editor.setScrollTop(scrollHeight);
      });
    }

    // 滚动预览区到底部
    if (previewRef.current) {
      requestAnimationFrame(() => {
        if (previewRef.current) {
          previewRef.current.scrollTop = previewRef.current.scrollHeight;
        }
      });
    }
  }, [value, showGenerating, autoScrollEnabled]);

  // 检测用户手动滚动（向上滚动时暂停自动滚动）
  const handleUserScroll = useCallback(
    (container: HTMLElement | MonacoEditor, type: 'editor' | 'preview') => {
      if (!showGenerating) return;

      // 获取滚动位置信息
      let scrollTop: number;
      let scrollHeight: number;
      let clientHeight: number;

      if (type === 'editor') {
        const editor = container as MonacoEditor;
        scrollTop = editor.getScrollTop();
        scrollHeight = editor.getScrollHeight();
        clientHeight = editor.getLayoutInfo().height;
      } else {
        const elem = container as HTMLElement;
        scrollTop = elem.scrollTop;
        scrollHeight = elem.scrollHeight;
        clientHeight = elem.clientHeight;
      }

      const maxScroll = scrollHeight - clientHeight;
      const isNearBottom = maxScroll - scrollTop < 50; // 距离底部 50px 以内

      // 如果用户向上滚动（不在底部附近），暂停自动滚动
      if (!isNearBottom && autoScrollEnabled) {
        setAutoScrollEnabled(false);
      }

      // 如果用户滚动回底部，重新启用自动滚动
      if (isNearBottom && !autoScrollEnabled) {
        setAutoScrollEnabled(true);
      }
    },
    [showGenerating, autoScrollEnabled]
  );

  // 编辑器滚动 -> 同步预览区（百分比）
  const syncPreviewScroll = useMemo(
    () =>
      throttle((editor: MonacoEditor) => {
        if (isScrollingFromPreview.current || !previewRef.current) return;

        isScrollingFromEditor.current = true;

        // 获取编辑器滚动百分比
        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight();
        const clientHeight = editor.getLayoutInfo().height;
        const maxScroll = scrollHeight - clientHeight;

        if (maxScroll <= 0) return;

        const scrollPercentage = scrollTop / maxScroll;

        // 同步到预览区
        const previewMaxScroll =
          previewRef.current.scrollHeight - previewRef.current.clientHeight;
        previewRef.current.scrollTop = scrollPercentage * previewMaxScroll;

        // 延迟重置标志
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingFromEditor.current = false;
        }, 100);
      }, 16), // ~60fps
    []
  );

  // 处理编辑器挂载
  const handleEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      editor.onDidScrollChange(() => {
        syncPreviewScroll(editor);
        // 检测用户手动滚动
        handleUserScroll(editor, 'editor');
      });
    },
    [syncPreviewScroll, handleUserScroll]
  );

  // 预览区滚动 -> 同步编辑器（百分比）
  const handlePreviewScroll = useMemo(
    () =>
      throttle(() => {
        if (!previewRef.current || !editorRef.current) return;

        // 检测用户手动滚动
        handleUserScroll(previewRef.current, 'preview');

        if (isScrollingFromEditor.current) return;

        isScrollingFromPreview.current = true;

        const container = previewRef.current;
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (maxScroll <= 0) return;

        const scrollPercentage = container.scrollTop / maxScroll;

        // 同步到编辑器
        const editor = editorRef.current;
        const editorScrollHeight = editor.getScrollHeight();
        const editorClientHeight = editor.getLayoutInfo().height;
        const editorMaxScroll = editorScrollHeight - editorClientHeight;

        editor.setScrollTop(scrollPercentage * editorMaxScroll);

        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingFromPreview.current = false;
        }, 100);
      }, 16), // ~60fps
    [handleUserScroll]
  );

  // 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      syncPreviewScroll.cancel();
      handlePreviewScroll.cancel();
    };
  }, [syncPreviewScroll, handlePreviewScroll]);

  return (
    <section className="flex-1 flex flex-col min-h-0 bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
      {/* 统一的标题栏 */}
      <div className="h-10 flex border-b border-[#30363d] bg-[#21262d] shrink-0">
        {/* 左侧：编辑器标题 */}
        <div className="w-1/2 flex items-center px-4 border-r border-[#30363d]">
          <span className="text-sm font-medium text-[#8b949e]">
            {titleIcon} {title}
          </span>
          {showGenerating && (
            <span className="ml-2 text-xs text-emerald-400 animate-pulse">
              ● 正在生成...
            </span>
          )}
        </div>

        {/* 右侧：预览标题 */}
        <div className="w-1/2 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#8b949e]">
              {previewIcon} {previewTitle}
            </span>
            {showGenerating && (
              <span className="text-xs text-emerald-400 animate-pulse">
                ● 实时更新中
              </span>
            )}
          </div>
          {headerRight}
        </div>
      </div>

      {/* 内容区：左右分栏 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：编辑器 */}
        <div className="w-1/2 min-h-0 border-r border-[#30363d]">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={value}
            onChange={(v) => onChange?.(v || '')}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'off',
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'hidden',
                verticalScrollbarSize: 8,
              },
              // 禁用 Unicode 字符高亮（避免中文标点被标记为"易混淆字符"）
              unicodeHighlight: {
                ambiguousCharacters: false,
                invisibleCharacters: false,
              },
              readOnly,
            }}
          />
        </div>

        {/* 右侧：预览 */}
        <div
          ref={previewRef}
          onScroll={handlePreviewScroll}
          className="w-1/2 overflow-auto p-4"
        >
          {value ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            placeholder
          )}
        </div>
      </div>
    </section>
  );
}

export default SyncScrollEditor;
