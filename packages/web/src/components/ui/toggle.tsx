/**
 * Toggle 开关组件
 */

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  /** 尺寸：sm=小号(渠道开关), md=中号(主开关) */
  size?: 'sm' | 'md';
}

export function Toggle({ enabled, onChange, size = 'md' }: ToggleProps) {
  const sizeClasses = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
    },
  };

  const { track, thumb, translate } = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex ${track} shrink-0 cursor-pointer rounded-full 
        border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
        ${enabled ? 'bg-emerald-500' : 'bg-[#484f58]'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block ${thumb} rounded-full bg-white shadow-lg ring-0 
          transition duration-200 ease-in-out
          ${enabled ? translate : 'translate-x-0'}
        `}
      />
    </button>
  );
}
