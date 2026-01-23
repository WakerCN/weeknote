/**
 * 全局应用状态
 * 存储用户偏好、持久化配置等
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // 侧边栏折叠状态
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 默认思考模式
  thinkingMode: 'enabled' | 'disabled';
  setThinkingMode: (mode: 'enabled' | 'disabled') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      thinkingMode: 'enabled',
      setThinkingMode: (mode) => set({ thinkingMode: mode }),
    }),
    {
      name: 'weeknote-app-storage', // localStorage key
    }
  )
);
