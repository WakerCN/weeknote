/**
 * 自定义复选框组件
 * 深色主题，与项目风格一致
 */

import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Checkbox({ checked, onChange, disabled, size = 'md' }: CheckboxProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center rounded
        border-2 transition-all duration-150
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${
          checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58]'
        }
      `}
    >
      {checked && (
        <Check 
          className={`${iconSizes[size]} text-white stroke-[3]`}
        />
      )}
    </button>
  );
}
