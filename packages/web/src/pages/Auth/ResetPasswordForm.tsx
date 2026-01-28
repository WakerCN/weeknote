/**
 * 重置密码表单组件
 */

import CodeInput from '../../components/CodeInput';
import { maskEmail } from '../../lib/validators';

interface ResetPasswordFormProps {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
  codeError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  loading: boolean;
  countdown: number;
  isCountdownActive: boolean;
  onCodeChange: (code: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export default function ResetPasswordForm({
  email,
  code,
  password,
  confirmPassword,
  codeError,
  passwordError,
  confirmPasswordError,
  loading,
  countdown,
  isCountdownActive,
  onCodeChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onResend,
  onSubmit,
  onBack,
}: ResetPasswordFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <div className="text-4xl mb-3">📬</div>
        <h3 className="text-lg font-medium text-[#f0f6fc]">验证码已发送</h3>
        <p className="text-sm text-[#8b949e]">已发送到 {maskEmail(email)}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-3 text-center">
          验证码
        </label>
        <CodeInput
          value={code}
          onChange={onCodeChange}
          disabled={loading}
          error={!!codeError}
          autoFocus
        />
        {codeError && <p className="mt-2 text-sm text-red-400 text-center">{codeError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          新密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            passwordError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="至少 6 个字符"
          disabled={loading}
        />
        {passwordError && <p className="mt-1 text-sm text-red-400">{passwordError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          确认新密码
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
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
        {isCountdownActive ? (
          <span className="text-[#8b949e]">⏱️ {countdown}秒后可重新发送</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="text-[#58a6ff] hover:underline disabled:opacity-50"
          >
            🔄 重新发送
          </button>
        )}
        <span className="text-[#30363d]">|</span>
        <button
          type="button"
          onClick={onBack}
          className="text-[#8b949e] hover:text-[#c9d1d9]"
        >
          ← 返回登录
        </button>
      </div>
    </form>
  );
}
