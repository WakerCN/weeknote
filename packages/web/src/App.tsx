/**
 * WeekNote - AI 周报生成器
 * 主应用组件
 */

import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 示例 Daily Log
const SAMPLE_DAILY_LOG = `12-09 | 周一
Plan
[ ] 完成用户认证模块开发
[ ] 评审设计文档

Result
● 完成了用户认证模块的 80%
● 设计文档评审完成，有 3 处需要修改

Issues
● 后端接口文档不清晰，需要和后端同步

Notes
● 下午有项目周会

12-10 | 周二
Plan
[ ] 继续完成用户认证模块
[ ] 修复昨天评审发现的问题

Result
● 用户认证模块完成
● 设计文档修改完成并通过二次评审

Issues

Notes
● 团队新人入职
`;

function App() {
  const [dailyLog, setDailyLog] = useState(SAMPLE_DAILY_LOG);
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // 生成周报
  const handleGenerate = useCallback(async () => {
    if (!dailyLog.trim()) {
      setError('请输入 Daily Log 内容');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLog }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成失败');
      }

      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成周报失败');
    } finally {
      setIsGenerating(false);
    }
  }, [dailyLog]);

  // 复制周报
  const handleCopy = useCallback(async () => {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setError('复制失败，请手动复制');
    }
  }, [report]);

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
        <span className="text-sm text-[#8b949e]">AI 周报生成器</span>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* 上半区：Daily Log 输入 */}
        <section className="flex-1 flex gap-3 min-h-0">
          {/* Daily Log 编辑器 */}
          <div className="flex-1 flex flex-col bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
            <div className="h-10 flex items-center px-4 border-b border-[#30363d] bg-[#21262d]">
              <span className="text-sm font-medium text-[#8b949e]">📝 Daily Log</span>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={dailyLog}
                onChange={(value) => setDailyLog(value || '')}
                theme="vs-dark"
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
                }}
              />
            </div>
          </div>

          {/* Daily Log 预览 */}
          <div className="flex-1 flex flex-col bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
            <div className="h-10 flex items-center px-4 border-b border-[#30363d] bg-[#21262d]">
              <span className="text-sm font-medium text-[#8b949e]">👁️ 预览</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{dailyLog}</ReactMarkdown>
              </div>
            </div>
          </div>
        </section>

        {/* 生成按钮区 */}
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !dailyLog.trim()}
            className={`
              px-8 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${
                isGenerating || !dailyLog.trim()
                  ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/20'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                生成中...
              </span>
            ) : (
              '🚀 生成周报'
            )}
          </button>

          {error && (
            <span className="text-sm text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg">
              ❌ {error}
            </span>
          )}
        </div>

        {/* 下半区：周报输出 */}
        <section className="flex-1 flex gap-3 min-h-0">
          {/* 周报编辑器 */}
          <div className="flex-1 flex flex-col bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
            <div className="h-10 flex items-center px-4 border-b border-[#30363d] bg-[#21262d]">
              <span className="text-sm font-medium text-[#8b949e]">✏️ 周报编辑</span>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={report}
                onChange={(value) => setReport(value || '')}
                theme="vs-dark"
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
                }}
              />
            </div>
          </div>

          {/* 周报预览 */}
          <div className="flex-1 flex flex-col bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden relative">
            <div className="h-10 flex items-center justify-between px-4 border-b border-[#30363d] bg-[#21262d]">
              <span className="text-sm font-medium text-[#8b949e]">📋 预览</span>
              <button
                onClick={handleCopy}
                disabled={!report}
                className={`
                  px-3 py-1 rounded text-xs font-medium transition-all duration-200
                  ${
                    !report
                      ? 'bg-[#30363d] text-[#484f58] cursor-not-allowed'
                      : copySuccess
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                  }
                `}
              >
                {copySuccess ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {report ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[#484f58]">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📝</div>
                    <div>生成的周报将显示在这里</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
