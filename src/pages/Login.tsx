import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Fish, Waves, Eye, EyeOff, User, Lock } from 'lucide-react';
import { useAuthStore, roleLabels } from '../store/authStore.js';
import type { UserRole, LoginRequest } from '../types.js';

const roleOptions: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: '管理员', description: '系统全面管理' },
  { value: 'farmer', label: '养殖户', description: '养殖生产作业' },
  { value: 'technician', label: '技术人员', description: '水质监测与技术支持' },
  { value: 'finance', label: '财务', description: '财务报表与核算' },
];

const defaultAccounts: Record<UserRole, { username: string; password: string }> = {
  admin: { username: 'admin', password: 'admin123' },
  farmer: { username: 'farmer', password: 'farmer123' },
  technician: { username: 'technician', password: 'tech123' },
  finance: { username: 'finance', password: 'finance123' },
};

export const Login = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const { login, loading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    const account = defaultAccounts[selectedRole];
    setUsername(account.username);
    setPassword(account.password);
    clearError();
  }, [selectedRole, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const request: LoginRequest = { username, password, role: selectedRole };
    const success = await login(request);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-ocean-gradient flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ocean-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="glass-card overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Fish className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold ocean-text">海洋牧场</h1>
                  <p className="text-white/60 text-sm">综合管理平台</p>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">欢迎回来</h2>
              <p className="text-white/60 mb-8">请选择您的身份并登录系统</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      selectedRole === role.value
                        ? 'border-teal-400 bg-teal-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="font-medium text-white">{role.label}</div>
                    <div className="text-xs text-white/50">{role.description}</div>
                  </button>
                  ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">用户名</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-field pl-12"
                      placeholder="请输入用户名"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-12 pr-12"
                      placeholder="请输入密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-coral-500/20 border border-coral-500/30 rounded-xl text-coral-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-4 text-lg font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      登录中...
                    </>
                  ) : (
                    <>登录系统</>
                  )}
                </button>
              </form>

              <p className="text-center text-white/40 text-xs mt-6">
                身份: {roleLabels[selectedRole]} 账号 {defaultAccounts[selectedRole].username} / {defaultAccounts[selectedRole].password}
              </p>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-teal-500/20 to-blue-500/20 p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptLTYgMGg0djFoLTR2LTF6bTEyLTZoLTR2MWg0di0xem0tNiAwaC00djFoNHYtMXptLTYgMGgtNHYxaDR2LTF6bTEyLTZoLTR2MWg0di0xem0tNiAwaC00djFoNHYtMXptLTYgMGgtNHYxaDR2LTF6Ii8+PC9nPjwvZz48L3N2Zz4=')]"></div>
              <div className="relative z-10 text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-teal-400/30 to-blue-500/30 rounded-full flex items-center justify-center mb-8 mx-auto animate-float">
                  <Waves className="w-16 h-16 text-teal-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">智能海洋牧场</h3>
                <p className="text-white/60 max-w-xs">
                  依托物联网、大数据和人工智能技术，实现水产养殖的智能化、精细化管理，提升养殖效益，保护海洋生态。
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-teal-300">4</div>
                    <div className="text-xs text-white/50">角色类型</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-300">10+</div>
                    <div className="text-xs text-white/50">功能模块</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-teal-300">24/7</div>
                    <div className="text-xs text-white/50">智能监控</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
