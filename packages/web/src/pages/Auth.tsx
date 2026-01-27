/**
 * 认证页面 - 登录/注册/验证码登录
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CodeInput from '../components/CodeInput';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  maskEmail,
} from '../lib/validators';
import { Checkbox } from '../components/ui/checkbox';

/** 登录方式 Tab */
type AuthTab = 'code' | 'password';

/** 页面状态 */
type PageState =
  | 'input-email'      // 输入邮箱（验证码登录）
  | 'input-code'       // 输入验证码
  | 'login'            // 密码登录
  | 'register'         // 注册
  | 'forgot'           // 忘记密码
  | 'reset';           // 重置密码

export default function Auth() {
  const [tab, setTab] = useState<AuthTab>('code');
  const [pageState, setPageState] = useState<PageState>('input-email');
  
  // 表单字段
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // 错误状态
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    login,
    register,
    sendLoginCode,
    loginWithCode,
    sendResetCode,
    resetPassword,
  } = useAuth();
  const navigate = useNavigate();

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 初始化时读取记住的邮箱
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // 切换 Tab 时重置状态
  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setPageState(newTab === 'code' ? 'input-email' : 'login');
    clearErrors();
    setCode('');
  };

  // 清除错误
  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setNameError('');
    setCodeError('');
  };

  /**
   * 发送登录验证码
   */
  const handleSendLoginCode = async () => {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }

    setLoading(true);
    try {
      await sendLoginCode(email);
      setPageState('input-code');
      setCountdown(60);
      setCode('');
    } catch {
      // 错误已在 AuthContext 中处理
    } finally {
      setLoading(false);
    }
  };

  /**
   * 验证码登录
   */
  const handleCodeLogin = async (codeValue?: string) => {
    const codeToUse = codeValue || code;
    if (codeToUse.length !== 6) {
      setCodeError('请输入完整的6位验证码');
      return;
    }

    setLoading(true);
    setCodeError('');
    try {
      await loginWithCode(email, codeToUse);
      navigate('/');
    } catch {
      setCodeError('验证码错误或已过期');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重新发送验证码
   */
  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      if (pageState === 'input-code') {
        await sendLoginCode(email);
      } else if (pageState === 'reset') {
        await sendResetCode(email);
      }
      setCountdown(60);
      setCode('');
      setCodeError('');
    } catch {
      // 错误已处理
    } finally {
      setLoading(false);
    }
  };

  /**
   * 密码登录
   */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const passwordErr = password ? '' : '请输入密码';

    if (emailErr || passwordErr) {
      setEmailError(emailErr);
      setPasswordError(passwordErr);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // 根据"记住我"状态保存或清除邮箱
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      navigate('/');
    } catch {
      // 错误已处理
    } finally {
      setLoading(false);
    }
  };

  /**
   * 注册
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    const nameErr = validateName(name);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);

    if (emailErr || nameErr || passwordErr || confirmErr) {
      setEmailError(emailErr);
      setNameError(nameErr);
      setPasswordError(passwordErr);
      setConfirmPasswordError(confirmErr);
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch {
      // 错误已处理
    } finally {
      setLoading(false);
    }
  };

  /**
   * 发送重置密码验证码
   */
  const handleSendResetCode = async () => {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }

    setLoading(true);
    try {
      await sendResetCode(email);
      setPageState('reset');
      setCountdown(60);
      setCode('');
    } catch {
      // 错误已处理
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置密码
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setCodeError('请输入完整的6位验证码');
      return;
    }

    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);

    if (passwordErr || confirmErr) {
      setPasswordError(passwordErr);
      setConfirmPasswordError(confirmErr);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, code, password);
      // 重置成功，跳转到密码登录
      setTab('password');
      setPageState('login');
      setPassword('');
      setConfirmPassword('');
      setCode('');
    } catch {
      setCodeError('验证码错误或已过期');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 验证码输入完成回调
   */
  const handleCodeComplete = useCallback((completedCode: string) => {
    if (pageState === 'input-code') {
      handleCodeLogin(completedCode);
    }
  }, [pageState, email]);

  /**
   * 渲染验证码登录 - 输入邮箱
   */
  const renderInputEmail = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          onBlur={() => setEmailError(validateEmail(email))}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            emailError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="your@email.com"
          disabled={loading}
          autoFocus
        />
        {emailError && (
          <p className="mt-1 text-sm text-red-400">{emailError}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSendLoginCode}
        disabled={loading || !email}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            发送中...
          </>
        ) : (
          <>
            📨 发送验证码
          </>
        )}
      </button>

      <p className="text-center text-sm text-[#8b949e]">
        💡 无需注册，首次登录自动创建账号
      </p>
    </div>
  );

  /**
   * 渲染验证码输入
   */
  const renderInputCode = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">📬</div>
        <h3 className="text-lg font-medium text-[#f0f6fc] mb-1">验证码已发送</h3>
        <p className="text-sm text-[#8b949e]">
          已发送到 {maskEmail(email)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-3 text-center">
          请输入6位验证码
        </label>
        <CodeInput
          value={code}
          onChange={(val) => {
            setCode(val);
            if (codeError) setCodeError('');
          }}
          onComplete={handleCodeComplete}
          disabled={loading}
          error={!!codeError}
        />
        {codeError && (
          <p className="mt-2 text-sm text-red-400 text-center">{codeError}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => handleCodeLogin()}
        disabled={loading || code.length !== 6}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '登录中...' : '✓ 确认登录'}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm">
        {countdown > 0 ? (
          <span className="text-[#8b949e]">⏱️ {countdown}秒后可重新发送</span>
        ) : (
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="text-[#58a6ff] hover:underline disabled:opacity-50"
          >
            🔄 重新发送
          </button>
        )}
        <span className="text-[#30363d]">|</span>
        <button
          type="button"
          onClick={() => {
            setPageState('input-email');
            setCode('');
            setCodeError('');
          }}
          className="text-[#8b949e] hover:text-[#c9d1d9]"
        >
          ← 换个邮箱
        </button>
      </div>
    </div>
  );

  /**
   * 渲染密码登录
   */
  const renderPasswordLogin = () => (
    <form onSubmit={handlePasswordLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            emailError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="your@email.com"
          disabled={loading}
        />
        {emailError && (
          <p className="mt-1 text-sm text-red-400">{emailError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            passwordError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="••••••••"
          disabled={loading}
        />
        {passwordError && (
          <p className="mt-1 text-sm text-red-400">{passwordError}</p>
        )}
      </div>

      {/* 记住我 */}
      <div 
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => !loading && setRememberMe(!rememberMe)}
      >
        <Checkbox
          checked={rememberMe}
          onChange={setRememberMe}
          disabled={loading}
          size="sm"
        />
        <span className="text-sm text-[#8b949e]">📌 记住我</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '登录中...' : '🔓 登录'}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => {
            setPageState('forgot');
            clearErrors();
          }}
          className="text-[#58a6ff] hover:underline"
        >
          忘记密码？
        </button>
        <span className="text-[#30363d]">|</span>
        <button
          type="button"
          onClick={() => {
            setPageState('register');
            clearErrors();
          }}
          className="text-[#58a6ff] hover:underline"
        >
          没有账号？去注册
        </button>
      </div>
    </form>
  );

  /**
   * 渲染注册表单
   */
  const renderRegister = () => (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            emailError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="your@email.com"
          disabled={loading}
        />
        {emailError && (
          <p className="mt-1 text-sm text-red-400">{emailError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          用户名
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            nameError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="你的名字"
          disabled={loading}
        />
        {nameError && (
          <p className="mt-1 text-sm text-red-400">{nameError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            passwordError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="至少 6 个字符"
          disabled={loading}
        />
        {passwordError && (
          <p className="mt-1 text-sm text-red-400">{passwordError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          确认密码
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
          placeholder="再次输入密码"
          disabled={loading}
        />
        {confirmPasswordError && (
          <p className="mt-1 text-sm text-red-400">{confirmPasswordError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '注册中...' : '注册'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setPageState('login');
            clearErrors();
          }}
          className="text-sm text-[#58a6ff] hover:underline"
        >
          ← 返回登录
        </button>
      </div>
    </form>
  );

  /**
   * 渲染忘记密码
   */
  const renderForgotPassword = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-medium text-[#f0f6fc]">重置密码</h3>
        <p className="text-sm text-[#8b949e] mt-1">
          请输入您的注册邮箱
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            emailError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="your@email.com"
          disabled={loading}
          autoFocus
        />
        {emailError && (
          <p className="mt-1 text-sm text-red-400">{emailError}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSendResetCode}
        disabled={loading || !email}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '发送中...' : '📨 发送验证码'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setPageState('login');
            clearErrors();
          }}
          className="text-sm text-[#8b949e] hover:text-[#c9d1d9]"
        >
          ← 返回登录
        </button>
      </div>
    </div>
  );

  /**
   * 渲染重置密码
   */
  const renderResetPassword = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="text-center mb-4">
        <div className="text-4xl mb-3">📬</div>
        <h3 className="text-lg font-medium text-[#f0f6fc]">验证码已发送</h3>
        <p className="text-sm text-[#8b949e]">
          已发送到 {maskEmail(email)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-3 text-center">
          验证码
        </label>
        <CodeInput
          value={code}
          onChange={(val) => {
            setCode(val);
            if (codeError) setCodeError('');
          }}
          disabled={loading}
          error={!!codeError}
          autoFocus
        />
        {codeError && (
          <p className="mt-2 text-sm text-red-400 text-center">{codeError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          新密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            passwordError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="至少 6 个字符"
          disabled={loading}
        />
        {passwordError && (
          <p className="mt-1 text-sm text-red-400">{passwordError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
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
          disabled={loading}
        />
        {confirmPasswordError && (
          <p className="mt-1 text-sm text-red-400">{confirmPasswordError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '重置中...' : '✓ 重置密码'}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm">
        {countdown > 0 ? (
          <span className="text-[#8b949e]">⏱️ {countdown}秒后可重新发送</span>
        ) : (
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="text-[#58a6ff] hover:underline disabled:opacity-50"
          >
            🔄 重新发送
          </button>
        )}
        <span className="text-[#30363d]">|</span>
        <button
          type="button"
          onClick={() => {
            setPageState('login');
            setTab('password');
            clearErrors();
          }}
          className="text-[#8b949e] hover:text-[#c9d1d9]"
        >
          ← 返回登录
        </button>
      </div>
    </form>
  );

  /**
   * 根据状态渲染内容
   */
  const renderContent = () => {
    switch (pageState) {
      case 'input-email':
        return renderInputEmail();
      case 'input-code':
        return renderInputCode();
      case 'login':
        return renderPasswordLogin();
      case 'register':
        return renderRegister();
      case 'forgot':
        return renderForgotPassword();
      case 'reset':
        return renderResetPassword();
      default:
        return renderInputEmail();
    }
  };

  // 是否显示 Tab 切换
  const showTabs = ['input-email', 'login'].includes(pageState);

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
          {showTabs && (
            <div className="flex border-b border-[#30363d]">
              <button
                onClick={() => handleTabChange('code')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tab === 'code'
                    ? 'text-[#f0f6fc] border-b-2 border-[#1f6feb]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                📧 验证码登录
              </button>
              <button
                onClick={() => handleTabChange('password')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tab === 'password'
                    ? 'text-[#f0f6fc] border-b-2 border-[#1f6feb]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              >
                🔑 密码登录
              </button>
            </div>
          )}

          {/* 表单内容 */}
          <div className="p-6">
            {renderContent()}
          </div>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-sm text-[#8b949e] mt-6">
          使用邮箱进行安全认证
        </p>
      </div>
    </div>
  );
}
