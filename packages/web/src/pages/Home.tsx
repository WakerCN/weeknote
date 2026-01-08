/**
 * WeekNote - AI 周报生成器
 * 主页面组件
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRequest } from 'ahooks';
import { useTransitionNavigate } from '../lib/navigation';
import { toast } from 'sonner';
import { FileText, Calendar } from 'lucide-react';
import SyncScrollEditor from '../components/SyncScrollEditor';
import PromptPanel from '../components/PromptPanel';
import VolcengineLogo from '../assets/logos/volcengine.svg';
import DeepSeekLogo from '../assets/logos/deepseek.svg';
import OpenAILogo from '../assets/logos/openai.svg';
import {
  generateReportStream,
  getModels,
  getConfig,
  exportWeek,
  type ModelInfo,
  type Platform,
  type ValidationWarning,
} from '../api';
import { Combobox, type ComboboxOption, type ComboboxTag } from '@/components/ui/combobox';

// 示例 Daily Log
const SAMPLE_DAILY_LOG = `12-15 | 周一
Plan
[ ] ems
  [ ]  峰谷电价图开发
[ ] hb-yuque-desensiter
Result
● ems
  ○ 完成峰谷电价组件封装
● 初步完成 hb-yuque-desensiter 项目
  ○ storage，core，yuque-api,cli,ui 五个包的开发
Issues
md 格式导出语雀无法自动同步分栏组件样式
Notes

12-16 | 周二
Plan
[ ] 国际化组件接入规划
[ ] 【商户】免套餐功能新增审核字段开发
 Result
● 整理文档
● 免套餐功能新增审核字段完成静态开发
● 完成周报工具 weeknote 初版开发
Issues
● 发现同步内外网语雀存在合规性问题
Notes

12-17 | 周三
Plan
[X] 测试优化 weeknote 工具
[ ] 国际化组件封装

Result
● 魔方
  ○ 商品组件定位失败兜底开发
  ○ 调整增加 activitySource
 Issues

 Notes

12-18 | 周四
Plan

 Result
● 输出小哈能源出海方案
  ○ 
Issues

Notes

12-19 | 周五
Plan
[ ] ems 功能梳理
[ ] 商户，免套餐功能对接
Result
● ems 峰谷电价图接口数据 mock 与对接
● 电价 2 期，能源小程序需求评审
Issues
● 小程序下载，图片压缩目 demo
Notes
`;

export default function Home() {
  const navigate = useTransitionNavigate();
  const [dailyLog, setDailyLog] = useState(SAMPLE_DAILY_LOG);
  const [report, setReport] = useState('');
  const [modelInfo, setModelInfo] = useState<{ id: string; name: string } | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检查是否有从每日记录页导入的数据
  useEffect(() => {
    const state = (window.history.state as { dailyLog?: string }) || {};
    if (state.dailyLog) {
      setDailyLog(state.dailyLog);
      // 清除state，避免刷新时重复导入
      window.history.replaceState({}, '');
    }
  }, []);

  // 导入本周记录
  const handleImportWeek = async () => {
    try {
      const { text } = await exportWeek();
      if (!text) {
        toast.warning('本周暂无记录');
        return;
      }
      if (dailyLog.trim() && !confirm('当前输入框有内容，是否覆盖？')) {
        return;
      }
      setDailyLog(text);
      toast.success('已导入本周记录');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败');
    }
  };

  // 加载模型列表
  const { data: modelsData } = useRequest(getModels);

  // 加载配置并设置默认模型
  const { data: configData } = useRequest(getConfig, {
    onSuccess: (data) => {
      if (data.defaultModel && !selectedModelId) {
        setSelectedModelId(data.defaultModel);
      }
    },
  });

  // 获取模型的平台
  const getPlatform = (modelId: string): Platform => {
    if (modelId.startsWith('siliconflow/')) return 'siliconflow';
    if (modelId.startsWith('deepseek/')) return 'deepseek';
    if (modelId.startsWith('doubao/')) return 'doubao';
    return 'openai';
  };

  // 平台 Logo 图标组件 - 使用本地 SVG 文件（正方形）
  const PlatformLogo = ({ platform }: { platform: Platform }) => {
    const logos: Record<Platform, React.ReactNode> = {
      // 火山方舟（豆包）
      doubao: <img src={VolcengineLogo} alt="火山方舟" className="w-4 h-4" />,
      // DeepSeek
      deepseek: <img src={DeepSeekLogo} alt="DeepSeek" className="w-4 h-4" />,
      // OpenAI
      openai: <img src={OpenAILogo} alt="OpenAI" className="w-4 h-4" />,
      // 硅基流动
      siliconflow: (
        <img 
          src="https://cloud.siliconflow.cn/favicon.ico" 
          alt="硅基流动" 
          className="w-4 h-4"
        />
      ),
    };
    return <>{logos[platform]}</>;
  };

  // 获取平台分组信息
  const getPlatformGroup = (platform: Platform): { key: string; label: React.ReactNode } => {
    const names: Record<Platform, string> = {
      doubao: '火山方舟（豆包）',
      deepseek: 'DeepSeek',
      openai: 'OpenAI',
      siliconflow: '硅基流动（免费）',
    };
    return {
      key: platform,
      label: (
        <span className="flex items-center gap-1.5">
          <PlatformLogo platform={platform} />
          <span>{names[platform]}</span>
        </span>
      ),
    };
  };

  // 将模型列表转换为 Combobox 选项格式
  const modelOptions: ComboboxOption[] = useMemo(() => {
    const models = modelsData?.models || [];
    const apiKeys = configData?.apiKeys || { siliconflow: null, deepseek: null, openai: null, doubao: null };
    const doubaoEndpoint = configData?.doubaoEndpoint;
    const defaultModel = configData?.defaultModel;

    return models.map((model: ModelInfo) => {
      const platform = getPlatform(model.id);
      // 豆包需要同时有 API Key 和接入点
      const isConfigured = platform === 'doubao' 
        ? !!apiKeys[platform] && !!doubaoEndpoint
        : !!apiKeys[platform];
      const isDefault = model.id === defaultModel;

      // 构建标签
      const tags: ComboboxTag[] = [];

      // 默认模型标签
      if (isDefault) {
        tags.push({ text: '默认', variant: 'info' });
      }

      // 可用性标签
      if (isConfigured) {
        tags.push({ text: '可用', variant: 'success' });
      } else {
        tags.push({ text: '需配置', variant: 'warning' });
      }

      const groupInfo = getPlatformGroup(platform);
      return {
        value: model.id,
        label: model.name,
        icon: <PlatformLogo platform={platform} />,
        tags,
        groupKey: groupInfo.key,
        groupLabel: groupInfo.label,
      };
    });
  }, [modelsData?.models, configData?.apiKeys, configData?.defaultModel]);

  /**
   * 显示格式警告的友好提示
   */
  const showFormatWarnings = (warnings: ValidationWarning[]) => {
    const hasNoDate = warnings.some((w) => w.type === 'no_date_line');
    const hasNoSections = warnings.some((w) => w.type === 'no_sections');

    let description = '';

    if (hasNoDate && hasNoSections) {
      description = '添加日期行（如 12-23 | 周一）和段落结构（Plan/Result/Issues/Notes）可获得更好的生成效果';
    } else if (hasNoDate) {
      description = '添加日期行（如 12-23 | 周一）可让 AI 更好地按天整理工作';
    } else if (hasNoSections) {
      description = '使用 Plan/Result/Issues/Notes 段落结构可让周报更有条理';
    }

    if (description) {
      toast.warning('💡 格式提示', {
        description,
        duration: 6000,
      });
    }
  };

  // 使用 useRequest 管理生成状态
  const {
    loading: isGenerating,
    run: handleGenerate,
    cancel: handleCancel,
  } = useRequest(
    async () => {
      if (!dailyLog.trim()) {
        throw new Error('请输入 Daily Log 内容');
      }

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setReport('');
      setModelInfo(null);

      const result = await generateReportStream(
        dailyLog,
        (chunk) => setReport((prev) => prev + chunk),
        abortControllerRef.current.signal,
        selectedModelId || undefined
      );

      setModelInfo(result.model);
      abortControllerRef.current = null;

      // 显示格式警告（如果有）
      if (result.warnings?.length) {
        showFormatWarnings(result.warnings);
      }

      return result;
    },
    {
      manual: true,
      onError: (err) => {
        // AbortError 不显示错误
        if (err.name === 'AbortError') return;
        toast.error(err.message || '生成失败');
      },
    }
  );

  // 复制周报
  const handleCopy = async () => {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  // 取消生成
  const onCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    handleCancel();
  };

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
            onClick={() => navigate('/daily', { scope: 'root' })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            title="每日记录"
          >
            <Calendar className="w-4 h-4" />
            每日记录
          </button>
          <button
            onClick={() => navigate('/settings', { scope: 'root' })}
            className="p-2 rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
            title="设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          headerRight={
            <button
              onClick={handleImportWeek}
              className="px-3 py-1 rounded text-xs font-medium bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors"
              title="从每日记录导入本周日志"
            >
              📥 导入本周
            </button>
          }
        />

        {/* 生成按钮区 */}
        <div className="flex items-center justify-center gap-4 py-2">
          {/* 模型选择器 - 带付费标签 */}
          <div className="flex items-center gap-2">
            <Combobox
              options={modelOptions}
              value={selectedModelId}
              onValueChange={setSelectedModelId}
              placeholder={modelOptions.length === 0 ? '加载中...' : '选择模型'}
              searchPlaceholder="搜索模型..."
              emptyText="未找到模型"
              disabled={isGenerating}
              className="w-[280px]"
            />
            {/* 付费状态标签 */}
            {selectedModelId && (
              <span
                className={`px-3 py-2.5 rounded-lg text-sm font-medium ${
                  modelsData?.models?.find((m: ModelInfo) => m.id === selectedModelId)?.isFree
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {modelsData?.models?.find((m: ModelInfo) => m.id === selectedModelId)?.isFree
                  ? '免费'
                  : '付费'}
              </span>
            )}
          </div>

          {/* 查看 Prompt 按钮 */}
          <button
            onClick={() => setShowPromptPanel(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-all duration-200 border border-[#30363d]"
            title="查看完整 Prompt"
          >
            <FileText className="w-4 h-4" />
            查看 Prompt
          </button>

          {/* 生成/取消按钮 */}
          {isGenerating ? (
            <button
              onClick={onCancel}
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
                    : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                }
              `}
            >
              📋 复制
            </button>
          }
        />
      </main>

      {/* Prompt 预览侧边面板 */}
      <PromptPanel open={showPromptPanel} onClose={() => setShowPromptPanel(false)} dailyLog={dailyLog} />
    </div>
  );
}
