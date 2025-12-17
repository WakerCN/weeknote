/**
 * 同步滚动编辑器组件
 * 支持 Monaco Editor 和 Markdown 预览的双向同步滚动
 */

import {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SyncScrollEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  title: string;
  titleIcon: string;
  previewTitle: string;
  previewIcon: string;
  placeholder?: ReactNode;
  headerRight?: ReactNode;
  showGenerating?: boolean;
}

// Monaco Editor 实例类型
type MonacoEditor = Parameters<OnMount>[0];

/**
 * 创建带行号信息的 Markdown 组件
 */
function createLineAwareComponents(content: string): Components {
  const lines = content.split('\n');
  let currentLineIndex = 0;

  // 查找文本在源码中的行号
  const findLineNumber = (text: string): number => {
    if (!text) return -1;

    const searchText = text.trim().slice(0, 30);
    for (let i = currentLineIndex; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        currentLineIndex = i + 1;
        return i + 1;
      }
    }
    // 如果没找到，从头找
    for (let i = 0; i < currentLineIndex; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return -1;
  };

  return {
    p: ({ children, ...props }) => {
      const text = extractText(children);
      const line = findLineNumber(text);
      return (
        <p {...props} data-source-line={line > 0 ? line : undefined}>
          {children}
        </p>
      );
    },
    h1: ({ children, ...props }) => {
      const text = extractText(children);
      const line = findLineNumber(text);
      return (
        <h1 {...props} data-source-line={line > 0 ? line : undefined}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const text = extractText(children);
      const line = findLineNumber(text);
      return (
        <h2 {...props} data-source-line={line > 0 ? line : undefined}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const text = extractText(children);
      const line = findLineNumber(text);
      return (
        <h3 {...props} data-source-line={line > 0 ? line : undefined}>
          {children}
        </h3>
      );
    },
    li: ({ children, ...props }) => {
      const text = extractText(children);
      const line = findLineNumber(text);
      return (
        <li {...props} data-source-line={line > 0 ? line : undefined}>
          {children}
        </li>
      );
    },
    blockquote: ({ children, ...props }) => {
      const text = extractText(children);
      const line = findLineNumber(text);
      return (
        <blockquote {...props} data-source-line={line > 0 ? line : undefined}>
          {children}
        </blockquote>
      );
    },
  };
}

/**
 * 从 React children 中提取纯文本
 */
function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

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

  // Memoize line-aware components
  const lineAwareComponents = useMemo(
    () => createLineAwareComponents(value),
    [value]
  );

  // 处理编辑器挂载
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // 监听编辑器滚动
    editor.onDidScrollChange(() => {
      if (isScrollingFromPreview.current) return;
      if (!previewRef.current) return;

      isScrollingFromEditor.current = true;

      // 获取编辑器可见行范围
      const visibleRanges = editor.getVisibleRanges();
      if (visibleRanges.length === 0) return;

      const firstVisibleLine = visibleRanges[0].startLineNumber;

      // 在预览区找到对应行号的元素
      const targetElement = previewRef.current.querySelector(
        `[data-source-line="${firstVisibleLine}"]`
      ) as HTMLElement;

      if (targetElement) {
        // 滚动到对应元素
        const containerRect = previewRef.current.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const offsetTop = elementRect.top - containerRect.top + previewRef.current.scrollTop;

        previewRef.current.scrollTo({
          top: Math.max(0, offsetTop - 16), // 16px 的顶部间距
          behavior: 'auto',
        });
      } else {
        // 如果没找到精确匹配，使用百分比滚动作为后备
        const model = editor.getModel();
        if (!model) return;

        const totalLines = model.getLineCount();
        const scrollPercentage = (firstVisibleLine - 1) / Math.max(1, totalLines - 1);
        const maxScroll = previewRef.current.scrollHeight - previewRef.current.clientHeight;
        previewRef.current.scrollTop = scrollPercentage * maxScroll;
      }

      // 延迟重置标志
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingFromEditor.current = false;
      }, 100);
    });
  }, []);

  // 处理预览区滚动
  const handlePreviewScroll = useCallback(() => {
    if (isScrollingFromEditor.current) return;
    if (!previewRef.current || !editorRef.current) return;

    isScrollingFromPreview.current = true;

    const container = previewRef.current;
    const containerRect = container.getBoundingClientRect();

    // 找到当前视口中第一个可见的带有行号的元素
    const elements = container.querySelectorAll('[data-source-line]');
    let targetLine = 1;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      // 如果元素在容器视口内
      if (rect.top >= containerRect.top - 10 && rect.top <= containerRect.bottom) {
        const line = parseInt(element.getAttribute('data-source-line') || '1', 10);
        if (line > 0) {
          targetLine = line;
          break;
        }
      }
    }

    // 滚动编辑器到对应行
    editorRef.current.revealLineInCenter(targetLine);

    // 延迟重置标志
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingFromPreview.current = false;
    }, 100);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="flex-1 flex gap-3 min-h-0">
      {/* 编辑器 */}
      <div className="flex-1 flex flex-col bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
        <div className="h-10 flex items-center px-4 border-b border-[#30363d] bg-[#21262d]">
          <span className="text-sm font-medium text-[#8b949e]">
            {titleIcon} {title}
          </span>
          {showGenerating && (
            <span className="ml-2 text-xs text-emerald-400 animate-pulse">
              ● 正在生成...
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={value}
            onChange={(v) => onChange?.(v || '')}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
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
              readOnly,
            }}
          />
        </div>
      </div>

      {/* 预览 */}
      <div className="flex-1 flex flex-col bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
        <div className="h-10 flex items-center justify-between px-4 border-b border-[#30363d] bg-[#21262d]">
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
        <div
          ref={previewRef}
          onScroll={handlePreviewScroll}
          className="flex-1 overflow-auto p-4"
        >
          {value ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={lineAwareComponents}
              >
                {value}
              </ReactMarkdown>
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

