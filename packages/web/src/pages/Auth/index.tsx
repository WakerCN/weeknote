/**
 * 认证页面 - 登录/注册/验证码登录
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
} from '../../lib/validators';
import { useAuthForm } from './useAuthForm';
import { useCountdown } from './useCountdown';
import EmailInputForm from './EmailInputForm';
import CodeInputForm from './CodeInputForm';
import PasswordLoginForm from './PasswordLoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';

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
  const [loading, setLoading] = useState(false);

  // 使用Hooks管理状态
  const form = useAuthForm();
  const countdown = useCountdown();

  const {
    login,
    register,
    sendLoginCode,
    loginWithCode,
    sendResetCode,
    resetPassword,
  } = useAuth();
  const navigate = useNavigate();

  // 切换 Tab 时重置状态
  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setPageState(newTab === 'code' ? 'input-email' : 'login');
    form.clearErrors();
    form.setField('code', '');
  };

  /**
   * 发送登录验证码
   */
  const handleSendLoginCode = async () => {
    const error = validateEmail(form.formData.email);
    if (error) {
      form.setError('email', error);
      return;
    }

    setLoading(true);
    try {
      await sendLoginCode(form.formData.email);
      setPageState('input-code');
      countdown.start(60);
      form.setField('code', '');
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
    const codeToUse = codeValue || form.formData.code;
    if (codeToUse.length !== 6) {
      form.setError('code', '请输入完整的6位验证码');
      return;
    }

    setLoading(true);
    form.setError('code', '');
    try {
      await loginWithCode(form.formData.email, codeToUse);
      navigate('/');
    } catch {
      form.setError('code', '验证码错误或已过期');
      form.setField('code', '');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重新发送验证码
   */
  const handleResendCode = async () => {
    if (countdown.isActive) return;

    setLoading(true);
    try {
      if (pageState === 'input-code') {
        await sendLoginCode(form.formData.email);
      } else if (pageState === 'reset') {
        await sendResetCode(form.formData.email);
      }
      countdown.start(60);
      form.setField('code', '');
      form.setError('code', '');
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

    const emailErr = validateEmail(form.formData.email);
    const passwordErr = form.formData.password ? '' : '请输入密码';

    if (emailErr || passwordErr) {
      if (emailErr) form.setError('email', emailErr);
      if (passwordErr) form.setError('password', passwordErr);
      return;
    }

    setLoading(true);
    try {
      await login(form.formData.email, form.formData.password);
      // 根据"记住我"状态保存或清除邮箱
      if (form.formData.rememberMe) {
        localStorage.setItem('rememberedEmail', form.formData.email);
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

    const emailErr = validateEmail(form.formData.email);
    const nameErr = validateName(form.formData.name);
    const passwordErr = validatePassword(form.formData.password);
    const confirmErr = validateConfirmPassword(
      form.formData.password,
      form.formData.confirmPassword
    );

    if (emailErr || nameErr || passwordErr || confirmErr) {
      if (emailErr) form.setError('email', emailErr);
      if (nameErr) form.setError('name', nameErr);
      if (passwordErr) form.setError('password', passwordErr);
      if (confirmErr) form.setError('confirmPassword', confirmErr);
      return;
    }

    setLoading(true);
    try {
      await register(form.formData.email, form.formData.password, form.formData.name);
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
    const error = validateEmail(form.formData.email);
    if (error) {
      form.setError('email', error);
      return;
    }

    setLoading(true);
    try {
      await sendResetCode(form.formData.email);
      setPageState('reset');
      countdown.start(60);
      form.setField('code', '');
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

    if (form.formData.code.length !== 6) {
      form.setError('code', '请输入完整的6位验证码');
      return;
    }

    const passwordErr = validatePassword(form.formData.password);
    const confirmErr = validateConfirmPassword(
      form.formData.password,
      form.formData.confirmPassword
    );

    if (passwordErr || confirmErr) {
      if (passwordErr) form.setError('password', passwordErr);
      if (confirmErr) form.setError('confirmPassword', confirmErr);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(form.formData.email, form.formData.code, form.formData.password);
      // 重置成功，跳转到密码登录
      setTab('password');
      setPageState('login');
      form.setField('password', '');
      form.setField('confirmPassword', '');
      form.setField('code', '');
    } catch {
      form.setError('code', '验证码错误或已过期');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 验证码输入完成回调
   */
  const handleCodeComplete = useCallback(
    (completedCode: string) => {
      if (pageState === 'input-code') {
        handleCodeLogin(completedCode);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageState]
  );

  /**
   * 根据状态渲染内容
   */
  const renderContent = () => {
    switch (pageState) {
      case 'input-email':
        return (
          <EmailInputForm
            email={form.formData.email}
            error={form.errors.email}
            loading={loading}
            onChange={(email) => form.setField('email', email)}
            onBlur={() => {
              const error = validateEmail(form.formData.email);
              if (error) form.setError('email', error);
            }}
            onSubmit={handleSendLoginCode}
          />
        );
      case 'input-code':
        return (
          <CodeInputForm
            email={form.formData.email}
            code={form.formData.code}
            error={form.errors.code}
            loading={loading}
            countdown={countdown.countdown}
            isCountdownActive={countdown.isActive}
            onChange={(code) => form.setField('code', code)}
            onComplete={handleCodeComplete}
            onResend={handleResendCode}
            onSubmit={() => handleCodeLogin()}
            onBack={() => {
              setPageState('input-email');
              form.setField('code', '');
              form.setError('code', '');
            }}
          />
        );
      case 'login':
        return (
          <PasswordLoginForm
            email={form.formData.email}
            password={form.formData.password}
            rememberMe={form.formData.rememberMe}
            emailError={form.errors.email}
            passwordError={form.errors.password}
            loading={loading}
            onEmailChange={(email) => form.setField('email', email)}
            onPasswordChange={(password) => form.setField('password', password)}
            onRememberMeChange={(rememberMe) => form.setField('rememberMe', rememberMe)}
            onSubmit={handlePasswordLogin}
            onForgotPassword={() => {
              setPageState('forgot');
              form.clearErrors();
            }}
            onRegister={() => {
              setPageState('register');
              form.clearErrors();
            }}
          />
        );
      case 'register':
        return (
          <RegisterForm
            email={form.formData.email}
            name={form.formData.name}
            password={form.formData.password}
            confirmPassword={form.formData.confirmPassword}
            emailError={form.errors.email}
            nameError={form.errors.name}
            passwordError={form.errors.password}
            confirmPasswordError={form.errors.confirmPassword}
            loading={loading}
            onEmailChange={(email) => form.setField('email', email)}
            onNameChange={(name) => form.setField('name', name)}
            onPasswordChange={(password) => form.setField('password', password)}
            onConfirmPasswordChange={(confirmPassword) =>
              form.setField('confirmPassword', confirmPassword)
            }
            onSubmit={handleRegister}
            onBack={() => {
              setPageState('login');
              form.clearErrors();
            }}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordForm
            email={form.formData.email}
            error={form.errors.email}
            loading={loading}
            onChange={(email) => form.setField('email', email)}
            onSubmit={handleSendResetCode}
            onBack={() => {
              setPageState('login');
              form.clearErrors();
            }}
          />
        );
      case 'reset':
        return (
          <ResetPasswordForm
            email={form.formData.email}
            code={form.formData.code}
            password={form.formData.password}
            confirmPassword={form.formData.confirmPassword}
            codeError={form.errors.code}
            passwordError={form.errors.password}
            confirmPasswordError={form.errors.confirmPassword}
            loading={loading}
            countdown={countdown.countdown}
            isCountdownActive={countdown.isActive}
            onCodeChange={(code) => form.setField('code', code)}
            onPasswordChange={(password) => form.setField('password', password)}
            onConfirmPasswordChange={(confirmPassword) =>
              form.setField('confirmPassword', confirmPassword)
            }
            onResend={handleResendCode}
            onSubmit={handleResetPassword}
            onBack={() => {
              setPageState('login');
              setTab('password');
              form.clearErrors();
            }}
          />
        );
      default:
        return (
          <EmailInputForm
            email={form.formData.email}
            error={form.errors.email}
            loading={loading}
            onChange={(email) => form.setField('email', email)}
            onSubmit={handleSendLoginCode}
          />
        );
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
          <div className="p-6">{renderContent()}</div>
        </div>

        {/* 底部提示 */}
        <p className="text-center text-sm text-[#8b949e] mt-6">
          使用邮箱进行安全认证
        </p>
      </div>
    </div>
  );
}
