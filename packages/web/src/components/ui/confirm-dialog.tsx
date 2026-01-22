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

interface AlertDialogContentProps extends React.ComponentProps<typeof AlertDialogPrimitive.Content> {
  mousePosition?: MousePosition | null;
  isClosing?: boolean;
}

function AlertDialogContent({ className, children, mousePosition, isClosing, style, ...props }: AlertDialogContentProps) {
  // 计算 CSS 变量（在渲染时同步计算，确保动画开始前就有值）
  const cssVars = mousePosition ? {
    '--origin-x': `${mousePosition.x - window.innerWidth / 2}px`,
    '--origin-y': `${mousePosition.y - window.innerHeight / 2}px`,
  } as React.CSSProperties : {};

  // 根据状态选择动画类
  const getContentAnimationClass = () => {
    if (isClosing) {
      return 'dialog-closing';
    }
    if (mousePosition) {
      return 'dialog-from-mouse';
    }
    return 'dialog-default-open';
  };

  return (
    <AlertDialogPrimitive.Portal forceMount>
      {/* Overlay */}
      <AlertDialogPrimitive.Overlay
        forceMount
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
          isClosing && 'overlay-closing'
        )}
      />
      {/* Content */}
      <AlertDialogPrimitive.Content
        forceMount
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md',
          'bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl',
          getContentAnimationClass(),
          className
        )}
        style={{ ...cssVars, ...style }}
        onClick={(e) => e.stopPropagation()}
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
// 关闭动画时长（与 CSS dialog-exit 动画 0.15s 一致）
const CLOSE_ANIMATION_DURATION = 150;

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      // 捕获当前鼠标位置（通过最近的点击事件）
      const currentMousePosition = lastMousePosition;
      setMousePosition(currentMousePosition);
      setIsClosing(false);
      setOptions(opts);
    });
  };

  // 触发关闭动画，等待动画结束后清理状态
  const handleClose = (confirmed: boolean) => {
    // 开始关闭动画
    setIsClosing(true);
    
    // 等待关闭动画完成后再清理状态和返回结果
    setTimeout(() => {
      resolveRef.current?.(confirmed);
      resolveRef.current = null;
      setOptions(null);
      setMousePosition(null);
      setIsClosing(false);
    }, CLOSE_ANIMATION_DURATION);
  };

  const ConfirmDialogComponent = () => {
    // 需要 options 来渲染内容（用于关闭动画）
    if (!options) return null;
    
    const { 
      title, 
      description, 
      confirmText = '确认', 
      cancelText = '取消',
      variant = 'default',
    } = options;

    return (
      <AlertDialogPrimitive.Root 
        open={true}
        onOpenChange={(open) => !open && handleClose(false)}
      >
        <AlertDialogContent mousePosition={mousePosition} isClosing={isClosing}>
          {/* Header */}
          <div className="p-6 pb-4">
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-[#f0f6fc]">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-[#8b949e] leading-relaxed whitespace-pre-wrap">
              {description}
            </AlertDialogPrimitive.Description>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            <AlertDialogPrimitive.Cancel
              onClick={(e) => {
                e.stopPropagation();
                handleClose(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] border border-[#30363d]"
            >
              {cancelText}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={(e) => {
                e.stopPropagation();
                handleClose(true);
              }}
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
