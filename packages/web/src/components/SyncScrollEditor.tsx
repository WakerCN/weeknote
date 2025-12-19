/**
 * 同步滚动编辑器组件
 * 支持 Monaco Editor 和 Markdown 预览的双向同步滚动（百分比同步）
 * 左右编辑器+预览在同一个卡片容器内，体现关联关系
 */

import { useRef, useCallback, useEffect, useMemo, type ReactNode } from 'react';
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
      editor.onDidScrollChange(() => syncPreviewScroll(editor));
    },
    [syncPreviewScroll]
  );

  // 预览区滚动 -> 同步编辑器（百分比）
  const handlePreviewScroll = useMemo(
    () =>
      throttle(() => {
        if (isScrollingFromEditor.current || !previewRef.current || !editorRef.current)
          return;

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
    []
  );

  // 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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
