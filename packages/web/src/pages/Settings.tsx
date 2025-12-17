/**
 * 设置页面 - 模型管理
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 模型信息类型
interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isFree: boolean;
}

// 平台类型
type Platform = 'siliconflow' | 'deepseek' | 'openai';

// 配置类型
interface Config {
  defaultModel: string | null;
  apiKeys: {
    siliconflow: string | null;
    deepseek: string | null;
    openai: string | null;
  };
}

// 平台信息
const PLATFORMS: Array<{ key: Platform; name: string; url: string }> = [
  { key: 'siliconflow', name: '硅基流动', url: 'https://cloud.siliconflow.cn/' },
  { key: 'deepseek', name: 'DeepSeek', url: 'https://platform.deepseek.com/' },
  { key: 'openai', name: 'OpenAI', url: 'https://platform.openai.com/' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [config, setConfig] = useState<Config>({
    defaultModel: null,
    apiKeys: { siliconflow: null, deepseek: null, openai: null },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 编辑中的 API Keys
  const [editingKeys, setEditingKeys] = useState<Record<Platform, string>>({
    siliconflow: '',
    deepseek: '',
    openai: '',
  });

  // 加载模型列表和配置
  useEffect(() => {
    Promise.all([
      fetch('/api/models').then((r) => r.json()),
      fetch('/api/config').then((r) => r.json()),
    ])
      .then(([modelsData, configData]) => {
        setModels(modelsData.models || []);
        setConfig({
          defaultModel: configData.defaultModel || null,
          apiKeys: configData.apiKeys || { siliconflow: null, deepseek: null, openai: null },
        });
        // 设置编辑中的 keys（已配置的显示为占位符）
        setEditingKeys({
          siliconflow: '',
          deepseek: '',
          openai: '',
        });
      })
      .catch((err) => {
        console.error('加载配置失败:', err);
        setMessage({ type: 'error', text: '加载配置失败' });
      })
      .finally(() => setLoading(false));
  }, []);

  // 保存配置
  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultModel: config.defaultModel,
          apiKeys: {
            siliconflow: editingKeys.siliconflow || undefined,
            deepseek: editingKeys.deepseek || undefined,
            openai: editingKeys.openai || undefined,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存失败');
      }

      setMessage({ type: 'success', text: '保存成功！' });

      // 清空输入框
      setEditingKeys({ siliconflow: '', deepseek: '', openai: '' });

      // 重新加载配置
      const configData = await fetch('/api/config').then((r) => r.json());
      setConfig({
        defaultModel: configData.defaultModel || null,
        apiKeys: configData.apiKeys || { siliconflow: null, deepseek: null, openai: null },
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '保存失败',
      });
    } finally {
      setSaving(false);
    }
  }, [config.defaultModel, editingKeys]);

  // 选择默认模型
  const handleSelectModel = useCallback((modelId: string) => {
    setConfig((prev) => ({ ...prev, defaultModel: modelId }));
  }, []);

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
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0d1117]">
      {/* 顶部导航栏 */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
          >
            ← 返回
          </button>
          <h1 className="text-lg font-semibold text-[#f0f6fc]">设置</h1>
        </div>
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
          {saving ? '保存中...' : '💾 保存配置'}
        </button>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 消息提示 */}
          {message && (
            <div
              className={`
                px-4 py-3 rounded-lg text-sm
                ${
                  message.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }
              `}
            >
              {message.type === 'success' ? '✓' : '✗'} {message.text}
            </div>
          )}

          {/* API Keys 配置 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h2 className="text-lg font-semibold text-[#f0f6fc] mb-4">🔑 API Keys</h2>
            <p className="text-sm text-[#8b949e] mb-6">
              配置各平台的 API Key 以启用对应的模型。留空表示不修改已保存的 Key。
            </p>

            <div className="space-y-4">
              {PLATFORMS.map(({ key, name, url }) => (
                <div
                  key={key}
                  className="flex items-center gap-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
                >
                  <div className="w-32">
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
                  <div className="w-20 text-right">
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
            <h2 className="text-lg font-semibold text-[#f0f6fc] mb-4">🤖 默认模型</h2>
            <p className="text-sm text-[#8b949e] mb-6">
              选择生成周报时使用的默认模型。免费模型无需付费，收费模型按使用量计费。
            </p>

            {/* 免费模型 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-emerald-400 mb-3">🆓 免费模型</h3>
              <div className="grid gap-3">
                {models
                  .filter((m) => m.isFree)
                  .map((model) => {
                    const platform = getPlatform(model.id);
                    const isConfigured = isPlatformConfigured(platform);
                    const isSelected = config.defaultModel === model.id;

                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSelectModel(model.id)}
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
              <h3 className="text-sm font-medium text-yellow-400 mb-3">💰 收费模型</h3>
              <div className="grid gap-3">
                {models
                  .filter((m) => !m.isFree)
                  .map((model) => {
                    const platform = getPlatform(model.id);
                    const isConfigured = isPlatformConfigured(platform);
                    const isSelected = config.defaultModel === model.id;

                    return (
                      <button
                        key={model.id}
                        onClick={() => handleSelectModel(model.id)}
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

