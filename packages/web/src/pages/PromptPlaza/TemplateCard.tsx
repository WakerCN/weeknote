/**
 * 模板卡片组件
 */

import { type PromptTemplate } from '../../api';

interface TemplateCardProps {
  template: PromptTemplate;
  onPreview: () => void;
  onFavorite: () => void;
  onUnfavorite: () => void;
  isLoading?: boolean;
}

export default function TemplateCard({
  template,
  onPreview,
  onFavorite,
  onUnfavorite,
  isLoading,
}: TemplateCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (template.isFavorited) {
      onUnfavorite();
    } else {
      onFavorite();
    }
  };

  return (
    <div
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#484f58] transition-all duration-200 cursor-pointer flex flex-col"
      onClick={onPreview}
    >
      {/* 标题 */}
      <h3 className="text-[#f0f6fc] font-medium text-base truncate mb-2">
        📝 {template.name}
      </h3>

      {/* 描述 */}
      <p className="text-[#8b949e] text-sm line-clamp-2 flex-1 mb-3 min-h-[40px]">
        {template.description || '暂无描述'}
      </p>

      {/* 作者和日期 */}
      <div className="flex items-center gap-3 text-xs text-[#8b949e] mb-3">
        <span className="flex items-center gap-1">
          <span>👤</span>
          <span className="truncate max-w-[100px]">{template.authorName || '匿名用户'}</span>
        </span>
        <span className="flex items-center gap-1">
          <span>📅</span>
          <span>{new Date(template.createdAt).toLocaleDateString('zh-CN')}</span>
        </span>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-xs text-[#8b949e] mb-4">
        <span className="flex items-center gap-1">
          <span>❤️</span>
          <span>{template.likeCount || 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <span>📊</span>
          <span>使用 {template.usageCount || 0} 次</span>
        </span>
        <span className="flex items-center gap-1">
          <span>💬</span>
          <span>{template.commentCount || 0}</span>
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] rounded-md border border-[#30363d] transition-colors"
        >
          👁️ 预览
        </button>
        <button
          onClick={handleFavoriteClick}
          disabled={isLoading}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            template.isFavorited
              ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30 hover:bg-yellow-400/20'
              : 'text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] border-[#30363d]'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {template.isFavorited ? '⭐ 已收藏' : '⭐ 收藏'}
        </button>
      </div>
    </div>
  );
}
