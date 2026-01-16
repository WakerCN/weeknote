/**
 * 提醒设置页面
 */

import { useState, useMemo, useRef } from 'react';
import { useRequest } from 'ahooks';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  getReminder,
  saveReminder,
  testServerChan,
  testDingtalk,
  type ReminderConfig,
  type SaveReminderParams,
  type ScheduleTime,
  type ChannelSchedules,
} from '../../api';
import { Toggle, SettingsCard, SettingsCardHeader, SettingsFooter, Loading, TimePicker, Checkbox } from '../../components/ui';
import { hasFormChanges } from '../../lib/form-utils';
import DingtalkLogo from '../../assets/logos/ding.png';
import WechatLogo from '../../assets/logos/wechat.png';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * 单个时间点编辑器
 */
/**
 * 单个时间标签（带删除按钮）
 */
function TimeTag({
  time,
  onChange,
  onRemove,
  canRemove,
}: {
  time: ScheduleTime;
  onChange: (updates: Partial<ScheduleTime>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="relative group">
      {/* 删除按钮 - 右上角 */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
          title="删除"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
      
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#0d1117] rounded-lg border border-[#30363d]">
        {/* 启用开关 */}
        <Checkbox
          checked={time.enabled}
          onChange={(checked) => onChange({ enabled: checked })}
          size="sm"
        />
        
        {/* 时间选择 */}
        <TimePicker
          hour={time.hour}
          minute={time.minute}
          onChange={(hour, minute) => onChange({ hour, minute })}
        />
      </div>
    </div>
  );
}

/**
 * 检查时间是否重复
 */
function isDuplicateTime(times: ScheduleTime[], hour: number, minute: number, excludeId?: string): boolean {
  return times.some((t) => t.id !== excludeId && t.hour === hour && t.minute === minute);
}

/**
 * 查找一个不重复的时间
 */
function findAvailableTime(times: ScheduleTime[]): { hour: number; minute: number } {
  // 常用时间列表
  const preferredTimes = [
    { hour: 9, minute: 0 },
    { hour: 10, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 17, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 20, minute: 0 },
  ];
  
  // 优先使用常用时间
  for (const t of preferredTimes) {
    if (!isDuplicateTime(times, t.hour, t.minute)) {
      return t;
    }
  }
  
  // 遍历所有时间找一个可用的
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m++) {
      if (!isDuplicateTime(times, h, m)) {
        return { hour: h, minute: m };
      }
    }
  }
  
  // 理论上不会走到这里（24*60=1440个时间点）
  return { hour: 0, minute: 0 };
}

/**
 * 时间列表编辑器（横向布局）
 */
function TimeListEditor({
  schedules,
  onChange,
}: {
  schedules: ChannelSchedules;
  onChange: (schedules: ChannelSchedules) => void;
}) {
  const addTime = () => {
    const newTime = findAvailableTime(schedules.times);
    onChange({
      times: [
        ...schedules.times,
        { id: generateId(), hour: newTime.hour, minute: newTime.minute, enabled: true },
      ],
    });
  };

  const removeTime = (id: string) => {
    if (schedules.times.length <= 1) return;
    onChange({
      times: schedules.times.filter((t) => t.id !== id),
    });
  };

  const updateTime = (id: string, updates: Partial<ScheduleTime>) => {
    // 检查时间是否重复
    const currentTime = schedules.times.find((t) => t.id === id);
    if (currentTime && (updates.hour !== undefined || updates.minute !== undefined)) {
      const newHour = updates.hour ?? currentTime.hour;
      const newMinute = updates.minute ?? currentTime.minute;
      
      if (isDuplicateTime(schedules.times, newHour, newMinute, id)) {
        toast.error('该时间已存在');
        return;
      }
    }
    
    onChange({
      times: schedules.times.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-[#8b949e]">📅 提醒时间</span>
      </div>
      <div className="flex items-center flex-wrap gap-2">
        {schedules.times.map((time) => (
          <TimeTag
            key={time.id}
            time={time}
            onChange={(updates) => updateTime(time.id, updates)}
            onRemove={() => removeTime(time.id)}
            canRemove={schedules.times.length > 1}
          />
        ))}
        {/* 添加按钮 */}
        <button
          onClick={addTime}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-[#30363d] text-[#8b949e] hover:text-[#58a6ff] hover:border-[#58a6ff] transition-colors"
          title="添加提醒时间"
        >
          <Plus className="w-4 h-4" />
        </button>
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
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-[#f0f6fc]">{title}</span>
        </div>
        <Toggle enabled={enabled} onChange={onToggle} size="sm" />
      </div>
      {children}
    </div>
  );
}

// 表单快照类型（用于变更检测）
interface FormSnapshot {
  enabled: boolean;
  dingtalkEnabled: boolean;
  dingtalkWebhook: string;
  dingtalkSecret: string;
  dingtalkSchedules: string; // JSON 字符串便于比较
  serverChanEnabled: boolean;
  serverChanSendKey: string;
  serverChanSchedules: string; // JSON 字符串便于比较
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
      const webhook = data.channels.dingtalk.webhook || '';
      const secret = data.channels.dingtalk.secret || '';
      const sendKey = data.channels.serverChan.sendKey || '';
      
      setDingtalkWebhook(webhook);
      setDingtalkSecret(secret);
      setServerChanSendKey(sendKey);
      
      originalSnapshot.current = {
        enabled: data.enabled,
        dingtalkEnabled: data.channels.dingtalk.enabled || false,
        dingtalkWebhook: webhook,
        dingtalkSecret: secret,
        dingtalkSchedules: JSON.stringify(data.channels.dingtalk.schedules?.times || []),
        serverChanEnabled: data.channels.serverChan.enabled || false,
        serverChanSendKey: sendKey,
        serverChanSchedules: JSON.stringify(data.channels.serverChan.schedules?.times || []),
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
      dingtalkSchedules: JSON.stringify(config.channels.dingtalk.schedules?.times || []),
      serverChanEnabled: config.channels.serverChan.enabled,
      serverChanSendKey,
      serverChanSchedules: JSON.stringify(config.channels.serverChan.schedules?.times || []),
    };
    return hasFormChanges(current, originalSnapshot.current);
  }, [config, dingtalkWebhook, dingtalkSecret, serverChanSendKey]);

  // 更新渠道提醒时间
  const updateChannelSchedules = (channel: 'dingtalk' | 'serverChan', schedules: ChannelSchedules) => {
    if (!config) return;
    setConfig({
      ...config,
      channels: {
        ...config.channels,
        [channel]: { ...config.channels[channel], schedules },
      },
    });
  };

  // 重置配置
  const handleReset = () => {
    if (!originalSnapshot.current) return;
    const o = originalSnapshot.current;
    
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        enabled: o.enabled,
        channels: {
          dingtalk: {
            enabled: o.dingtalkEnabled,
            webhook: o.dingtalkWebhook,
            secret: o.dingtalkSecret,
            schedules: { times: JSON.parse(o.dingtalkSchedules) },
          },
          serverChan: {
            enabled: o.serverChanEnabled,
            sendKey: o.serverChanSendKey,
            schedules: { times: JSON.parse(o.serverChanSchedules) },
          },
        },
      };
    });
    
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
          dingtalk: {
            enabled: config.channels.dingtalk.enabled,
            webhook: dingtalkWebhook.trim(),
            secret: dingtalkSecret.trim(),
            schedules: config.channels.dingtalk.schedules,
          },
          serverChan: {
            enabled: config.channels.serverChan.enabled,
            sendKey: serverChanSendKey.trim(),
            schedules: config.channels.serverChan.schedules,
          },
        },
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
            <SettingsCardHeader title="推送渠道" description="每个渠道可独立配置提醒时间" />
            <div className="space-y-4">
              {/* 钉钉 */}
              <ChannelCard
                icon={
                  <div className="w-5 h-5 overflow-hidden flex-shrink-0">
                    <img 
                      src={DingtalkLogo} 
                      alt="钉钉" 
                      className="h-5"
                      style={{ width: '80px', maxWidth: 'none' }}
                    />
                  </div>
                }
                title="钉钉机器人"
                enabled={config.channels.dingtalk.enabled}
                onToggle={(enabled) => setConfig({ ...config, channels: { ...config.channels, dingtalk: { ...config.channels.dingtalk, enabled } } })}
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
                  
                  {/* 钉钉提醒时间 */}
                  <TimeListEditor
                    schedules={config.channels.dingtalk.schedules}
                    onChange={(schedules) => updateChannelSchedules('dingtalk', schedules)}
                  />
                  
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
                icon={
                  <img 
                    src={WechatLogo} 
                    alt="微信" 
                    className="w-5 h-5"
                    style={{ 
                      filter: 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(118deg) brightness(95%) contrast(101%)'
                    }}
                  />
                }
                title="Server酱（微信推送）"
                enabled={config.channels.serverChan.enabled}
                onToggle={(enabled) => setConfig({ ...config, channels: { ...config.channels, serverChan: { ...config.channels.serverChan, enabled } } })}
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
                  
                  {/* Server酱提醒时间 */}
                  <TimeListEditor
                    schedules={config.channels.serverChan.schedules}
                    onChange={(schedules) => updateChannelSchedules('serverChan', schedules)}
                  />
                  
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
