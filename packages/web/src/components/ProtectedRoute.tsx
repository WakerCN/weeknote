/**
 * 路由保护组件 - 未登录跳转到登录页
 */

import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, setNavigate } = useAuth();
  const navigate = useNavigate();

  // 注册导航函数到 AuthContext，使 logout 可以使用 React Router 导航
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate, setNavigate]);

  // 加载中显示占位
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-base">
        <div className="text-text-color-secondary">加载中...</div>
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
