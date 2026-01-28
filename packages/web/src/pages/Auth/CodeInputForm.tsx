/**
 * 验证码输入表单组件
 * 用于验证码登录的验证码输入
 */

import CodeInput from '../../components/CodeInput';
import { maskEmail } from '../../lib/validators';

interface CodeInputFormProps {
  email: string;
  code: string;
  error?: string;
  loading: boolean;
  countdown: number;
  isCountdownActive: boolean;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  onResend: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

export default function CodeInputForm({
  email,
  code,
  error,
  loading,
  countdown,
  isCountdownActive,
  onChange,
  onComplete,
  onResend,
  onSubmit,
  onBack,
}: CodeInputFormProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">📬</div>
        <h3 className="text-lg font-medium text-[#f0f6fc] mb-1">验证码已发送</h3>
        <p className="text-sm text-[#8b949e]">已发送到 {maskEmail(email)}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-3 text-center">
          请输入6位验证码
        </label>
        <CodeInput
          value={code}
          onChange={onChange}
          onComplete={onComplete}
          disabled={loading}
          error={!!error}
        />
        {error && <p className="mt-2 text-sm text-red-400 text-center">{error}</p>}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || code.length !== 6}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '登录中...' : '✓ 确认登录'}
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
          ← 换个邮箱
        </button>
      </div>
    </div>
  );
}
