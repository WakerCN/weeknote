/**
 * WeekNote - AI 周报生成器
 * 主页面组件
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SyncScrollEditor from '../components/SyncScrollEditor';

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

export default function Home() {
  const navigate = useNavigate();
  const [dailyLog, setDailyLog] = useState(SAMPLE_DAILY_LOG);
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ id: string; name: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 流式生成周报
  const handleGenerate = useCallback(async () => {
    if (!dailyLog.trim()) {
      setError('请输入 Daily Log 内容');
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setError(null);
    setReport(''); // 清空之前的内容
    setModelInfo(null);

    try {
      const response = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLog }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '生成失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理 SSE 数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完成的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                setReport((prev) => prev + data.chunk);
              }

              if (data.done) {
                setModelInfo(data.model);
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // JSON 解析错误，忽略
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 用户取消，不显示错误
        return;
      }
      setError(err instanceof Error ? err.message : '生成周报失败');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [dailyLog]);

  // 取消生成
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

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
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#8b949e]">AI 周报生成器</span>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            title="设置"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        {/* 上半区：Daily Log 输入 */}
        <SyncScrollEditor
          value={dailyLog}
          onChange={setDailyLog}
          title="Daily Log"
          titleIcon="📝"
          previewTitle="预览"
          previewIcon="👁️"
        />

        {/* 生成按钮区 */}
        <div className="flex items-center justify-center gap-4 py-2">
          {isGenerating ? (
            <button
              onClick={handleCancel}
              className="px-8 py-2.5 rounded-lg font-medium text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-200"
            >
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
                生成中... 点击取消
              </span>
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!dailyLog.trim()}
              className={`
                px-8 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  !dailyLog.trim()
                    ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/20'
                }
              `}
            >
              🚀 生成周报
            </button>
          )}

          {error && (
            <span className="text-sm text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg">
              ❌ {error}
            </span>
          )}

          {modelInfo && !isGenerating && (
            <span className="text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg">
              ✓ 由 {modelInfo.name} 生成
            </span>
          )}
        </div>

        {/* 下半区：周报输出 */}
        <SyncScrollEditor
          value={report}
          onChange={setReport}
          readOnly={isGenerating}
          title="周报编辑"
          titleIcon="✏️"
          previewTitle="预览"
          previewIcon="📋"
          showGenerating={isGenerating}
          placeholder={
            <div className="h-full flex items-center justify-center text-[#484f58]">
              <div className="text-center">
                <div className="text-4xl mb-2">📝</div>
                <div>生成的周报将显示在这里</div>
              </div>
            </div>
          }
          headerRight={
            <button
              onClick={handleCopy}
              disabled={!report || isGenerating}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-all duration-200
                ${
                  !report || isGenerating
                    ? 'bg-[#30363d] text-[#484f58] cursor-not-allowed'
                    : copySuccess
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                }
              `}
            >
              {copySuccess ? '✓ 已复制' : '📋 复制'}
            </button>
          }
        />
      </main>
    </div>
  );
}
