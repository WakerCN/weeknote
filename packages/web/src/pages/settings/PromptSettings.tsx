/**
 * Prompt 模板管理页面
 */

import { useState, useEffect } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  activatePrompt,
} from '../../api';

export default function PromptSettings() {
  // 当前选中的模板 ID
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 编辑中的内容
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingSystemPrompt, setEditingSystemPrompt] = useState('');
  const [editingUserPromptTemplate, setEditingUserPromptTemplate] = useState('');

  // 是否正在创建新模板
  const [isCreating, setIsCreating] = useState(false);

  // 加载模板列表
  const {
    data: promptsData,
    loading,
    refresh,
  } = useRequest(getPrompts, {
    onSuccess: (data) => {
      // 默认选中激活的模板
      if (!selectedId && data.templates.length > 0) {
        setSelectedId(data.activeTemplateId);
      }
    },
  });

  const templates = promptsData?.templates || [];
  const activeTemplateId = promptsData?.activeTemplateId;
  const defaults = promptsData?.defaults;

  // 当选中模板变化时，更新编辑内容
  useEffect(() => {
    if (isCreating) {
      // 创建新模板时使用默认值
      setEditingName('');
      setEditingDescription('');
      setEditingSystemPrompt(defaults?.systemPrompt || '');
      setEditingUserPromptTemplate(defaults?.userPromptTemplate || '');
    } else if (selectedId) {
      const template = templates.find((t) => t.id === selectedId);
      if (template) {
        setEditingName(template.name);
        setEditingDescription(template.description || '');
        setEditingSystemPrompt(template.systemPrompt);
        setEditingUserPromptTemplate(template.userPromptTemplate);
      }
    }
  }, [selectedId, isCreating, templates, defaults]);

  // 保存模板
  const { loading: saving, run: handleSave } = useRequest(
    async () => {
      // 验证
      if (!editingName.trim()) {
        throw new Error('模板名称不能为空');
      }
      if (!editingSystemPrompt.trim()) {
        throw new Error('系统提示词不能为空');
      }
      if (!editingUserPromptTemplate.includes('{{dailyLog}}')) {
        throw new Error('用户提示词模板必须包含 {{dailyLog}} 占位符');
      }

      if (isCreating) {
        // 创建新模板
        await createPrompt({
          name: editingName.trim(),
          description: editingDescription.trim() || undefined,
          systemPrompt: editingSystemPrompt,
          userPromptTemplate: editingUserPromptTemplate,
        });
        setIsCreating(false);
      } else if (selectedId) {
        // 更新现有模板
        await updatePrompt(selectedId, {
          name: editingName.trim(),
          description: editingDescription.trim() || undefined,
          systemPrompt: editingSystemPrompt,
          userPromptTemplate: editingUserPromptTemplate,
        });
      }

      await refresh();
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(isCreating ? '模板创建成功！' : '保存成功！');
      },
      onError: (err) => {
        toast.error(err.message || '保存失败');
      },
    }
  );

  // 删除模板
  const { loading: deleting, run: handleDelete } = useRequest(
    async () => {
      if (!selectedId) return;

      if (templates.length <= 1) {
        throw new Error('至少需要保留一个模板');
      }

      await deletePrompt(selectedId);
      setSelectedId(null);
      await refresh();
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('模板已删除');
      },
      onError: (err) => {
        toast.error(err.message || '删除失败');
      },
    }
  );

  // 激活模板
  const { loading: activating, run: handleActivate } = useRequest(
    async () => {
      if (!selectedId) return;
      await activatePrompt(selectedId);
      await refresh();
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('模板已激活');
      },
      onError: (err) => {
        toast.error(err.message || '激活失败');
      },
    }
  );

  // 重置为默认值
  const handleResetToDefault = () => {
    if (defaults) {
      setEditingSystemPrompt(defaults.systemPrompt);
      setEditingUserPromptTemplate(defaults.userPromptTemplate);
      toast.info('已重置为默认值（需保存生效）');
    }
  };

  // 开始创建新模板
  const handleStartCreate = () => {
    setIsCreating(true);
    setSelectedId(null);
  };

  // 取消创建
  const handleCancelCreate = () => {
    setIsCreating(false);
    if (templates.length > 0) {
      setSelectedId(activeTemplateId || templates[0].id);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === selectedId);
  const isActive = selectedId === activeTemplateId;
  const hasChanges =
    isCreating ||
    (selectedTemplate &&
      (editingName !== selectedTemplate.name ||
        editingDescription !== (selectedTemplate.description || '') ||
        editingSystemPrompt !== selectedTemplate.systemPrompt ||
        editingUserPromptTemplate !== selectedTemplate.userPromptTemplate));

  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">Prompt 模板</h2>
        <div className="flex items-center gap-3">
          {!isCreating && selectedId && !isActive && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] border border-[#30363d]"
            >
              {activating ? '激活中...' : '设为默认'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (!isCreating && !hasChanges)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
              ${
                saving || (!isCreating && !hasChanges)
                  ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                  : 'bg-[#238636] text-white hover:bg-[#2ea043]'
              }
            `}
          >
            {saving ? '保存中...' : isCreating ? '创建模板' : '保存修改'}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：模板列表 */}
        <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#30363d]">
            <button
              onClick={handleStartCreate}
              disabled={isCreating}
              className={`
                w-full px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${
                  isCreating
                    ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                    : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                }
              `}
            >
              + 新建模板
            </button>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {isCreating && (
              <div className="p-3 rounded-lg border-2 border-dashed border-[#58a6ff] bg-[#58a6ff]/10">
                <div className="font-medium text-[#58a6ff] text-sm">新建模板</div>
                <div className="text-xs text-[#8b949e] mt-1">填写右侧表单并保存</div>
                <button
                  onClick={handleCancelCreate}
                  className="mt-2 text-xs text-[#f85149] hover:underline"
                >
                  取消创建
                </button>
              </div>
            )}

            {templates.map((template) => {
              const isSelected = !isCreating && selectedId === template.id;
              const isTemplateActive = template.id === activeTemplateId;

              return (
                <button
                  key={template.id}
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedId(template.id);
                  }}
                  className={`
                    w-full p-3 rounded-lg border text-left transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-[#0d1117] border-[#58a6ff]'
                        : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[#f0f6fc] text-sm truncate">{template.name}</div>
                    {isTemplateActive && (
                      <span className="text-xs text-emerald-400 shrink-0 ml-2">● 默认</span>
                    )}
                  </div>
                  {template.description && (
                    <div className="text-xs text-[#8b949e] mt-1 truncate">{template.description}</div>
                  )}
                  <div className="text-xs text-[#484f58] mt-1">
                    更新于 {new Date(template.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右侧：编辑区域 */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl space-y-6">
            {/* 基本信息 */}
            <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
              <h3 className="text-base font-semibold text-[#f0f6fc] mb-4">基本信息</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#8b949e] mb-2">
                    模板名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="例如：简洁版、详细版"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b949e] mb-2">描述（可选）</label>
                  <input
                    type="text"
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    placeholder="简要描述这个模板的特点"
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>
              </div>
            </section>

            {/* 系统提示词 */}
            <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[#f0f6fc]">系统提示词 (System Prompt)</h3>
                <button
                  onClick={handleResetToDefault}
                  className="text-xs text-[#58a6ff] hover:underline"
                >
                  重置为默认
                </button>
              </div>
              <p className="text-sm text-[#8b949e] mb-4">
                定义 AI 的角色和行为规则，包括输出格式要求。
              </p>
              <textarea
                value={editingSystemPrompt}
                onChange={(e) => setEditingSystemPrompt(e.target.value)}
                rows={14}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] font-mono text-sm resize-y"
                placeholder="输入系统提示词..."
              />
            </section>

            {/* 用户提示词模板 */}
            <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
              <h3 className="text-base font-semibold text-[#f0f6fc] mb-4">
                用户提示词模板 (User Prompt Template)
              </h3>
              <p className="text-sm text-[#8b949e] mb-2">
                用户输入的提示词模板。使用{' '}
                <code className="px-1.5 py-0.5 bg-[#0d1117] rounded text-[#58a6ff]">{'{{dailyLog}}'}</code>{' '}
                作为日志内容的占位符。
              </p>
              <div className="text-xs text-yellow-400 mb-4">
                注意：模板中必须包含 {'{{dailyLog}}'} 占位符，运行时会被实际的日志内容替换。
              </div>
              <textarea
                value={editingUserPromptTemplate}
                onChange={(e) => setEditingUserPromptTemplate(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] font-mono text-sm resize-y"
                placeholder="输入用户提示词模板..."
              />
            </section>

            {/* 危险操作 */}
            {!isCreating && selectedId && (
              <section className="bg-[#161b22] rounded-lg border border-[#f85149]/30 p-6">
                <h3 className="text-base font-semibold text-[#f85149] mb-4">危险操作</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[#f0f6fc]">删除此模板</div>
                    <div className="text-xs text-[#8b949e] mt-1">
                      删除后无法恢复，请谨慎操作。
                      {templates.length <= 1 && ' （至少需要保留一个模板）'}
                    </div>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || templates.length <= 1}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                      ${
                        deleting || templates.length <= 1
                          ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                          : 'bg-[#f85149] text-white hover:bg-[#da3633]'
                      }
                    `}
                  >
                    {deleting ? '删除中...' : '删除模板'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}



