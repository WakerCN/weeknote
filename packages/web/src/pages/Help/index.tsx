/**
 * 帮助中心页面
 * 包含侧边栏导航和文档内容区
 */

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { useTransitionNavigate } from '../../lib/navigation';
import DocViewer from './DocViewer';
import TableOfContents from './TableOfContents';
import UserMenu from '../../components/UserMenu';

// 文档列表配置
const DOC_LIST = [
  { id: 'quick-start', title: '快速开始', icon: '🚀', description: '注册登录、首次配置' },
  { id: 'daily-log', title: '每日记录', icon: '📅', description: '日历视图、编辑记录' },
  { id: 'generation', title: '生成周报', icon: '🤖', description: '选择范围、生成周报' },
  { id: 'settings', title: '设置配置', icon: '⚙️', description: 'API Key、Prompt、提醒' },
  { id: 'faq', title: '常见问题', icon: '❓', description: '常见问题解答' },
];

// 动态导入文档内容
async function loadDoc(id: string): Promise<string> {
  try {
    const module = await import(`./docs/${id}.md?raw`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load doc: ${id}`, error);
    return `# 文档加载失败\n\n抱歉，无法加载文档「${id}」。`;
  }
}

export default function Help() {
  const { docId } = useParams<{ docId?: string }>();
  const navigate = useTransitionNavigate();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载文档内容
  useEffect(() => {
    const loadContent = async () => {
      if (!docId) {
        setContent('');
        return;
      }

      // 检查文档是否存在
      const docExists = DOC_LIST.some((doc) => doc.id === docId);
      if (!docExists) {
        setError('文档不存在');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const docContent = await loadDoc(docId);
        setContent(docContent);
      } catch (err) {
        setError('加载文档失败，请稍后重试');
        console.error('Failed to load doc:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [docId]);

  // 切换文档
  const handleDocClick = (id: string) => {
    navigate(`/help/${id}`, { scope: 'root' });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117]">
      {/* 顶部导航栏 */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/', { scope: 'root' })}
            className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-semibold text-[#f0f6fc]">帮助中心</h1>
        </div>
        <UserMenu />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 - 文档列表 */}
        <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {DOC_LIST.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleDocClick(doc.id)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  docId === doc.id
                    ? 'bg-[#21262d] text-[#f0f6fc]'
                    : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]'
                }`}
              >
                <span className="text-lg shrink-0">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{doc.title}</div>
                  <div className="text-xs text-[#8b949e] mt-0.5">{doc.description}</div>
                </div>
                {docId === doc.id && (
                  <ChevronRight className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 flex overflow-hidden bg-[#0d1117]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <div className="text-[#8b949e]">加载中...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-red-400 mb-2">❌ {error}</div>
                <button
                  onClick={() => navigate('/help', { scope: 'root' })}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  返回文档列表
                </button>
              </div>
            </div>
          ) : content ? (
            <>
              {/* 文档内容区 */}
              <div className="flex-1 overflow-y-auto" id="help-content-scroll">
                <div className="max-w-4xl mx-auto p-8">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      </div>
                    }
                  >
                    <DocViewer content={content} />
                  </Suspense>
                </div>
              </div>
              {/* 右侧目录 */}
              <TableOfContents content={content} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <BookOpen className="w-16 h-16 text-[#8b949e] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[#f0f6fc] mb-2">
                  欢迎来到帮助中心
                </h2>
                <p className="text-[#8b949e] mb-6">
                  请从左侧选择一篇文档开始阅读，了解如何使用 WeekNote
                </p>
                <div className="grid grid-cols-2 gap-3 text-left">
                  {DOC_LIST.slice(0, 4).map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleDocClick(doc.id)}
                      className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-emerald-500/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{doc.icon}</span>
                        <span className="font-medium text-[#f0f6fc] text-sm">{doc.title}</span>
                      </div>
                      <div className="text-xs text-[#8b949e]">{doc.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
