/**
 * 忘记密码表单组件
 */

interface ForgotPasswordFormProps {
  email: string;
  error?: string;
  loading: boolean;
  onChange: (email: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export default function ForgotPasswordForm({
  email,
  error,
  loading,
  onChange,
  onSubmit,
  onBack,
}: ForgotPasswordFormProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-medium text-[#f0f6fc]">重置密码</h3>
        <p className="text-sm text-[#8b949e] mt-1">请输入您的注册邮箱</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          邮箱
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            error ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="your@email.com"
          disabled={loading}
          autoFocus
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading || !email}
        className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#1a4c28] disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {loading ? '发送中...' : '📨 发送验证码'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#8b949e] hover:text-[#c9d1d9]"
        >
          ← 返回登录
        </button>
      </div>
    </div>
  );
}
