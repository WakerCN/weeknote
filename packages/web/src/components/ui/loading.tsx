/**
 * 加载状态组件
 */

interface LoadingProps {
  text?: string;
}

export function Loading({ text = '加载中...' }: LoadingProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-[#8b949e]">{text}</div>
    </div>
  );
}
