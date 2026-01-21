/**
 * 账号管理设置页
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../lib/api-client';
import { toast } from 'sonner';
import {
  validatePassword,
  validateConfirmPassword,
  validateName,
} from '../../lib/validators';

interface UserInfo {
  _id: string;
  email: string;
  name: string;
  passwordHash?: boolean;
  loginMethod?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function AccountSettings() {
  const { logout, refreshUser } = useAuth();
  
  // 用户信息
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 用户名修改
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  // 修改密码
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // 设置密码（验证码用户）
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [setPasswordConfirm, setSetPasswordConfirm] = useState('');
  const [setPasswordError, setSetPasswordError] = useState('');
  const [setPasswordConfirmError, setSetPasswordConfirmError] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  // 获取用户详细信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        setUserInfo(response.data.user);
        setName(response.data.user.name);
      } catch (error) {
        toast.error('获取用户信息失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserInfo();
  }, []);

  /**
   * 保存用户名
   */
  const handleSaveName = async () => {
    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }
    
    if (name === userInfo?.name) {
      return;
    }

    setSavingName(true);
    try {
      await apiClient.put('/auth/me', { name });
      setUserInfo((prev) => prev ? { ...prev, name } : null);
      await refreshUser();
      toast.success('用户名已更新');
    } catch (error) {
      toast.error('更新用户名失败');
    } finally {
      setSavingName(false);
    }
  };

  /**
   * 修改密码
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentErr = currentPassword ? '' : '请输入当前密码';
    const newErr = validatePassword(newPassword);
    const confirmErr = validateConfirmPassword(newPassword, confirmPassword);

    if (currentErr || newErr || confirmErr) {
      setCurrentPasswordError(currentErr);
      setNewPasswordError(newErr);
      setConfirmPasswordError(confirmErr);
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('密码已更新');
    } catch (error) {
      const message = error instanceof Error ? error.message : '修改密码失败';
      setCurrentPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  };

  /**
   * 设置密码（验证码用户）
   */
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordErr = validatePassword(setPasswordValue);
    const confirmErr = validateConfirmPassword(setPasswordValue, setPasswordConfirm);

    if (passwordErr || confirmErr) {
      setSetPasswordError(passwordErr);
      setSetPasswordConfirmError(confirmErr);
      return;
    }

    setSettingPassword(true);
    try {
      await apiClient.put('/auth/set-password', {
        newPassword: setPasswordValue,
      });
      setSetPasswordValue('');
      setSetPasswordConfirm('');
      // 刷新用户信息
      const response = await apiClient.get('/auth/me');
      setUserInfo(response.data.user);
      toast.success('密码已设置');
    } catch (error) {
      const message = error instanceof Error ? error.message : '设置密码失败';
      toast.error(message);
    } finally {
      setSettingPassword(false);
    }
  };

  /**
   * 格式化日期
   */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#8b949e]">加载中...</div>
      </div>
    );
  }

  const hasPassword = userInfo?.passwordHash;

  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-auto p-6 pb-20">
        <div className="max-w-3xl space-y-6">
          {/* 页面标题 */}
          <div>
            <h2 className="text-xl font-semibold text-[#f0f6fc]">👤 账号管理</h2>
            <p className="text-sm text-[#8b949e] mt-1">
              管理您的账号信息和安全设置
            </p>
          </div>

      {/* 基本信息 */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d]">
          <h3 className="font-medium text-[#f0f6fc]">📋 基本信息</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* 邮箱 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#8b949e]">
                邮箱
              </label>
              <p className="text-[#f0f6fc]">{userInfo?.email}</p>
            </div>
            <span className="text-xs text-[#8b949e] bg-[#21262d] px-2 py-1 rounded">
              不可修改
            </span>
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-2">
              用户名
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                className={`flex-1 px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
                  nameError ? 'border-red-500' : 'border-[#30363d]'
                }`}
                placeholder="你的名字"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || name === userInfo?.name}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#8b949e] disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                {savingName ? '保存中...' : '保存'}
              </button>
            </div>
            {nameError && (
              <p className="mt-1 text-sm text-red-400">{nameError}</p>
            )}
          </div>

          {/* 其他信息 */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#21262d]">
            <div>
              <label className="block text-sm font-medium text-[#8b949e]">
                注册时间
              </label>
              <p className="text-[#c9d1d9]">{formatDate(userInfo?.createdAt)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#8b949e]">
                登录方式
              </label>
              <p className="text-[#c9d1d9]">
                {userInfo?.loginMethod === 'code' ? '验证码登录' : '密码登录'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 安全设置 */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d]">
          <h3 className="font-medium text-[#f0f6fc]">🔒 安全设置</h3>
        </div>
        <div className="p-4">
          {hasPassword ? (
            // 修改密码
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-sm text-[#8b949e]">修改您的登录密码</p>
              
              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">
                  当前密码
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (currentPasswordError) setCurrentPasswordError('');
                  }}
                  className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
                    currentPasswordError ? 'border-red-500' : 'border-[#30363d]'
                  }`}
                  placeholder="输入当前密码"
                />
                {currentPasswordError && (
                  <p className="mt-1 text-sm text-red-400">{currentPasswordError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (newPasswordError) setNewPasswordError('');
                  }}
                  className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
                    newPasswordError ? 'border-red-500' : 'border-[#30363d]'
                  }`}
                  placeholder="至少 6 个字符"
                />
                {newPasswordError && (
                  <p className="mt-1 text-sm text-red-400">{newPasswordError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">
                  确认新密码
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError('');
                  }}
                  className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
                    confirmPasswordError ? 'border-red-500' : 'border-[#30363d]'
                  }`}
                  placeholder="再次输入新密码"
                />
                {confirmPasswordError && (
                  <p className="mt-1 text-sm text-red-400">{confirmPasswordError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#8b949e] disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                {savingPassword ? '修改中...' : '修改密码'}
              </button>
            </form>
          ) : (
            // 设置密码
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <p className="text-sm text-[#8b949e]">
                  💡 您当前使用验证码登录，可以设置密码以便使用密码登录
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">
                  设置密码
                </label>
                <input
                  type="password"
                  value={setPasswordValue}
                  onChange={(e) => {
                    setSetPasswordValue(e.target.value);
                    if (setPasswordError) setSetPasswordError('');
                  }}
                  className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
                    setPasswordError ? 'border-red-500' : 'border-[#30363d]'
                  }`}
                  placeholder="至少 6 个字符"
                />
                {setPasswordError && (
                  <p className="mt-1 text-sm text-red-400">{setPasswordError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b949e] mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  value={setPasswordConfirm}
                  onChange={(e) => {
                    setSetPasswordConfirm(e.target.value);
                    if (setPasswordConfirmError) setSetPasswordConfirmError('');
                  }}
                  className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
                    setPasswordConfirmError ? 'border-red-500' : 'border-[#30363d]'
                  }`}
                  placeholder="再次输入密码"
                />
                {setPasswordConfirmError && (
                  <p className="mt-1 text-sm text-red-400">{setPasswordConfirmError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={settingPassword}
                className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#8b949e] disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
              >
                {settingPassword ? '设置中...' : '设置密码'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 其他操作 */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d]">
          <h3 className="font-medium text-[#f0f6fc]">⚠️ 其他操作</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#f0f6fc]">退出登录</p>
              <p className="text-sm text-[#8b949e]">退出当前账号</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#f85149] text-sm font-medium rounded-md transition-colors border border-[#30363d]"
            >
              退出登录
            </button>
          </div>
        </div>
        </div>
      </div>
    </main>
    </div>
  );
}
