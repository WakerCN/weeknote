/**
 * 提醒设置页面
 */

import { useState, useMemo, useRef } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import {
  getReminder,
  saveReminder,
  testServerChan,
  testDingtalk,
  type ReminderConfig,
  type SaveReminderParams,
  type ChannelsConfig,
} from '../../api';
import { Toggle, SettingsCard, SettingsCardHeader, SettingsFooter, Loading } from '../../components/ui';
import { hasFormChanges } from '../../lib/form-utils';

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
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
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
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// 渠道卡片组件
function ChannelCard({
  icon,
  title,
  enabled,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-[#f0f6fc]">{title}</span>
        </div>
        <Toggle enabled={enabled} onChange={onToggle} size="sm" />
      </div>
      {children}
    </div>
  );
}

// 表单快照类型
interface FormSnapshot {
  enabled: boolean;
  dingtalkEnabled: boolean;
  dingtalkWebhook: string;
  dingtalkSecret: string;
  serverChanEnabled: boolean;
  serverChanSendKey: string;
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
}

export default function ReminderSettings() {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [dingtalkWebhook, setDingtalkWebhook] = useState('');
  const [dingtalkSecret, setDingtalkSecret] = useState('');
  const [serverChanSendKey, setServerChanSendKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<'dingtalk' | 'serverChan' | null>(null);
  const originalSnapshot = useRef<FormSnapshot | null>(null);

  // 加载配置
  const { loading, refresh } = useRequest(getReminder, {
    onSuccess: (data) => {
      setConfig(data);
      const webhook = data.channels?.dingtalk?.webhook || '';
      const secret = data.channels?.dingtalk?.secret || '';
      const sendKey = data.channels?.serverChan?.sendKey || '';
      
      setDingtalkWebhook(webhook);
      setDingtalkSecret(secret);
      setServerChanSendKey(sendKey);
      
      originalSnapshot.current = {
        enabled: data.enabled,
        dingtalkEnabled: data.channels?.dingtalk?.enabled || false,
        dingtalkWebhook: webhook,
        dingtalkSecret: secret,
        serverChanEnabled: data.channels?.serverChan?.enabled || false,
        serverChanSendKey: sendKey,
        morningEnabled: data.schedules.morning.enabled,
        morningHour: data.schedules.morning.hour,
        morningMinute: data.schedules.morning.minute,
        eveningEnabled: data.schedules.evening.enabled,
        eveningHour: data.schedules.evening.hour,
        eveningMinute: data.schedules.evening.minute,
      };
    },
    onError: (err) => toast.error(err.message || '加载配置失败'),
  });

  // 变更检测（使用简化后的工具函数）
  const hasChanges = useMemo(() => {
    if (!config) return false;
    const current: FormSnapshot = {
      enabled: config.enabled,
      dingtalkEnabled: config.channels.dingtalk.enabled,
      dingtalkWebhook,
      dingtalkSecret,
      serverChanEnabled: config.channels.serverChan.enabled,
      serverChanSendKey,
      morningEnabled: config.schedules.morning.enabled,
      morningHour: config.schedules.morning.hour,
      morningMinute: config.schedules.morning.minute,
      eveningEnabled: config.schedules.evening.enabled,
      eveningHour: config.schedules.evening.hour,
      eveningMinute: config.schedules.evening.minute,
    };
    return hasFormChanges(current, originalSnapshot.current);
  }, [config, dingtalkWebhook, dingtalkSecret, serverChanSendKey]);

  // 更新渠道配置
  const updateChannel = (channel: keyof ChannelsConfig, updates: Partial<ChannelsConfig[keyof ChannelsConfig]>) => {
    if (!config) return;
    setConfig({
      ...config,
      channels: { ...config.channels, [channel]: { ...config.channels[channel], ...updates } },
    });
  };

  // 更新提醒时间
  const updateSchedule = (type: 'morning' | 'evening', updates: { hour?: number; minute?: number; enabled?: boolean }) => {
    if (!config) return;
    setConfig({
      ...config,
      schedules: { ...config.schedules, [type]: { ...config.schedules[type], ...updates } },
    });
  };

  // 重置配置
  const handleReset = () => {
    if (!originalSnapshot.current) return;
    const o = originalSnapshot.current;
    
    setConfig((prev) => prev && ({
      ...prev,
      enabled: o.enabled,
      channels: {
        dingtalk: { enabled: o.dingtalkEnabled, webhook: o.dingtalkWebhook, secret: o.dingtalkSecret },
        serverChan: { enabled: o.serverChanEnabled, sendKey: o.serverChanSendKey },
      },
      schedules: {
        morning: { enabled: o.morningEnabled, hour: o.morningHour, minute: o.morningMinute },
        evening: { enabled: o.eveningEnabled, hour: o.eveningHour, minute: o.eveningMinute },
      },
    }));
    
    setDingtalkWebhook(o.dingtalkWebhook);
    setDingtalkSecret(o.dingtalkSecret);
    setServerChanSendKey(o.serverChanSendKey);
    toast.info('已重置为原始配置');
  };

  // 保存配置
  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      const params: SaveReminderParams = {
        enabled: config.enabled,
        channels: {
          dingtalk: { enabled: config.channels.dingtalk.enabled, webhook: dingtalkWebhook.trim(), secret: dingtalkSecret.trim() },
          serverChan: { enabled: config.channels.serverChan.enabled, sendKey: serverChanSendKey.trim() },
        },
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
  const handleTest = async (channel: 'dingtalk' | 'serverChan') => {
    setTestingChannel(channel);
    try {
      const result = channel === 'dingtalk'
        ? await testDingtalk(dingtalkWebhook.trim(), dingtalkSecret.trim() || undefined)
        : await testServerChan(serverChanSendKey.trim());
      
      if (result.success) {
        toast.success(channel === 'dingtalk' ? '钉钉测试消息发送成功' : '测试消息发送成功，请查看微信');
      } else {
        toast.error(result.error || '发送失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '测试失败');
    } finally {
      setTestingChannel(null);
    }
  };

  if (loading || !config) return <Loading />;

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 flex items-center px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <h2 className="text-lg font-semibold text-[#f0f6fc]">提醒设置</h2>
      </header>

      <main className="flex-1 overflow-auto p-6 pb-20">
        <div className="max-w-3xl space-y-6">
          {/* 启用提醒 */}
          <SettingsCard>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#f0f6fc]">启用提醒</h3>
                <p className="text-sm text-[#8b949e] mt-1">开启后，将在法定工作日通过已配置的渠道推送提醒</p>
                <p className="text-xs text-[#484f58] mt-1">💡 自动跳过节假日，包含调休工作日</p>
              </div>
              <Toggle enabled={config.enabled} onChange={(enabled) => setConfig({ ...config, enabled })} />
            </div>
          </SettingsCard>

          {/* 推送渠道 */}
          <SettingsCard>
            <SettingsCardHeader title="推送渠道" />
            <div className="space-y-4">
              {/* 钉钉 */}
              <ChannelCard
                icon="🤖"
                title="钉钉机器人"
                enabled={config.channels.dingtalk.enabled}
                onToggle={(enabled) => updateChannel('dingtalk', { enabled })}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-[#8b949e] mb-1.5">Webhook 地址</label>
                    <input
                      type="text"
                      value={dingtalkWebhook}
                      onChange={(e) => setDingtalkWebhook(e.target.value)}
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#8b949e] mb-1.5">
                      加签密钥 <span className="text-[#484f58]">(可选，推荐配置)</span>
                    </label>
                    <input
                      type="text"
                      value={dingtalkSecret}
                      onChange={(e) => setDingtalkSecret(e.target.value)}
                      placeholder="SECxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-[#484f58]">💡 在钉钉群设置中添加自定义机器人获取 Webhook</p>
                    <button
                      onClick={() => handleTest('dingtalk')}
                      disabled={testingChannel === 'dingtalk' || !dingtalkWebhook.trim()}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        testingChannel === 'dingtalk' || !dingtalkWebhook.trim()
                          ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                          : 'bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d]'
                      }`}
                    >
                      {testingChannel === 'dingtalk' ? '发送中...' : '测试'}
                    </button>
                  </div>
                </div>
              </ChannelCard>

              {/* Server酱 */}
              <ChannelCard
                icon="📱"
                title="Server酱（微信推送）"
                enabled={config.channels.serverChan.enabled}
                onToggle={(enabled) => updateChannel('serverChan', { enabled })}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-[#8b949e] mb-1.5">SendKey</label>
                    <input
                      type="text"
                      value={serverChanSendKey}
                      onChange={(e) => setServerChanSendKey(e.target.value)}
                      placeholder="SCTxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-[#f0f6fc] placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-[#484f58]">
                      💡 访问 <a href="https://sct.ftqq.com/" target="_blank" rel="noopener noreferrer" className="text-[#58a6ff] hover:underline">sct.ftqq.com</a> 用 GitHub 登录获取，每天免费 5 条
                    </p>
                    <button
                      onClick={() => handleTest('serverChan')}
                      disabled={testingChannel === 'serverChan' || !serverChanSendKey.trim()}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        testingChannel === 'serverChan' || !serverChanSendKey.trim()
                          ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                          : 'bg-[#21262d] text-[#f0f6fc] hover:bg-[#30363d]'
                      }`}
                    >
                      {testingChannel === 'serverChan' ? '发送中...' : '测试'}
                    </button>
                  </div>
                </div>
              </ChannelCard>
            </div>
          </SettingsCard>

          {/* 提醒时间 */}
          <SettingsCard>
            <SettingsCardHeader title="提醒时间" description="设置每天的提醒时间" />
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
          </SettingsCard>

          {/* 节假日数据 */}
          <SettingsCard>
            <SettingsCardHeader title="节假日数据" />
            {config.holidayData ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-[#f0f6fc]">{config.holidayData.year}年数据已加载</span>
                </div>
                <p className="text-sm text-[#8b949e]">数据来源：{config.holidayData.source}</p>
                <p className="text-xs text-[#484f58]">
                  更新时间：{config.holidayData.updatedAt} · {config.holidayData.holidaysCount} 个节假日 · {config.holidayData.workdaysCount} 个调休工作日
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚠</span>
                <span className="text-[#8b949e]">当前年份暂无节假日数据，将使用周末判断</span>
              </div>
            )}
          </SettingsCard>

          {/* 调度器状态 */}
          <SettingsCard>
            <SettingsCardHeader title="定时任务状态" />
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
              <p className="text-xs text-yellow-400 mt-2">💡 保存配置后定时任务将自动启动</p>
            )}
          </SettingsCard>
        </div>
      </main>

      <SettingsFooter
        status={hasChanges ? 'changed' : 'synced'}
        showReset={hasChanges}
        onReset={handleReset}
        saveText="保存配置"
        onSave={handleSave}
        saving={isSaving}
        saveDisabled={!hasChanges}
      />
    </div>
  );
}
