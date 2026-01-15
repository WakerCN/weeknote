/**
 * 认证上下文 - 全局用户状态管理
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import apiClient, { tokenManager } from '../lib/api-client';
import { toast } from 'sonner';

/**
 * 用户信息
 */
export interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * 认证上下文类型
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * 认证提供者组件
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 获取当前用户信息
   */
  const fetchCurrentUser = useCallback(async () => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      // Token 无效，清除
      tokenManager.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 初始化 - 检查本地 Token
   */
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  /**
   * 登录
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { user: userData, accessToken, refreshToken } = response.data;

      // 保存 Token
      tokenManager.setTokens(accessToken, refreshToken);

      // 设置用户信息
      setUser(userData);

      toast.success('登录成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      toast.error(message);
      throw error;
    }
  };

  /**
   * 注册
   */
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        password,
        name,
      });

      const { user: userData, accessToken, refreshToken } = response.data;

      // 保存 Token
      tokenManager.setTokens(accessToken, refreshToken);

      // 设置用户信息
      setUser(userData);

      toast.success('注册成功');
    } catch (error) {
      const message = error instanceof Error ? error.message : '注册失败';
      toast.error(message);
      throw error;
    }
  };

  /**
   * 登出
   */
  const logout = () => {
    tokenManager.clearTokens();
    setUser(null);
    toast.success('已退出登录');
    window.location.href = '/auth';
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 使用认证 Hook
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
