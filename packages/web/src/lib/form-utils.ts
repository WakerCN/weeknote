/**
 * 表单工具函数
 */

/**
 * 检测表单是否有变更
 * 使用 JSON.stringify 进行深度比较
 */
export function hasFormChanges<T>(current: T, original: T | null): boolean {
  if (!original) return false;
  return JSON.stringify(current) !== JSON.stringify(original);
}
