/**
 * 模板详情弹窗
 */

import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  type PromptTemplate,
  likePrompt,
  favoritePrompt,
  unfavoritePrompt,
  copyPrompt,
} from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import CommentSection from './CommentSection';

interface TemplateDetailProps {
  template: PromptTemplate;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TemplateDetail({
  template,
  onClose,
  onUpdate,
}: TemplateDetailProps) {
  const { isAuthenticated } = useAuth();
  const templateId = template.id || template._id || '';

  // 点赞
  const { loading: liking, run: handleLike } = useRequest(
    async () => {
      await likePrompt(templateId);
      onUpdate();
    },
    {
      manual: true,
      onError: (err) => toast.error(err.message || '点赞失败'),
    }
  );

  // 收藏
  const { loading: favoriting, run: handleFavorite } = useRequest(
    async () => {
      await favoritePrompt(templateId);
      onUpdate();
      toast.success('收藏成功');
    },
    {
      manual: true,
      onError: (err) => toast.error(err.message || '收藏失败'),
    }
  );

  // 取消收藏
  const { loading: unfavoriting, run: handleUnfavorite } = useRequest(
    async () => {
      await unfavoritePrompt(templateId);
      onUpdate();
      toast.success('已取消收藏');
    },
    {
      manual: true,
      onError: (err) => toast.error(err.message || '取消收藏失败'),
    }
  );

  // 复制使用
  const { loading: copying, run: handleCopy } = useRequest(
    async () => {
      await copyPrompt(templateId);
      toast.success('已复制为新模板，可在设置中查看');
    },
    {
      manual: true,
      onError: (err) => toast.error(err.message || '复制失败'),
    }
  );

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
          <h2 className="text-xl font-semibold text-[#f0f6fc]">
            📝 {template.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto p-4">
          {/* 元信息 */}
          <div className="flex items-center gap-4 text-sm text-[#8b949e] mb-4">
            <span className="flex items-center gap-1">
              <span>👤</span>
              <span>{template.authorName || '匿名用户'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>📅</span>
              <span>{new Date(template.createdAt).toLocaleDateString('zh-CN')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>❤️</span>
              <span>{template.likeCount || 0}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>📊</span>
              <span>使用 {template.usageCount || 0} 次</span>
            </span>
          </div>

          {/* 描述 */}
          {template.description && (
            <p className="text-[#c9d1d9] mb-6">{template.description}</p>
          )}

          {/* 系统提示词 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#8b949e] mb-2">
              📋 系统提示词 (System Prompt)
            </h3>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-60 overflow-auto">
              <pre className="text-sm text-[#c9d1d9] font-mono whitespace-pre-wrap">
                {template.systemPrompt}
              </pre>
            </div>
          </div>

          {/* 用户提示词模板 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[#8b949e] mb-2">
              📝 用户提示词模板 (User Prompt)
            </h3>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-40 overflow-auto">
              <pre className="text-sm text-[#c9d1d9] font-mono whitespace-pre-wrap">
                {template.userPromptTemplate}
              </pre>
            </div>
          </div>

          {/* 操作按钮 */}
          {isAuthenticated && (
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={handleLike}
                disabled={liking}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] border border-[#30363d]"
              >
                {liking ? '...' : '❤️ 点赞'}
              </button>
              <button
                onClick={template.isFavorited ? handleUnfavorite : handleFavorite}
                disabled={favoriting || unfavoriting}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border ${
                  template.isFavorited
                    ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30 hover:bg-yellow-400/20'
                    : 'text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] border-[#30363d]'
                }`}
              >
                {favoriting || unfavoriting ? '...' : template.isFavorited ? '⭐ 已收藏' : '⭐ 收藏'}
              </button>
              <button
                onClick={handleCopy}
                disabled={copying}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-[#238636] text-white hover:bg-[#2ea043]"
              >
                {copying ? '复制中...' : '📋 复制使用'}
              </button>
            </div>
          )}

          {/* 评论区 */}
          <CommentSection templateId={templateId} />
        </div>
      </div>
    </div>
  );
}
