/**
 * Prompt 广场页面
 * 展示公开的 Prompt 模板，支持搜索、排序、收藏
 */

import { useState, useMemo } from 'react';
import { useRequest, useDebounceFn } from 'ahooks';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getPublicPrompts,
  favoritePrompt,
  unfavoritePrompt,
  type PromptTemplate,
} from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import TemplateCard from './TemplateCard';
import TemplateDetail from './TemplateDetail';

type SortType = 'popular' | 'latest' | 'likes';

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: 'popular', label: '🔥 热门' },
  { value: 'latest', label: '🕐 最新' },
  { value: 'likes', label: '❤️ 最多点赞' },
];

export default function PromptPlaza() {
  const { isAuthenticated } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [sortType, setSortType] = useState<SortType>('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // 防抖搜索
  const { run: debouncedSearch } = useDebounceFn(
    (text: string) => {
      setSearchText(text);
    },
    { wait: 300 }
  );

  // 加载公开模板
  const { data, loading, refresh } = useRequest(
    () => getPublicPrompts({ limit: 50, search: searchText, sort: sortType }),
    {
      refreshDeps: [searchText, sortType],
    }
  );

  const templates = data?.templates || [];

  // 收藏/取消收藏
  const handleFavorite = async (template: PromptTemplate) => {
    if (!isAuthenticated) {
      toast.error('请先登录后再收藏');
      return;
    }

    const id = template.id || template._id || '';
    setLoadingIds((prev) => new Set(prev).add(id));

    try {
      if (template.isFavorited) {
        await unfavoritePrompt(id);
        toast.success('已取消收藏');
      } else {
        await favoritePrompt(id);
        toast.success('收藏成功');
      }
      await refresh();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 更新选中模板的状态
  const handleDetailUpdate = async () => {
    await refresh();
    // 更新选中模板的状态
    if (selectedTemplate) {
      const updated = templates.find(
        (t) => (t.id || t._id) === (selectedTemplate.id || selectedTemplate._id)
      );
      if (updated) {
        setSelectedTemplate(updated);
      }
    }
  };

  // 空状态
  const isEmpty = !loading && templates.length === 0;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/80 backdrop-blur-md border-b border-[#30363d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="text-[#f0f6fc] font-semibold text-lg hover:text-[#58a6ff] transition-colors">
              🏠 WeekNote
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/settings/prompt"
                className="text-sm text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
              >
                ⚙️ 我的模板
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] rounded-md transition-colors"
                >
                  登录
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f0f6fc] mb-2">🎯 Prompt 广场</h1>
          <p className="text-[#8b949e]">探索和分享优质的周报生成模板</p>
        </div>

        {/* 搜索和排序 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          {/* 搜索框 */}
          <div className="flex-1 w-full sm:max-w-md">
            <input
              type="text"
              placeholder="🔍 搜索模板..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          {/* 排序下拉 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b949e]">排序:</span>
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-[#f0f6fc] text-sm focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 模板网格 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[#8b949e]">加载中...</div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-medium text-[#f0f6fc] mb-2">
              {searchText ? '没有找到匹配的模板' : '暂无公开模板'}
            </h3>
            <p className="text-[#8b949e] mb-6">
              {searchText
                ? '试试其他关键词吧'
                : '成为第一个分享模板的人吧！'}
            </p>
            {!searchText && (
              <Link
                to="/settings/prompt"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition-colors"
              >
                🚀 去发布模板
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const id = template.id || template._id || '';
              return (
                <TemplateCard
                  key={id}
                  template={template}
                  onPreview={() => setSelectedTemplate(template)}
                  onFavorite={() => handleFavorite(template)}
                  onUnfavorite={() => handleFavorite(template)}
                  isLoading={loadingIds.has(id)}
                />
              );
            })}
          </div>
        )}

        {/* 分页提示 */}
        {data?.pagination && data.pagination.hasMore && (
          <div className="text-center mt-8">
            <button className="px-6 py-2 text-sm font-medium text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] rounded-lg border border-[#30363d] transition-colors">
              加载更多...
            </button>
          </div>
        )}
      </main>

      {/* 模板详情弹窗 */}
      {selectedTemplate && (
        <TemplateDetail
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUpdate={handleDetailUpdate}
        />
      )}
    </div>
  );
}
