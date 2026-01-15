/**
 * 路由保护组件 - 未登录跳转到登录页
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // 加载中显示占位
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  // 未认证跳转登录页
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // 已认证，渲染子组件
  return <>{children}</>;
}
