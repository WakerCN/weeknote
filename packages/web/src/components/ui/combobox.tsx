/**
 * Combobox 组件 - 支持搜索的下拉选择
 * 基于 Radix Popover + 自定义搜索
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

// ============ Popover 组件 ============
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-[#30363d] bg-[#161b22] text-[#f0f6fc] shadow-xl shadow-black/20 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

// ============ Combobox 组合组件 ============
export interface ComboboxTag {
  text: string;
  variant: 'success' | 'warning' | 'info' | 'default';
}

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  tags?: ComboboxTag[];
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = '选择...',
  searchPlaceholder = '搜索...',
  emptyText = '未找到结果',
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // 过滤选项
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(lowerSearch));
  }, [options, search]);

  // 打开时聚焦输入框
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  // 处理选择
  const handleSelect = (option: ComboboxOption) => {
    onValueChange?.(option.value);
    setOpen(false);
    setSearch('');
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // 获取标签样式
  const getTagClassName = (variant: ComboboxTag['variant']) => {
    const base = 'text-xs px-1.5 py-0.5 rounded';
    switch (variant) {
      case 'success':
        return `${base} bg-emerald-400/10 text-emerald-400`;
      case 'warning':
        return `${base} bg-yellow-400/10 text-yellow-400`;
      case 'info':
        return `${base} bg-blue-400/10 text-blue-400`;
      default:
        return `${base} bg-[#30363d] text-[#8b949e]`;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm text-[#f0f6fc] ring-offset-background placeholder:text-[#8b949e] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              {selectedOption.icon}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-[#8b949e]">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#8b949e]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" onKeyDown={handleKeyDown}>
        {/* 搜索输入框 */}
        <div className="flex items-center border-b border-[#30363d] px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-[#8b949e]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-10 w-full bg-transparent py-3 text-sm text-[#f0f6fc] outline-none placeholder:text-[#8b949e]"
          />
        </div>

        {/* 选项列表 */}
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#8b949e]">{emptyText}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors',
                  'hover:bg-[#21262d] focus:bg-[#21262d]',
                  value === option.value && 'bg-[#21262d]'
                )}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 text-emerald-400 transition-opacity shrink-0',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {option.icon && <span className="mr-2 shrink-0">{option.icon}</span>}
                <span className="truncate flex-1">{option.label}</span>
                {option.tags && option.tags.length > 0 && (
                  <span className="ml-2 flex items-center gap-1 shrink-0">
                    {option.tags.map((tag, idx) => (
                      <span key={idx} className={getTagClassName(tag.variant)}>
                        {tag.text}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
