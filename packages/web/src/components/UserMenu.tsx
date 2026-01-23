/**
 * 用户菜单组件 - 显示用户信息和退出按钮
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User as UserIcon, Sparkles } from 'lucide-react';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 用户头像按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#161b22] transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#238636] flex items-center justify-center text-white font-medium">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-[#c9d1d9] hidden sm:inline">{user.name}</span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg overflow-hidden z-50">
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2 mb-1">
              <UserIcon size={16} className="text-[#8b949e]" />
              <p className="text-sm font-medium text-[#f0f6fc]">{user.name}</p>
            </div>
            <p className="text-xs text-[#8b949e] truncate">{user.email}</p>
          </div>

          {/* Prompt 广场链接 */}
          <Link
            to="/prompt-plaza"
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2 text-left text-sm text-[#c9d1d9] hover:bg-[#0d1117] flex items-center gap-2 transition-colors"
          >
            <Sparkles size={16} className="text-[#58a6ff]" />
            Prompt 广场
          </Link>

          {/* 退出按钮 */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full px-4 py-2 text-left text-sm text-[#f85149] hover:bg-[#0d1117] flex items-center gap-2 transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
