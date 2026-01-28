/**
 * 密码登录表单组件
 */

import { Checkbox } from '../../components/ui/checkbox';

interface PasswordLoginFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  emailError?: string;
  passwordError?: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onRememberMeChange: (rememberMe: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
}

export default function PasswordLoginForm({
  email,
  password,
  rememberMe,
  emailError,
  passwordError,
  loading,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
  onForgotPassword,
  onRegister,
}: PasswordLoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            emailError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="请输入你的邮箱"
          disabled={loading}
        />
        {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            passwordError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="请输入密码"
          disabled={loading}
        />
        {passwordError && <p className="mt-1 text-sm text-red-400">{passwordError}</p>}
      </div>

      {/* 记住我 */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => !loading && onRememberMeChange(!rememberMe)}
      >
        <Checkbox
          checked={rememberMe}
          onChange={onRememberMeChange}
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
          onClick={onForgotPassword}
          className="text-[#58a6ff] hover:underline"
        >
          忘记密码？
        </button>
        <span className="text-[#30363d]">|</span>
        <button
          type="button"
          onClick={onRegister}
          className="text-[#58a6ff] hover:underline"
        >
          没有账号？去注册
        </button>
      </div>
    </form>
  );
}
