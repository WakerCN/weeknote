/**
 * 历史记录侧边栏组件
 * 展示用户的周报生成历史，支持无限滚动加载、点击加载、删除
 */

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  History,
  Trash2,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import {
  getHistoryList,
  deleteHistory,
  type GenerationHistoryItem,
  type Platform,
} from '../api';
import { useConfirm } from './ui/confirm-dialog';
import VolcengineLogo from '../assets/logos/volcengine.svg';
import DeepSeekLogo from '../assets/logos/deepseek.svg';
import OpenAILogo from '../assets/logos/openai.svg';

/** 正在生成的临时项信息 */
export interface GeneratingItem {
  dateRangeLabel: string;
  modelId: string;
  modelName: string;
}

interface HistorySidebarProps {
  /** 侧边栏是否折叠 */
  collapsed: boolean;
  /** 折叠状态变更 */
  onCollapsedChange: (collapsed: boolean) => void;
  /** 选中某条历史记录 */
  onSelectHistory: (history: GenerationHistoryItem) => void | Promise<void>;
  /** 当前选中的历史 ID */
  selectedId?: string;
  /** 正在生成的临时项（显示在列表顶部） */
  generatingItem?: GeneratingItem | null;
}

/** 暴露给父组件的方法 */
export interface HistorySidebarRef {
  /** 刷新历史列表 */
  refresh: () => void;
}

/** 根据模型 ID 获取平台 */
function getPlatform(modelId: string): Platform {
  if (modelId.startsWith('siliconflow/')) return 'siliconflow';
  if (modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('doubao/')) return 'doubao';
  return 'openai';
}

/** 平台 Logo 图标组件 */
const PlatformLogo = ({ platform, className = 'w-3.5 h-3.5' }: { platform: Platform; className?: string }) => {
  const logos: Record<Platform, React.ReactNode> = {
    doubao: <img src={VolcengineLogo} alt="火山方舟" className={className} />,
    deepseek: <img src={DeepSeekLogo} alt="DeepSeek" className={className} />,
    openai: <img src={OpenAILogo} alt="OpenAI" className={className} />,
    siliconflow: (
      <img 
        src="https://cloud.siliconflow.cn/favicon.ico" 
        alt="硅基流动" 
        className={className}
      />
    ),
  };
  return <>{logos[platform]}</>;
};

/** 格式化相对时间 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay === 1) return '昨天';
  if (diffDay < 7) return `${diffDay}天前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`;
  
  // 超过一个月显示具体日期
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}


export const HistorySidebar = forwardRef<HistorySidebarRef, HistorySidebarProps>(function HistorySidebar(
  {
    collapsed,
    onCollapsedChange,
    onSelectHistory,
    selectedId,
    generatingItem,
  },
  ref
) {
  const [histories, setHistories] = useState<GenerationHistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 确认弹框
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // 加载历史列表
  const { loading, run: loadMore, refresh } = useRequest(
    async (skip = 0) => {
      const res = await getHistoryList(20, skip);
      return res;
    },
    {
      manual: false,
      onSuccess: (data, params) => {
        const skip = params[0] || 0;
        if (skip === 0) {
          setHistories(data.histories);
        } else {
          setHistories((prev) => [...prev, ...data.histories]);
        }
        setHasMore(data.pagination.hasMore);
      },
      onError: (err) => {
        toast.error(err.message || '加载历史失败');
      },
    }
  );

  // 删除历史
  const { loading: deleting, run: handleDelete } = useRequest(
    async (id: string) => {
      await deleteHistory(id);
      return id;
    },
    {
      manual: true,
      onSuccess: (deletedId) => {
        setHistories((prev) => prev.filter((h) => h._id !== deletedId));
        setMenuOpenId(null);
        toast.success('已删除');
      },
      onError: (err) => {
        toast.error(err.message || '删除失败');
      },
    }
  );

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMore(histories.length);
    }
  }, [loading, hasMore, histories.length, loadMore]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 暴露 refresh 方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: () => {
      // 重新加载第一页
      loadMore(0);
    },
  }), [loadMore]);

  // 删除确认处理
  const handleDeleteConfirm = async (id: string) => {
    const confirmed = await confirm({
      title: '删除历史记录',
      description: '确定要删除这条历史记录吗？此操作不可撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (confirmed) {
      handleDelete(id);
    }
    setMenuOpenId(null);
  };

  // 折叠状态
  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 bg-[#161b22] border-r border-[#30363d] flex flex-col items-center py-4">
        <button
          onClick={() => onCollapsedChange(false)}
          className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
          title="展开历史记录"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-4">
          <History className="w-5 h-5 text-[#484f58]" />
        </div>
        {histories.length > 0 && (
          <span className="mt-2 text-xs text-[#484f58]">{histories.length}</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 bg-[#161b22] border-r border-[#30363d] flex flex-col">
      {/* 标题栏 */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#30363d]">
        <div className="flex items-center gap-2 text-[#f0f6fc]">
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">生成历史</span>
          {histories.length > 0 && (
            <span className="text-xs text-[#8b949e]">({histories.length})</span>
          )}
        </div>
        <button
          onClick={() => onCollapsedChange(true)}
          className="p-1.5 rounded text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
          title="收起侧边栏"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 历史列表 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {/* 正在生成的临时项 */}
        {generatingItem && (
          <div className="relative p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 animate-pulse">
            {/* 日期范围 */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-[#f0f6fc]">
              <span>📅</span>
              <span>{generatingItem.dateRangeLabel}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                生成中
              </span>
            </div>

            {/* 模型信息 */}
            <div className="mt-1 text-xs text-[#8b949e] truncate flex items-center gap-1">
              <PlatformLogo platform={getPlatform(generatingItem.modelId)} />
              <span>{generatingItem.modelName}</span>
            </div>

            {/* 时间 */}
            <div className="mt-2">
              <span className="text-xs text-[#484f58]">
                🕐 刚刚
              </span>
            </div>
          </div>
        )}

        {histories.length === 0 && !loading && !generatingItem ? (
          <div className="text-center py-8 text-[#484f58]">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无生成记录</p>
            <p className="text-xs mt-1">生成周报后会在这里显示</p>
          </div>
        ) : (
          histories.map((history) => (
            <div
              key={history._id}
              onClick={() => onSelectHistory(history)}
              className={`
                relative group p-3 rounded-lg cursor-pointer transition-all duration-200
                ${selectedId === history._id
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-[#21262d] border border-transparent hover:bg-[#30363d] hover:border-[#484f58]'
                }
              `}
            >
              {/* 日期范围 */}
              <div className="flex items-center gap-1.5 text-sm font-medium text-[#f0f6fc]">
                <span>📅</span>
                <span>{history.dateRangeLabel}</span>
                {/* 导入标识 */}
                {history.dateStart && history.dateEnd && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
                    导入
                  </span>
                )}
                {/* 手动输入标识 */}
                {!history.dateStart && !history.dateEnd && history.dateRangeLabel === '手动输入' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">
                    手动
                  </span>
                )}
              </div>

              {/* 模型信息 */}
              <div className="mt-1 text-xs text-[#8b949e] truncate flex items-center gap-1">
                <PlatformLogo platform={getPlatform(history.modelId)} />
                <span>{history.modelName}</span>
              </div>

              {/* 时间 + 菜单 */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-[#484f58]">
                  🕐 {formatRelativeTime(history.completedAt)}
                </span>
                
                {/* 更多菜单 */}
                <div className="relative" ref={menuOpenId === history._id ? menuRef : null}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === history._id ? null : history._id);
                    }}
                    className={`
                      p-1 rounded transition-opacity
                      ${menuOpenId === history._id
                        ? 'opacity-100 bg-[#30363d]'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-[#30363d]'
                      }
                      text-[#8b949e] hover:text-[#f0f6fc]
                    `}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* 下拉菜单 */}
                  {menuOpenId === history._id && (
                    <div 
                      className="absolute right-0 top-full mt-1 z-10 bg-[#21262d] border border-[#30363d] rounded-lg shadow-lg py-1 min-w-[100px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          handleDeleteConfirm(history._id);
                        }}
                        disabled={deleting}
                        className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[#30363d] flex items-center gap-2"
                      >
                        {deleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#8b949e] animate-spin" />
          </div>
        )}

        {/* 没有更多 */}
        {!loading && !hasMore && histories.length > 0 && (
          <div className="text-center py-3 text-xs text-[#484f58]">
            没有更多了
          </div>
        )}
      </div>
      
      {/* 确认弹框 */}
      <ConfirmDialogComponent />
    </div>
  );
});

export default HistorySidebar;
