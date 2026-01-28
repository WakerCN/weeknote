/**
 * 注册表单组件
 */

interface RegisterFormProps {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  emailError?: string;
  nameError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onNameChange: (name: string) => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (confirmPassword: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export default function RegisterForm({
  email,
  name,
  password,
  confirmPassword,
  emailError,
  nameError,
  passwordError,
  confirmPasswordError,
  loading,
  onEmailChange,
  onNameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onBack,
}: RegisterFormProps) {
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
          placeholder="your@email.com"
          disabled={loading}
        />
        {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          用户名
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
            nameError ? 'border-red-500' : 'border-[#30363d]'
          }`}
          placeholder="你的名字"
          disabled={loading}
        />
        {nameError && <p className="mt-1 text-sm text-red-400">{nameError}</p>}
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
          placeholder="至少 6 个字符"
          disabled={loading}
        />
        {passwordError && <p className="mt-1 text-sm text-red-400">{passwordError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#c9d1d9] mb-2">
          确认密码
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          className={`w-full px-3 py-2 bg-[#0d1117] border rounded-md text-[#f0f6fc] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent ${
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
          onClick={onBack}
          className="text-sm text-[#58a6ff] hover:underline"
        >
          ← 返回登录
        </button>
      </div>
    </form>
  );
}
