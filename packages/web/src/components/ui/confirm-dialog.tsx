/**
 * 确认弹框组件
 * 基于 Radix UI AlertDialog，替代浏览器原生 confirm
 * 支持从鼠标点击位置弹出到中心的动画效果
 */

import { useState, useRef } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';

// ========== 动画相关类型 ==========

interface MousePosition {
  x: number;
  y: number;
}

// ========== 全局鼠标位置追踪 ==========

let lastMousePosition: MousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// 监听全局点击事件，记录鼠标位置
if (typeof window !== 'undefined') {
  document.addEventListener('click', (e) => {
    lastMousePosition = { x: e.clientX, y: e.clientY };
  }, true);
}

// ========== 基础样式组件 ==========

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

interface AlertDialogContentProps extends React.ComponentProps<typeof AlertDialogPrimitive.Content> {
  mousePosition?: MousePosition | null;
}

function AlertDialogContent({ className, children, mousePosition, style, ...props }: AlertDialogContentProps) {
  // 计算 CSS 变量（在渲染时同步计算，确保动画开始前就有值）
  const cssVars = mousePosition ? {
    '--origin-x': `${mousePosition.x - window.innerWidth / 2}px`,
    '--origin-y': `${mousePosition.y - window.innerHeight / 2}px`,
  } as React.CSSProperties : {};

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md',
          'bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl',
          // 使用自定义动画：从鼠标位置弹出
          mousePosition ? 'dialog-from-mouse' : 'dialog-default-open',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'duration-200',
          className
        )}
        style={{ ...cssVars, ...style }}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}

// ========== useConfirm Hook ==========

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

/**
 * useConfirm Hook
 * 提供类似 confirm() 的 Promise API，但使用自定义弹框
 * 支持从鼠标点击位置弹出的动画效果
 * 
 * @example
 * const { confirm, ConfirmDialogComponent } = useConfirm();
 * 
 * const handleAction = async () => {
 *   if (await confirm({ title: '确认', description: '确定吗？' })) {
 *     // 用户点击了确认
 *   }
 * };
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      // 捕获当前鼠标位置（通过最近的点击事件）
      const currentMousePosition = lastMousePosition;
      setMousePosition(currentMousePosition);
      setOptions(opts);
    });
  };

  const handleClose = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setOptions(null);
    setMousePosition(null);
  };

  const ConfirmDialogComponent = () => {
    if (!options) return null;
    
    const { 
      title, 
      description, 
      confirmText = '确认', 
      cancelText = '取消',
      variant = 'default',
    } = options;

    return (
      <AlertDialogPrimitive.Root open onOpenChange={(open) => !open && handleClose(false)}>
        <AlertDialogContent mousePosition={mousePosition}>
          {/* Header */}
          <div className="p-6 pb-4">
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-[#f0f6fc]">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-[#8b949e] leading-relaxed">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <AlertDialogPrimitive.Cancel
              onClick={() => handleClose(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] border border-[#30363d]"
            >
              {cancelText}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={() => handleClose(true)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                variant === 'danger'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
            >
              {confirmText}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogContent>
      </AlertDialogPrimitive.Root>
    );
  };

  return { confirm, ConfirmDialogComponent };
}
