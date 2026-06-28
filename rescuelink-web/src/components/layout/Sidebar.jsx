import { NavLink, useLocation } from 'react-router-dom';
import {
  Gauge, Warning, MapPin, Users, SignOut
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

const RESCUE_NAV_ITEMS = [
  { to: '/',          icon: Gauge,   label: 'Dashboard' },
  { to: '/incidents', icon: Warning, label: 'Sự cố' },
  { to: '/users',     icon: Users,   label: 'Người dùng' },
];

const OPERATOR_NAV_ITEMS = [
  { to: '/operator',           icon: Gauge,   label: 'Dashboard' },
  { to: '/operator/groups',    icon: Users,   label: 'Quản lý Đoàn' },
  { to: '/operator/analytics', icon: Warning, label: 'Thống Kê' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const isAtOperatorPortal = pathname.startsWith('/operator');
  const showOperatorMenu = user?.role === 'operator' || isAtOperatorPortal;
  const navItems = showOperatorMenu ? OPERATOR_NAV_ITEMS : RESCUE_NAV_ITEMS;

  return (
    <aside className="w-[220px] min-h-screen bg-surface-1 border-r border-surface-4
                      flex flex-col py-6 px-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center">
          <MapPin size={18} weight="fill" className="text-white" />
        </div>
        <span className="text-white font-semibold text-base tracking-tight">
          Rescue<span className="text-emergency-400">Link</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/operator'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
               transition-all duration-150 cursor-pointer
               ${isActive
                 ? 'bg-emergency-600/20 text-emergency-400 border border-emergency-600/30'
                 : 'text-muted-light hover:text-white hover:bg-surface-3'
               }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Nút chuyển đổi nhanh cho Admin để tiện test */}
        {user?.role === 'admin' && (
          <div className="mt-4 pt-4 border-t border-surface-4 gap-1 flex flex-col">
            <p className="text-[10px] text-slate-500 font-bold uppercase px-3 mb-1">Admin Switch</p>
            <NavLink
              to={isAtOperatorPortal ? '/' : '/operator'}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 hover:bg-surface-3 transition-all"
            >
              <Gauge size={16} />
              {isAtOperatorPortal ? '→ Cổng Cứu Hộ (HQ)' : '→ Cổng Operator'}
            </NavLink>
          </div>
        )}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-surface-4 pt-4 mt-4">
        <div className="px-2 mb-3">
          <p className="text-xs text-muted">Đăng nhập với</p>
          <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
          <p className="text-xs text-muted truncate">{user?.phone}</p>
        </div>
        <button
          onClick={logout}
          className="btn-ghost w-full justify-start text-sm"
        >
          <SignOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
