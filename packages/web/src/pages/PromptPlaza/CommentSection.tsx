/**
 * 评论区组件
 */

import { useState } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  getPromptComments,
  createComment,
  deleteComment,
  likeComment,
  type PromptComment,
} from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface CommentSectionProps {
  templateId: string;
}

export default function CommentSection({ templateId }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  // 加载评论
  const { data, loading, refresh } = useRequest(
    () => getPromptComments(templateId, { limit: 50 }),
    {
      refreshDeps: [templateId],
    }
  );

  const comments = data?.comments || [];

  // 发表评论
  const { loading: submitting, run: handleSubmit } = useRequest(
    async () => {
      if (!newComment.trim()) throw new Error('评论内容不能为空');
      await createComment(templateId, newComment.trim(), replyTo?.id);
      setNewComment('');
      setReplyTo(null);
      await refresh();
    },
    {
      manual: true,
      onSuccess: () => toast.success('评论发表成功'),
      onError: (err) => toast.error(err.message || '评论失败'),
    }
  );

  // 删除评论
  const { run: handleDelete } = useRequest(
    async (commentId: string) => {
      await deleteComment(commentId);
      await refresh();
    },
    {
      manual: true,
      onSuccess: () => toast.success('评论已删除'),
      onError: (err) => toast.error(err.message || '删除失败'),
    }
  );

  // 点赞评论
  const { run: handleLike } = useRequest(
    async (commentId: string) => {
      await likeComment(commentId);
      await refresh();
    },
    {
      manual: true,
      onError: (err) => toast.error(err.message || '点赞失败'),
    }
  );

  const handleReply = (comment: PromptComment) => {
    setReplyTo({ id: comment._id, name: comment.authorName });
  };

  const cancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  // 渲染单条评论
  const renderComment = (comment: PromptComment, isReply = false) => {
    const isOwn = user?.userId === comment.userId;

    return (
      <div
        key={comment._id}
        className={`${isReply ? 'ml-8 pl-4 border-l border-[#30363d]' : ''}`}
      >
        <div className="py-3">
          {/* 评论头部 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[#f0f6fc]">
              👤 {comment.authorName}
            </span>
            <span className="text-xs text-[#484f58]">
              📅 {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>

          {/* 评论内容 */}
          <p className="text-sm text-[#c9d1d9] mb-2 whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* 评论操作 */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => handleLike(comment._id)}
              className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors flex items-center gap-1"
            >
              ❤️ {comment.likeCount || 0}
            </button>
            {isAuthenticated && !isReply && (
              <button
                onClick={() => handleReply(comment)}
                className="text-[#8b949e] hover:text-[#58a6ff] transition-colors"
              >
                💬 回复
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => handleDelete(comment._id)}
                className="text-[#8b949e] hover:text-[#f85149] transition-colors"
              >
                🗑️ 删除
              </button>
            )}
          </div>
        </div>

        {/* 回复列表 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-t border-[#30363d] pt-4 mt-4">
      <h4 className="text-[#f0f6fc] font-medium mb-4">
        💬 评论 ({data?.pagination?.total || 0})
      </h4>

      {/* 评论输入框 */}
      {isAuthenticated ? (
        <div className="mb-4">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-[#8b949e]">
              <span>回复 @{replyTo.name}</span>
              <button
                onClick={cancelReply}
                className="text-[#f85149] hover:underline"
              >
                取消
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? `回复 @${replyTo.name}...` : '写评论...'}
              className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] text-sm placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                submitting || !newComment.trim()
                  ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                  : 'bg-[#238636] text-white hover:bg-[#2ea043]'
              }`}
            >
              {submitting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-center text-sm text-[#8b949e]">
          请先 <a href="/auth" className="text-[#58a6ff] hover:underline">登录</a> 后发表评论
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="text-center text-[#8b949e] py-4">加载中...</div>
      ) : comments.length === 0 ? (
        <div className="text-center text-[#8b949e] py-8">
          暂无评论，来发表第一条评论吧 ✨
        </div>
      ) : (
        <div className="divide-y divide-[#21262d]">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
