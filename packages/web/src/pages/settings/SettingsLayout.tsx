/**
 * 设置页面布局容器
 * 包含左侧 Sidebar 和右侧内容区
 */

import { NavLink, Outlet } from 'react-router-dom';
import { useTransitionNavigate } from '../../lib/navigation';
import UserMenu from '../../components/UserMenu';

// 侧边栏菜单项配置
const MENU_ITEMS = [
  {
    path: '/settings/apikey-model',
    icon: '🔑',
    label: '模型与 API Key',
    description: '配置 API Key 和默认模型',
  },
  {
    path: '/settings/prompt',
    icon: '📝',
    label: 'Prompt 模板',
    description: '管理 AI 提示词模板',
  },
  {
    path: '/settings/reminder',
    icon: '🔔',
    label: '提醒设置',
    description: '配置微信提醒通知',
  },
];

export default function SettingsLayout() {
  const navigate = useTransitionNavigate();

  return (
    <div className="h-screen w-screen flex bg-[#0d1117]">
      {/* 左侧 Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
        {/* 头部：返回按钮 + 标题 */}
        <header className="h-14 flex items-center gap-3 px-4 border-b border-[#30363d]">
          <button
            onClick={() => navigate('/', { scope: 'root' })}
            className="text-[#8b949e] hover:text-[#f0f6fc] transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-[#f0f6fc]">设置</h1>
        </header>

        {/* 菜单列表 */}
        <nav className="flex-1 p-3 space-y-1">
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              viewTransition
              className={({ isActive }) => `
                block px-3 py-3 rounded-lg transition-all duration-200 border
                ${
                  isActive
                    ? 'bg-[#21262d] border-[#30363d]'
                    : 'border-transparent hover:bg-[#21262d]/50'
                }
              `}
            >
              {({ isActive }) => (
                <div className="flex items-start gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium text-sm ${
                        isActive ? 'text-[#f0f6fc]' : 'text-[#8b949e]'
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs text-[#484f58] mt-0.5 truncate">
                      {item.description}
                    </div>
                  </div>
                  <div
                    className={`w-1 h-8 rounded-full shrink-0 transition-opacity duration-200 ${
                      isActive ? 'bg-emerald-500 opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 底部版本信息 - 与右侧操作栏等高 */}
        <div className="h-14 px-4 flex items-center border-t border-[#30363d] shrink-0">
          <div className="text-xs text-[#484f58]">WeekNote v1.0.0</div>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部用户信息栏 */}
        <div className="h-14 flex items-center justify-end px-6 bg-[#161b22] border-b border-[#30363d] shrink-0">
          <UserMenu />
        </div>
        {/* 设置内容区 */}
        <div className="flex-1 overflow-auto">
          <div className="settings-content h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}



