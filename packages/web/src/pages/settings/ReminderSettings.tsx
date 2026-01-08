/**
 * 提醒设置页面
 */

import { useState, useEffect } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  getReminder,
  saveReminder,
  testReminder,
  type ReminderConfig,
  type SaveReminderParams,
} from '../../api';

// 时间选择器组件
function TimeSelector({
  label,
  hour,
  minute,
  enabled,
  onChange,
}: {
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  onChange: (data: { hour?: number; minute?: number; enabled?: boolean }) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="w-4 h-4 rounded border-[#30363d] bg-[#161b22] text-emerald-500 focus:ring-emerald-500/20"
        />
        <span className={`text-sm ${enabled ? 'text-[#f0f6fc]' : 'text-[#484f58]'}`}>
          {label}
        </span>
      </label>
      <div className="flex items-center gap-1 ml-auto">
        <select
          value={hour}
          onChange={(e) => onChange({ hour: parseInt(e.target.value, 10) })}
          disabled={!enabled}
          className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-sm text-[#f0f6fc] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}
            </option>
          ))}
        </select>
        <span className="text-[#8b949e]">:</span>
        <select
          value={minute}
          onChange={(e) => onChange({ minute: parseInt(e.target.value, 10) })}
          disabled={!enabled}
          className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-sm text-[#f0f6fc] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [sendKey, setSendKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [, setHasChanges] = useState(false);

  // 加载配置
  const { loading, refresh } = useRequest(getReminder, {
    onSuccess: (data) => {
      setConfig(data);
      setSendKey(data.sendKey || '');
      setHasChanges(false);
    },
    onError: (err) => {
      toast.error(err.message || '加载配置失败');
    },
  });

  // 检测变化
  useEffect(() => {
    if (!config) return;
    setHasChanges(sendKey !== (config.sendKey || ''));
  }, [sendKey, config]);

  // 更新本地配置
  const updateConfig = (updates: Partial<ReminderConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  // 更新提醒时间
  const updateSchedule = (
    type: 'morning' | 'evening',
    updates: { hour?: number; minute?: number; enabled?: boolean }
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      schedules: {
        ...config.schedules,
        [type]: { ...config.schedules[type], ...updates },
      },
    });
    setHasChanges(true);
  };

  // 保存配置
  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const params: SaveReminderParams = {
        enabled: config.enabled,
        sendKey: sendKey.trim(),
        schedules: config.schedules,
      };

      await saveReminder(params);
      toast.success('配置保存成功');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 测试推送
  const handleTest = async () => {
    const key = sendKey.trim();
    if (!key) {
      toast.error('请先输入 SendKey');
      return;
    }

    setIsTesting(true);
    try {
      const result = await testReminder(key);
      if (result.success) {
        toast.success('测试消息发送成功，请查看微信');
      } else {
        toast.error(result.error || '发送失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 页面头部 */}
      <header className="h-14 flex items-center px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">提醒设置</h2>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl space-y-6">
          {/* 启用提醒 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#f0f6fc]">启用提醒</h3>
                <p className="text-sm text-[#8b949e] mt-1">
                  开启后，将在法定工作日通过微信推送提醒你填写工作日志
                </p>
                <p className="text-xs text-[#484f58] mt-1">
                  💡 自动跳过节假日，包含调休工作日
                </p>
              </div>
              <button
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none
                  ${config.enabled ? 'bg-emerald-500' : 'bg-[#484f58]'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 
                    transition duration-200 ease-in-out
                    ${config.enabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </section>

          {/* Server酱配置 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">Server酱</h3>
            <p className="text-sm text-[#8b949e] mb-4">
              通过 Server酱 向微信推送消息，每天免费 5 条
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[#8b949e] mb-2">SendKey</label>
                <input
                  type="text"
                  value={sendKey}
                  onChange={(e) => setSendKey(e.target.value)}
                  placeholder="SCTxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-[#484f58]">
                  💡 访问{' '}
                  <a
                    href="https://sct.ftqq.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#58a6ff] hover:underline"
                  >
                    sct.ftqq.com
                  </a>
                  {' '}用 GitHub 登录获取 SendKey
                </p>
                <button
                  onClick={handleTest}
                  disabled={isTesting || !sendKey.trim()}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isTesting || !sendKey.trim()
                        ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                        : 'bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d]'
                    }
                  `}
                >
                  {isTesting ? '发送中...' : '测试'}
                </button>
              </div>
            </div>
          </section>

          {/* 提醒时间 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">提醒时间</h3>
            <p className="text-sm text-[#8b949e] mb-4">设置每天的提醒时间</p>

            <div className="space-y-3">
              <TimeSelector
                label="上午提醒"
                hour={config.schedules.morning.hour}
                minute={config.schedules.morning.minute}
                enabled={config.schedules.morning.enabled}
                onChange={(updates) => updateSchedule('morning', updates)}
              />
              <TimeSelector
                label="晚间提醒"
                hour={config.schedules.evening.hour}
                minute={config.schedules.evening.minute}
                enabled={config.schedules.evening.enabled}
                onChange={(updates) => updateSchedule('evening', updates)}
              />
            </div>
          </section>

          {/* 节假日数据 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">节假日数据</h3>

            {config.holidayData ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-[#f0f6fc]">{config.holidayData.year}年数据已加载</span>
                </div>
                <p className="text-sm text-[#8b949e]">
                  数据来源：{config.holidayData.source}
                </p>
                <p className="text-xs text-[#484f58]">
                  更新时间：{config.holidayData.updatedAt} · 
                  {config.holidayData.holidaysCount} 个节假日 · 
                  {config.holidayData.workdaysCount} 个调休工作日
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚠</span>
                <span className="text-[#8b949e]">当前年份暂无节假日数据，将使用周末判断</span>
              </div>
            )}
          </section>

          {/* 调度器状态 */}
          <section className="bg-[#161b22] rounded-lg border border-[#30363d] p-6">
            <h3 className="text-base font-semibold text-[#f0f6fc] mb-2">定时任务状态</h3>

            <div className="flex items-center gap-2">
              {config.scheduler.running ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">运行中</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#484f58]" />
                  <span className="text-[#8b949e]">未运行</span>
                </>
              )}
            </div>

            {!config.scheduler.running && config.enabled && (
              <p className="text-xs text-yellow-400 mt-2">
                💡 保存配置后定时任务将自动启动
              </p>
            )}
          </section>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all duration-200
                ${
                  isSaving
                    ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                    : 'bg-[#238636] text-white hover:bg-[#2ea043]'
                }
              `}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
