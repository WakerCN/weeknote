/**
 * 认证页面 - 登录/注册合并
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'login' | 'register';

export default function Auth() {
  const [tab, setTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  /**
   * 处理登录
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      // 错误已在 AuthContext 中处理
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理注册
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) {
      return;
    }

    if (password !== confirmPassword) {
      alert('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (error) {
      // 错误已在 AuthContext 中处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f0f6fc] mb-2">WeekNote</h1>
          <p className="text-[#8b949e]">AI 驱动的工程师周报生成工具</p>
        </div>

        {/* 卡片容器 */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          {/* Tab 切换 */}
          <div className="flex border-b border-[#30363d]">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'text-[#f0f6fc] border-b-2 border-[#1f6feb]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'text-[#f0f6fc] border-b-2 border-[#1f6feb]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              注册
            </button>
          </div>

          {/* 表单内容 */}
          <div className="p-6">
            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                    placeholder="你的名字"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                    placeholder="至少 6 个字符"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
                    确认密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                    placeholder="再次输入密码"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
                >
                  {loading ? '注册中...' : '注册'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-sm text-[#8b949e] mt-6">
          使用邮箱和密码进行认证
        </p>
      </div>
    </div>
  );
}
