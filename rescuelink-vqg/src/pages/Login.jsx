import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tree, Lock, Eye, EyeSlash } from '@phosphor-icons/react';
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
    if (!phone || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
      toast.success('Đăng nhập cổng VQG thành công');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Số điện thoại hoặc mật khẩu không đúng');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040906] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Visual forest styling */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20 mb-4">
            <Tree size={28} weight="fill" className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            VQG <span className="text-emerald-400">RescuePortal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Cục Kiểm Lâm & Ban Quản Lý VQG</p>
        </div>

        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-white">Đăng nhập Thẩm Quyền</h2>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Số điện thoại</label>
              <input
                type="text" required
                placeholder="Nhập số điện thoại"
                value={phone} onChange={e => setPhone(e.target.value)}
                className="input-field font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  placeholder="Nhập mật khẩu"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPw ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-2.5 mt-2 flex items-center justify-center"
            >
              {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP CỔNG VQG'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
