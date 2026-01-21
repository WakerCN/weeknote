/**
 * 模型与 API Key 设置页面
 */

import { useState } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import { getModels, getConfig, saveConfig, deleteApiKey, type ModelInfo, type Platform, type AppConfig } from '../../api';
import VolcengineLogo from '../../assets/logos/volcengine.svg';
import DeepSeekLogo from '../../assets/logos/deepseek.svg';
import OpenAILogo from '../../assets/logos/openai.svg';

// 平台 Logo 组件
const PlatformLogo = ({ platform, className = 'w-5 h-5' }: { platform: Platform; className?: string }) => {
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

// 平台信息
const PLATFORMS: Array<{ key: Platform; name: string; url: string }> = [
  { key: 'siliconflow', name: '硅基流动', url: 'https://cloud.siliconflow.cn/' },
  { key: 'deepseek', name: 'DeepSeek', url: 'https://platform.deepseek.com/' },
  { key: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/' },
  { key: 'doubao', name: '火山方舟（豆包）', url: 'https://console.volcengine.com/ark' },
];

// 脱敏 API Key（显示前4位和后4位）
function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// 兼容后端不同返回形态的 config（以及字段缺失）兜底
function normalizeConfig(data: any): AppConfig {
  const cfg = data?.config ?? data;
  return {
    defaultModel: cfg?.defaultModel ?? null,
    apiKeys: (cfg?.apiKeys ?? {
      siliconflow: null,
      deepseek: null,
      openai: null,
      doubao: null,
    }) as AppConfig['apiKeys'],
    doubaoEndpoint: cfg?.doubaoEndpoint ?? null,
  };
}

// API Key 卡片组件
function ApiKeyCard({
  platform,
  name,
  url,
  apiKey,
  endpointId,
  onSave,
  onDelete,
  onSaveEndpoint,
}: {
  platform: Platform;
  name: string;
  url: string;
  apiKey: string | null;
  endpointId?: string | null;
  onSave: (key: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onSaveEndpoint?: (endpoint: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 豆包接入点相关状态
  const [isEditingEndpoint, setIsEditingEndpoint] = useState(false);
  const [endpointInputValue, setEndpointInputValue] = useState('');
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);

  const isConfigured = !!apiKey;
  const needsEndpoint = platform === 'doubao';
  const hasEndpoint = !!endpointId;

  const handleSave = async () => {
    if (!inputValue.trim()) {
      toast.error('请输入 API Key');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(inputValue.trim());
      setInputValue('');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  // 保存接入点
  const handleSaveEndpoint = async () => {
    if (!endpointInputValue.trim()) {
      toast.error('请输入接入点 ID');
      return;
    }
    if (!onSaveEndpoint) return;
    
    setIsSavingEndpoint(true);
    try {
      await onSaveEndpoint(endpointInputValue.trim());
      setEndpointInputValue('');
      setIsEditingEndpoint(false);
    } finally {
      setIsSavingEndpoint(false);
    }
  };

  const handleCancelEndpoint = () => {
    setIsEditingEndpoint(false);
    setEndpointInputValue('');
  };

  return (
    <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlatformLogo platform={platform} />
          <span className="font-medium text-[#f0f6fc]">{name}</span>
          {isConfigured && !isEditing ? (
            <span className="text-xs text-emerald-400">✓ 已配置</span>
          ) : (
            <span className="text-xs text-[#8b949e]">未配置</span>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#58a6ff] hover:underline"
        >
          获取 API Key →
        </a>
      </div>

      {/* 固定高度的内容区域 */}
      <div className="h-10">
        {isConfigured && !isEditing ? (
          // 已配置状态：显示脱敏/完整 Key + 操作按钮
          <div className="flex items-center gap-3 h-full">
            <div className="flex-1 px-3 h-full flex items-center bg-[#161b22] border border-[#30363d] rounded-lg font-mono text-sm text-[#8b949e] overflow-x-auto cursor-not-allowed opacity-70 hover:opacity-60 transition-opacity">
              <span className="whitespace-nowrap">{isVisible ? apiKey : maskApiKey(apiKey!)}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* 显示/隐藏按钮 */}
              <button
                onClick={() => setIsVisible(!isVisible)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
                title={isVisible ? '隐藏' : '显示'}
              >
                {isVisible ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              {/* 编辑按钮 */}
              <button
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
                title="编辑"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {/* 删除按钮 */}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors disabled:opacity-50"
                title="删除"
              >
                {isDeleting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ) : (
          // 编辑状态 或 未配置状态：显示输入框
          <div className="flex gap-2 h-full">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  handleSave();
                }
                if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              placeholder="请输入 API Key"
              autoFocus={isEditing}
              className="flex-1 px-3 h-full bg-[#161b22] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !inputValue.trim()}
              className={`
                px-4 h-full rounded-lg font-medium text-sm transition-all duration-200 shrink-0
                ${
                  isSaving || !inputValue.trim()
                    ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                    : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                }
              `}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
            {isEditing && (
              <button
                onClick={handleCancel}
                className="px-4 h-full rounded-lg font-medium text-sm transition-all duration-200 bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d]"
              >
                取消
              </button>
            )}
          </div>
        )}
      </div>

      {/* 豆包接入点配置（仅豆包平台显示） */}
      {needsEndpoint && isConfigured && (
        <div className="mt-4 pt-4 border-t border-[#30363d]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8b949e]">接入点 ID</span>
              {hasEndpoint && !isEditingEndpoint ? (
                <span className="text-xs text-emerald-400">✓ 已配置</span>
              ) : (
                <span className="text-xs text-yellow-400">⚠ 需配置</span>
              )}
            </div>
            <a
              href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#58a6ff] hover:underline"
            >
              创建接入点 →
            </a>
          </div>
          <p className="text-xs text-[#484f58] mb-3">
            需要在火山方舟控制台创建推理接入点，获取 ep-xxxxx 格式的 ID
          </p>
          
          <div className="h-10">
            {hasEndpoint && !isEditingEndpoint ? (
              // 已配置接入点
              <div className="flex items-center gap-3 h-full">
                <div className="flex-1 px-3 h-full flex items-center bg-[#161b22] border border-[#30363d] rounded-lg font-mono text-sm text-[#8b949e]">
                  <span className="whitespace-nowrap">{endpointId}</span>
                </div>
                <button
                  onClick={() => setIsEditingEndpoint(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors"
                  title="编辑"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            ) : (
              // 编辑接入点
              <div className="flex gap-2 h-full">
                <input
                  type="text"
                  value={endpointInputValue}
                  onChange={(e) => setEndpointInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && endpointInputValue.trim()) {
                      handleSaveEndpoint();
                    }
                    if (e.key === 'Escape') {
                      handleCancelEndpoint();
                    }
                  }}
                  placeholder="ep-xxxxx"
                  autoFocus={isEditingEndpoint}
                  className="flex-1 px-3 h-full bg-[#161b22] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] font-mono"
                />
                <button
                  onClick={handleSaveEndpoint}
                  disabled={isSavingEndpoint || !endpointInputValue.trim()}
                  className={`
                    px-4 h-full rounded-lg font-medium text-sm transition-all duration-200 shrink-0
                    ${
                      isSavingEndpoint || !endpointInputValue.trim()
                        ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                        : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                    }
                  `}
                >
                  {isSavingEndpoint ? '保存中...' : '保存'}
                </button>
                {isEditingEndpoint && (
                  <button
                    onClick={handleCancelEndpoint}
                    className="px-4 h-full rounded-lg font-medium text-sm transition-all duration-200 bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d]"
                  >
                    取消
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiKeyModel() {
  // 正在切换模型
  const [switchingModel, setSwitchingModel] = useState<string | null>(null);

  // 使用 useRequest 加载模型列表
  const { data: modelsData, loading: modelsLoading } = useRequest(getModels);

  // 使用 useRequest 加载配置
  const { data: configData, loading: configLoading, refresh: refreshConfig } = useRequest(getConfig);

  const models = modelsData?.models || [];
  const config: AppConfig = normalizeConfig(configData);
  
  // 只在首次加载（还没有任何数据）时显示全屏 loading
  // 刷新时不显示，避免滚动位置丢失
  const isInitialLoading = (modelsLoading || configLoading) && !modelsData && !configData;

  // 获取模型的平台
  const getPlatform = (modelId: string): Platform => {
    if (modelId.startsWith('siliconflow/')) return 'siliconflow';
    if (modelId.startsWith('deepseek/')) return 'deepseek';
    if (modelId.startsWith('doubao/')) return 'doubao';
    return 'openai';
  };

  // 检查平台是否已配置（豆包需要同时有 API Key 和接入点）
  const isPlatformConfigured = (platform: Platform): boolean => {
    if (platform === 'doubao') {
      return !!config.apiKeys[platform] && !!config.doubaoEndpoint;
    }
    return !!config.apiKeys[platform];
  };

  // 保存 API Key
  const handleSaveApiKey = async (platform: Platform, apiKey: string) => {
    try {
      await saveConfig({ apiKeys: { [platform]: apiKey } });
      await refreshConfig();
      toast.success(`${PLATFORMS.find((p) => p.key === platform)?.name} API Key 保存成功`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
      throw err;
    }
  };

  // 删除 API Key
  const handleDeleteApiKey = async (platform: Platform) => {
    try {
      await deleteApiKey(platform);
      await refreshConfig();
      toast.success(`${PLATFORMS.find((p) => p.key === platform)?.name} API Key 已删除`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
      throw err;
    }
  };

  // 保存豆包接入点
  const handleSaveDoubaoEndpoint = async (endpointId: string) => {
    try {
      await saveConfig({ doubaoEndpoint: endpointId });
      await refreshConfig();
      toast.success('豆包接入点 ID 保存成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
      throw err;
    }
  };

  // 切换默认模型（即时生效）
  const handleSwitchModel = async (modelId: string) => {
    if (modelId === config.defaultModel) return;

    const modelName = models.find((m: ModelInfo) => m.id === modelId)?.name || modelId;
    setSwitchingModel(modelId);
    try {
      await saveConfig({ defaultModel: modelId });
      await refreshConfig();
      toast.success(`默认模型已切换到: ${modelName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '切换失败');
    } finally {
      setSwitchingModel(null);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6 pb-20">
        <div className="max-w-3xl space-y-6">
          {/* 页面标题 */}
          <div>
            <h2 className="text-xl font-semibold text-[#f0f6fc]">🤖 模型与 API Key</h2>
            <p className="text-sm text-[#8b949e] mt-1">
              配置 AI 服务平台的 API Key 和默认模型
            </p>
          </div>
          {/* API Keys 配置 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">API Keys</h3>
            <p className="text-sm text-[#8b949e] mb-6">
              配置各平台的 API Key 以启用对应的模型。
            </p>

            <div className="space-y-4">
              {PLATFORMS.map(({ key, name, url }) => (
                <ApiKeyCard
                  key={key}
                  platform={key}
                  name={name}
                  url={url}
                  apiKey={config.apiKeys[key]}
                  endpointId={key === 'doubao' ? config.doubaoEndpoint : undefined}
                  onSave={(newKey) => handleSaveApiKey(key, newKey)}
                  onDelete={() => handleDeleteApiKey(key)}
                  onSaveEndpoint={key === 'doubao' ? handleSaveDoubaoEndpoint : undefined}
                />
              ))}
            </div>
          </section>

          {/* 默认模型选择 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">默认模型</h3>
            <p className="text-sm text-[#8b949e] mb-6">
              点击选择生成周报时使用的默认模型，选择后立即生效。
            </p>

            {/* 按平台分组显示模型 */}
            <div className="space-y-6">
              {(['doubao', 'deepseek', 'openai', 'siliconflow'] as Platform[]).map((platformKey) => {
                const platformModels = models.filter((m: ModelInfo) => getPlatform(m.id) === platformKey);
                if (platformModels.length === 0) return null;

                const platformNames: Record<Platform, string> = {
                  doubao: '火山方舟（豆包）',
                  deepseek: 'DeepSeek',
                  openai: 'OpenAI',
                  siliconflow: '硅基流动（免费）',
                };

                return (
                  <div key={platformKey}>
                    <h4 className="text-sm font-medium text-[#8b949e] mb-3 flex items-center gap-2">
                      <PlatformLogo platform={platformKey} className="w-4 h-4" />
                      <span>{platformNames[platformKey]}</span>
                    </h4>
                    <div className="grid gap-3">
                      {platformModels.map((model: ModelInfo) => {
                        const isConfigured = isPlatformConfigured(platformKey);
                        const isSelected = config.defaultModel === model.id;
                        const isSwitching = switchingModel === model.id;

                        return (
                          <button
                            key={model.id}
                            onClick={() => handleSwitchModel(model.id)}
                            disabled={isSwitching || isSelected}
                            className={`
                              w-full p-4 rounded-lg border text-left transition-all duration-200 relative
                              ${
                                isSelected
                                  ? 'bg-blue-500/10 border-blue-500/50'
                                  : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                              }
                              ${isSwitching ? 'opacity-70' : ''}
                            `}
                          >
                            {isSwitching && (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/50 rounded-lg">
                                <span className="text-sm text-[#8b949e]">切换中...</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-[#f0f6fc] flex items-center gap-2">
                                  {model.name}
                                  {model.isFree && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">免费</span>
                                  )}
                                  {isSelected && (
                                    <span className="text-xs text-blue-400">● 当前默认</span>
                                  )}
                                </div>
                                <div className="text-sm text-[#8b949e] mt-1">{model.description}</div>
                                <div className="text-xs text-[#484f58] mt-1">{model.id}</div>
                              </div>
                              <div className="text-right">
                                {isConfigured ? (
                                  <span className="text-xs text-emerald-400">可用</span>
                                ) : platformKey === 'doubao' ? (
                                  <span className="text-xs text-yellow-400">
                                    {!config.apiKeys[platformKey] ? '需配置 Key' : '需配置接入点'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-yellow-400">需配置 Key</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}



