/**
 * Prompt 模板管理页面
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  activatePrompt,
  type PromptTemplate,
} from '../../api';
import { SettingsCard, SettingsCardHeader, SettingsFooter, Loading } from '../../components/ui';
import { hasFormChanges } from '../../lib/form-utils';

// 表单快照类型
interface FormSnapshot {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
}

export default function PromptSettings() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingSystemPrompt, setEditingSystemPrompt] = useState('');
  const [editingUserPromptTemplate, setEditingUserPromptTemplate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const originalSnapshot = useRef<FormSnapshot | null>(null);

  // 加载模板列表
  const { data: promptsData, loading, refresh } = useRequest(getPrompts, {
    onSuccess: (data) => {
      if (!selectedId && data.templates.length > 0) {
        setSelectedId(data.activeTemplateId);
      }
    },
  });

  const templates = promptsData?.templates || [];
  const activeTemplateId = promptsData?.activeTemplateId;
  const defaults = promptsData?.defaults;

  // 选中模板变化时更新编辑内容
  useEffect(() => {
    if (isCreating) {
      setEditingName('');
      setEditingDescription('');
      setEditingSystemPrompt(defaults?.systemPrompt || '');
      setEditingUserPromptTemplate(defaults?.userPromptTemplate || '');
      originalSnapshot.current = null;
    } else if (selectedId) {
      const template = templates.find((t: PromptTemplate) => t.id === selectedId);
      if (template) {
        setEditingName(template.name);
        setEditingDescription(template.description || '');
        setEditingSystemPrompt(template.systemPrompt);
        setEditingUserPromptTemplate(template.userPromptTemplate);
        originalSnapshot.current = {
          name: template.name,
          description: template.description || '',
          systemPrompt: template.systemPrompt,
          userPromptTemplate: template.userPromptTemplate,
        };
      }
    }
  }, [selectedId, isCreating, templates, defaults]);

  // 变更检测
  const hasChanges = useMemo(() => {
    if (isCreating) return editingName.trim() !== '' || editingDescription.trim() !== '';
    const current: FormSnapshot = { name: editingName, description: editingDescription, systemPrompt: editingSystemPrompt, userPromptTemplate: editingUserPromptTemplate };
    return hasFormChanges(current, originalSnapshot.current);
  }, [isCreating, editingName, editingDescription, editingSystemPrompt, editingUserPromptTemplate]);

  // 重置
  const handleReset = () => {
    if (isCreating) {
      setEditingName('');
      setEditingDescription('');
      setEditingSystemPrompt(defaults?.systemPrompt || '');
      setEditingUserPromptTemplate(defaults?.userPromptTemplate || '');
      toast.info('已重置');
    } else if (originalSnapshot.current) {
      const o = originalSnapshot.current;
      setEditingName(o.name);
      setEditingDescription(o.description);
      setEditingSystemPrompt(o.systemPrompt);
      setEditingUserPromptTemplate(o.userPromptTemplate);
      toast.info('已重置为原始配置');
    }
  };

  // 保存
  const { loading: saving, run: handleSave } = useRequest(
    async () => {
      if (!editingName.trim()) throw new Error('模板名称不能为空');
      if (!editingSystemPrompt.trim()) throw new Error('系统提示词不能为空');
      if (!editingUserPromptTemplate.includes('{{dailyLog}}')) {
        throw new Error('用户提示词模板必须包含 {{dailyLog}} 占位符');
      }

      if (isCreating) {
        await createPrompt({
          name: editingName.trim(),
          description: editingDescription.trim() || undefined,
          systemPrompt: editingSystemPrompt,
          userPromptTemplate: editingUserPromptTemplate,
        });
        setIsCreating(false);
      } else if (selectedId) {
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
      onSuccess: () => toast.success(isCreating ? '模板创建成功！' : '保存成功！'),
      onError: (err) => toast.error(err.message || '保存失败'),
    }
  );

  // 删除
  const { loading: deleting, run: handleDelete } = useRequest(
    async () => {
      if (!selectedId) return;
      if (templates.length <= 1) throw new Error('至少需要保留一个模板');
      await deletePrompt(selectedId);
      setSelectedId(null);
      await refresh();
    },
    {
      manual: true,
      onSuccess: () => toast.success('模板已删除'),
      onError: (err) => toast.error(err.message || '删除失败'),
    }
  );

  // 激活
  const { loading: activating, run: handleActivate } = useRequest(
    async () => {
      if (!selectedId) return;
      await activatePrompt(selectedId);
      await refresh();
    },
    {
      manual: true,
      onSuccess: () => toast.success('模板已激活'),
      onError: (err) => toast.error(err.message || '激活失败'),
    }
  );

  const handleResetToDefault = () => {
    if (defaults) {
      setEditingSystemPrompt(defaults.systemPrompt);
      setEditingUserPromptTemplate(defaults.userPromptTemplate);
      toast.info('已重置为默认提示词（需保存生效）');
    }
  };

  const handleStartCreate = () => { setIsCreating(true); setSelectedId(null); };
  const handleCancelCreate = () => {
    setIsCreating(false);
    if (templates.length > 0) setSelectedId(activeTemplateId || templates[0].id);
  };

  if (loading) return <Loading />;

  const isActive = selectedId === activeTemplateId;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧模板列表 */}
        <aside className="w-60 ml-6 my-6 bg-[#161b22] border border-[#30363d] rounded-lg flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-[#30363d]">
            <button
              onClick={handleStartCreate}
              disabled={isCreating}
              className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                isCreating ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed' : 'bg-[#238636] text-white hover:bg-[#2ea043]'
              }`}
            >
              + 新建模板
            </button>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {isCreating && (
              <div className="p-3 rounded-lg border-2 border-dashed border-[#58a6ff] bg-[#58a6ff]/10">
                <div className="font-medium text-[#58a6ff] text-sm">新建模板</div>
                <div className="text-xs text-[#8b949e] mt-1">填写右侧表单并保存</div>
                <button onClick={handleCancelCreate} className="mt-2 text-xs text-[#f85149] hover:underline">
                  取消创建
                </button>
              </div>
            )}

            {templates.map((template: PromptTemplate) => (
              <button
                key={template.id}
                onClick={() => { setIsCreating(false); setSelectedId(template.id); }}
                className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                  !isCreating && selectedId === template.id
                    ? 'bg-[#0d1117] border-[#58a6ff]'
                    : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[#f0f6fc] text-sm truncate">{template.name}</div>
                  {template.id === activeTemplateId && (
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
            ))}
          </div>
        </aside>

        {/* 右侧编辑区 */}
        <main className="flex-1 overflow-auto p-6 pb-20">
          <div className="max-w-3xl space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#f0f6fc]">✍️ Prompt 模板</h2>
                <p className="text-sm text-[#8b949e] mt-1">
                  管理周报生成的提示词模板
                </p>
              </div>
              {!isCreating && selectedId && !isActive && (
                <button
                  onClick={handleActivate}
                  disabled={activating}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d] border border-[#30363d]"
                >
                  {activating ? '激活中...' : '设为默认'}
                </button>
              )}
            </div>

            <SettingsCard>
              <SettingsCardHeader title="基本信息" />
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
            </SettingsCard>

            <SettingsCard>
              <SettingsCardHeader
                title="系统提示词 (System Prompt)"
                description="定义 AI 的角色和行为规则，包括输出格式要求。"
                action={
                  <button onClick={handleResetToDefault} className="text-xs text-[#58a6ff] hover:underline">
                    重置为默认
                  </button>
                }
              />
              <textarea
                value={editingSystemPrompt}
                onChange={(e) => setEditingSystemPrompt(e.target.value)}
                rows={14}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] font-mono text-sm resize-y"
                placeholder="输入系统提示词..."
              />
            </SettingsCard>

            <SettingsCard>
              <SettingsCardHeader title="用户提示词模板 (User Prompt Template)" />
              <p className="text-sm text-[#8b949e] mb-2">
                使用 <code className="px-1.5 py-0.5 bg-[#0d1117] rounded text-[#58a6ff]">{'{{dailyLog}}'}</code> 作为日志内容的占位符。
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
            </SettingsCard>

            {!isCreating && selectedId && (
              <SettingsCard danger>
                <SettingsCardHeader title="危险操作" danger />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[#f0f6fc]">删除此模板</div>
                    <div className="text-xs text-[#8b949e] mt-1">
                      删除后无法恢复，请谨慎操作。{templates.length <= 1 && ' （至少需要保留一个模板）'}
                    </div>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || templates.length <= 1}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      deleting || templates.length <= 1
                        ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                        : 'bg-[#f85149] text-white hover:bg-[#da3633]'
                    }`}
                  >
                    {deleting ? '删除中...' : '删除模板'}
                  </button>
                </div>
              </SettingsCard>
            )}
          </div>
        </main>
      </div>

      <SettingsFooter
        status={isCreating ? 'creating' : hasChanges ? 'changed' : 'synced'}
        showReset={hasChanges || isCreating}
        resetText={isCreating ? '取消' : '重置'}
        onReset={isCreating ? handleCancelCreate : handleReset}
        saveText={isCreating ? '创建模板' : '保存修改'}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!isCreating && !hasChanges}
      />
    </div>
  );
}
