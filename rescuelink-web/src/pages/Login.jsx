import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) { toast.error('Vui lòng nhập đầy đủ thông tin'); return; }
    setLoading(true);
    try {
      const data = await login(phone, password);
      const userRole = data.user?.role;

      if (!['admin', 'rescuer', 'operator'].includes(userRole)) {
        toast.error('Tài khoản không có quyền truy cập hệ thống.');
        setLoading(false);
        return;
      }

      toast.success('Đăng nhập thành công');
      if (userRole === 'operator') {
        navigate('/operator');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emergency-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emergency-600 flex items-center justify-center shadow-emergency mb-4">
            <MapPin size={28} weight="fill" className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Rescue<span className="text-emergency-400">Link</span>
          </h1>
          <p className="text-sm text-muted mt-1">Hệ thống quản lý cứu hộ</p>
        </div>

        {/* Card */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-white">Đăng nhập Admin</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0901234567"
                autoComplete="username"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPw ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-1 disabled:opacity-50"
            >
              <Lock size={16} />
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          © 2026 RescueLink · Chỉ dành cho nhân viên nội bộ
        </p>
      </div>
    </div>
  );
}
