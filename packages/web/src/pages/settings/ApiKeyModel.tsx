/**
 * 模型与 API Key 设置页面
 */

import { useState } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import { getModels, getConfig, saveConfig, type ModelInfo, type Platform, type AppConfig } from '../../api';

// 平台信息
const PLATFORMS: Array<{ key: Platform; name: string; url: string }> = [
  { key: 'siliconflow', name: '硅基流动', url: 'https://cloud.siliconflow.cn/' },
  { key: 'deepseek', name: 'DeepSeek', url: 'https://platform.deepseek.com/' },
  { key: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/' },
];

export default function ApiKeyModel() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // 编辑中的 API Keys
  const [editingKeys, setEditingKeys] = useState<Record<Platform, string>>({
    siliconflow: '',
    deepseek: '',
    openai: '',
  });

  // 使用 useRequest 加载模型列表
  const { data: modelsData, loading: modelsLoading } = useRequest(getModels);

  // 使用 useRequest 加载配置
  const { data: configData, loading: configLoading, refresh: refreshConfig } = useRequest(getConfig, {
    onSuccess: (data) => {
      setSelectedModel(data.defaultModel);
    },
  });

  // 使用 useRequest 保存配置
  const { loading: saving, run: handleSave } = useRequest(
    async () => {
      const result = await saveConfig({
        defaultModel: selectedModel || undefined,
        apiKeys: {
          siliconflow: editingKeys.siliconflow || undefined,
          deepseek: editingKeys.deepseek || undefined,
          openai: editingKeys.openai || undefined,
        },
      });

      // 清空输入框并刷新配置
      setEditingKeys({ siliconflow: '', deepseek: '', openai: '' });
      await refreshConfig();

      return result;
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('保存成功！');
      },
      onError: (err) => {
        toast.error(err.message || '保存失败');
      },
    }
  );

  const models = modelsData?.models || [];
  const config: AppConfig = configData || { defaultModel: null, apiKeys: { siliconflow: false, deepseek: false, openai: false } };
  const loading = modelsLoading || configLoading;

  // 获取模型的平台
  const getPlatform = (modelId: string): Platform => {
    if (modelId.startsWith('siliconflow/')) return 'siliconflow';
    if (modelId.startsWith('deepseek/')) return 'deepseek';
    return 'openai';
  };

  // 检查平台是否已配置
  const isPlatformConfigured = (platform: Platform): boolean => {
    return !!config.apiKeys[platform];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">模型与 API Key</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
            ${
              saving
                ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                : 'bg-[#238636] text-white hover:bg-[#2ea043]'
            }
          `}
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl space-y-8">
          {/* API Keys 配置 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">API Keys</h3>
            <p className="text-sm text-[#8b949e] mb-6">
              配置各平台的 API Key 以启用对应的模型。留空表示不修改已保存的 Key。
            </p>

            <div className="space-y-4">
              {PLATFORMS.map(({ key, name, url }) => (
                <div
                  key={key}
                  className="flex items-center gap-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
                >
                  <div className="w-28 shrink-0">
                    <div className="font-medium text-[#f0f6fc]">{name}</div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#58a6ff] hover:underline"
                    >
                      获取 API Key →
                    </a>
                  </div>
                  <div className="flex-1">
                    <input
                      type="password"
                      value={editingKeys[key]}
                      onChange={(e) =>
                        setEditingKeys((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={
                        isPlatformConfigured(key) ? '已配置 (留空保持不变)' : '请输入 API Key'
                      }
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                  <div className="w-20 text-right shrink-0">
                    {isPlatformConfigured(key) ? (
                      <span className="text-xs text-emerald-400">✓ 已配置</span>
                    ) : (
                      <span className="text-xs text-[#484f58]">未配置</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 默认模型选择 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">默认模型</h3>
            <p className="text-sm text-[#8b949e] mb-6">
              选择生成周报时使用的默认模型。免费模型无需付费，收费模型按使用量计费。
            </p>

            {/* 免费模型 */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-emerald-400 mb-3">免费模型</h4>
              <div className="grid gap-3">
                {models
                  .filter((m: ModelInfo) => m.isFree)
                  .map((model: ModelInfo) => {
                    const platform = getPlatform(model.id);
                    const isConfigured = isPlatformConfigured(platform);
                    const isSelected = selectedModel === model.id;

                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`
                          w-full p-4 rounded-lg border text-left transition-all duration-200
                          ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/50'
                              : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-[#f0f6fc]">
                              {model.name}
                              {isSelected && (
                                <span className="ml-2 text-xs text-emerald-400">✓ 当前默认</span>
                              )}
                            </div>
                            <div className="text-sm text-[#8b949e] mt-1">{model.description}</div>
                            <div className="text-xs text-[#484f58] mt-1">{model.id}</div>
                          </div>
                          <div className="text-right">
                            {isConfigured ? (
                              <span className="text-xs text-emerald-400">可用</span>
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

            {/* 收费模型 */}
            <div>
              <h4 className="text-sm font-medium text-yellow-400 mb-3">收费模型</h4>
              <div className="grid gap-3">
                {models
                  .filter((m: ModelInfo) => !m.isFree)
                  .map((model: ModelInfo) => {
                    const platform = getPlatform(model.id);
                    const isConfigured = isPlatformConfigured(platform);
                    const isSelected = selectedModel === model.id;

                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`
                          w-full p-4 rounded-lg border text-left transition-all duration-200
                          ${
                            isSelected
                              ? 'bg-yellow-500/10 border-yellow-500/50'
                              : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-[#f0f6fc]">
                              {model.name}
                              {isSelected && (
                                <span className="ml-2 text-xs text-yellow-400">✓ 当前默认</span>
                              )}
                            </div>
                            <div className="text-sm text-[#8b949e] mt-1">{model.description}</div>
                            <div className="text-xs text-[#484f58] mt-1">{model.id}</div>
                          </div>
                          <div className="text-right">
                            {isConfigured ? (
                              <span className="text-xs text-emerald-400">可用</span>
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
          </section>
        </div>
      </main>
    </div>
  );
}
