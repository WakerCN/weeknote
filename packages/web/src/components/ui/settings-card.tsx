/**
 * 设置卡片组件
 */

import type { ReactNode } from 'react';

interface SettingsCardProps {
  children: ReactNode;
  /** 危险样式（红色边框） */
  danger?: boolean;
  className?: string;
}

export function SettingsCard({ children, danger, className = '' }: SettingsCardProps) {
  return (
    <section
      className={`
        bg-[#161b22] rounded-lg p-6
        ${danger ? 'border border-[#f85149]/30' : 'border border-[#30363d]'}
        ${className}
      `}
    >
      {children}
    </section>
  );
}

interface SettingsCardHeaderProps {
  title: string;
  /** 标题右侧的操作按钮 */
  action?: ReactNode;
  /** 描述文字 */
  description?: string;
  /** 危险样式（红色标题） */
  danger?: boolean;
}

export function SettingsCardHeader({
  title,
  action,
  description,
  danger,
}: SettingsCardHeaderProps) {
  return (
    <div className={description || action ? 'mb-4' : ''}>
      <div className="flex items-center justify-between">
        <h3
          className={`text-base font-semibold ${danger ? 'text-[#f85149]' : 'text-[#f0f6fc]'}`}
        >
          {title}
        </h3>
        {action}
      </div>
      {description && <p className="text-sm text-[#8b949e] mt-1">{description}</p>}
    </div>
  );
}
