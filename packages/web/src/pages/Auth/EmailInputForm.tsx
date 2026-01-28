/**
 * 邮箱输入表单组件
 * 用于验证码登录的邮箱输入
 */

import { validateEmail } from '../../lib/validators';

interface EmailInputFormProps {
  email: string;
  error?: string;
  loading: boolean;
  onChange: (email: string) => void;
  onBlur?: () => void;
  onSubmit: () => void;
}

export default function EmailInputForm({
  email,
  error,
  loading,
  onChange,
  onBlur,
  onSubmit,
}: EmailInputFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const emailError = validateEmail(email);
            if (emailError && onBlur) {
              onBlur();
            }
          }}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            error ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="请输入你的邮箱"
          disabled={loading}
          autoFocus
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !email}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin">⏳</span>
            发送中...
          </>
        ) : (
          <>📨 发送验证码</>
        )}
      </button>

      <p className="text-center text-sm text-[#8b949e]">
        💡 无需注册，首次登录自动创建账号
      </p>
    </div>
  );
}
