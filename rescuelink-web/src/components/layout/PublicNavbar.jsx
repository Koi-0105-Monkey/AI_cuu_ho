import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Compass, List, X, ArrowUpRight, PhoneCall } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

export default function PublicNavbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="sticky top-0 z-50 flex justify-center px-4 pt-4 w-full">
      <nav
        className="w-full max-w-6xl rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(13, 17, 23, 0.8)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', boxShadow: '0 0 20px rgba(225,29,72,0.4)' }}>
            <ShieldCheck size={20} className="text-white" weight="fill" />
          </div>
          <div>
            <p className="font-black text-sm text-white tracking-tight leading-none">RESCUELINK</p>
            <p className="text-[9px] text-muted tracking-widest uppercase leading-none mt-0.5">Safety Tech Vietnam</p>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { to: '/', label: 'Trang chủ' },
            { to: '/trails', label: 'Cung Đường' },
            { to: '/portal', label: 'Trekker Portal' },
          ].map(({ to, label }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-emergency-400 bg-emergency-600/10 border border-emergency-500/20'
                    : 'text-muted-light hover:text-white hover:bg-surface-3'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              to={user.role === 'operator' ? '/operator' : '/dashboard'}
              className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 transition-all duration-200"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px] inline-flex mr-1 align-middle">
                {user.name?.[0]?.toUpperCase()}
              </div>
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Đăng nhập
            </Link>
          )}

          <Link
            to="/operator/groups"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              boxShadow: '0 0 16px rgba(225,29,72,0.3)',
            }}
          >
            Doanh Nghiệp <ArrowUpRight size={13} weight="bold" />
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-4 right-4 mt-2 rounded-2xl p-4 space-y-1 z-[9999]"
          style={{
            background: 'rgba(13,17,23,0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            animation: 'menu-open 0.35s cubic-bezier(0.32,0.72,0,1) both',
          }}
        >
          {[
            { to: '/', label: 'Trang Chủ' },
            { to: '/trails', label: 'Cung Đường An Toàn', icon: Compass },
            { to: '/portal', label: 'Trekker Portal' },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:text-white hover:bg-surface-3 transition-all duration-200"
            >
              {Icon && <Icon size={16} className="text-muted-light" />}
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-surface-4 flex flex-col gap-2">
            {user ? (
              <Link to={user.role === 'operator' ? '/operator' : '/dashboard'} onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                Dashboard ({user.name})
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Đăng nhập
              </Link>
            )}
            <Link to="/operator/groups" onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)', boxShadow: '0 0 16px rgba(225,29,72,0.3)' }}
            >
              Dành Cho Doanh Nghiệp →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
