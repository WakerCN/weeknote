/**
 * 设置页面底部操作栏组件
 */

type StatusType = 'synced' | 'changed' | 'creating';

interface SettingsFooterProps {
  /** 状态类型 */
  status: StatusType;
  /** 自定义状态文字 */
  statusText?: string;
  /** 是否显示重置按钮 */
  showReset?: boolean;
  /** 重置按钮文字 */
  resetText?: string;
  /** 重置回调 */
  onReset?: () => void;
  /** 保存按钮文字 */
  saveText?: string;
  /** 保存回调 */
  onSave: () => void;
  /** 是否正在保存 */
  saving?: boolean;
  /** 保存按钮是否禁用 */
  saveDisabled?: boolean;
}

const STATUS_CONFIG: Record<StatusType, { color: string; text: string }> = {
  synced: { color: 'bg-emerald-400', text: '配置已同步' },
  changed: { color: 'bg-amber-400', text: '有未保存的更改' },
  creating: { color: 'bg-blue-400', text: '正在创建新模板' },
};

export function SettingsFooter({
  status,
  statusText,
  showReset = false,
  resetText = '重置',
  onReset,
  saveText = '保存',
  onSave,
  saving = false,
  saveDisabled = false,
}: SettingsFooterProps) {
  const { color, text } = STATUS_CONFIG[status];
  const displayText = statusText || text;
  const textColor = status === 'synced' ? 'text-[#8b949e]' : status === 'changed' ? 'text-amber-400' : 'text-blue-400';

  return (
    <footer className="h-14 flex items-center justify-between px-6 bg-[#161b22] border-t border-[#30363d] shrink-0">
      {/* 左侧：变更状态提示 */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className={`text-sm ${textColor}`}>{displayText}</span>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-3">
        {showReset && (
          <button
            onClick={onReset}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-all duration-200 disabled:opacity-50"
          >
            {resetText}
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving || saveDisabled}
          className={`
            px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
            ${
              saving || saveDisabled
                ? 'bg-[#21262d] text-[#484f58] cursor-not-allowed'
                : 'bg-[#238636] text-white hover:bg-[#2ea043]'
            }
          `}
        >
          {saving ? '保存中...' : saveText}
        </button>
      </div>
    </footer>
  );
}
