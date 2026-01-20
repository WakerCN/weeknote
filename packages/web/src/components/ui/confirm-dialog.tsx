/**
 * 确认弹框组件
 * 基于 Radix UI AlertDialog，替代浏览器原生 confirm
 */

import { useState, useRef } from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';

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

function AlertDialogContent({ className, children, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
          'bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'duration-200',
          className
        )}
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
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
    });
  };

  const handleClose = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setOptions(null);
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
        <AlertDialogContent>
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
