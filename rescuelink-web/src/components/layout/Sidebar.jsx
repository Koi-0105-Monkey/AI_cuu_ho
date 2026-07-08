import { NavLink, useLocation } from 'react-router-dom';
import {
  Gauge, Warning, MapPin, Users, SignOut, Compass, Heartbeat, House, X, Globe, Suitcase, ChartLine
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

const RESCUE_NAV_ITEMS = [
  { to: '/dashboard',           icon: Gauge,     label: 'Dashboard HQ' },
  { to: '/incidents',           icon: Warning,   label: 'Sự Cố & Cứu Hộ' },
  { to: '/dashboard/analytics', icon: ChartLine, label: 'Hiệu Suất Cứu Hộ' },
  { to: '/dashboard/trails',    icon: Compass,   label: 'Cung Đường An Toàn' },
  { to: '/users',               icon: Users,     label: 'Người Dùng' },
];

const OPERATOR_NAV_ITEMS = [
  { to: '/operator',           icon: Gauge,     label: 'Dashboard Tour' },
  { to: '/operator/groups',    icon: Users,     label: 'Quản Lý Đoàn' },
  { to: '/operator/manifests', icon: Heartbeat, label: 'Khai Báo Y Tế' },
  { to: '/operator/analytics', icon: Warning,   label: 'Thống Kê Tour' },
  { to: '/operator/trails',    icon: Compass,   label: 'Cung Đường An Toàn' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const isAtOperatorPortal = pathname.startsWith('/operator');
  const showOperatorMenu = user?.role === 'operator' || isAtOperatorPortal;
  const navItems = showOperatorMenu ? OPERATOR_NAV_ITEMS : RESCUE_NAV_ITEMS;

  const sidebarContent = (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Logo & Close Button for Mobile */}
      <div className="flex items-center justify-between gap-2.5 mb-6 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emergency-600 flex items-center justify-center shadow-lg shadow-emergency-600/30">
            <MapPin size={18} weight="fill" className="text-white" />
          </div>
          <span className="text-white font-extrabold text-base tracking-tight">
            Rescue<span className="text-emergency-400">Link</span>
          </span>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-3 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Main Role Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        <p className="text-[10px] text-slate-500 font-bold uppercase px-3 mb-1">
          {showOperatorMenu ? 'Phân Hệ Tour Operator' : 'Phân Hệ Chỉ Huy HQ'}
        </p>

        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard' || to === '/operator'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
               transition-all duration-150 cursor-pointer
               ${isActive
                 ? 'bg-emergency-600/20 text-emergency-400 border border-emergency-600/30 shadow-sm'
                 : 'text-muted-light hover:text-white hover:bg-surface-3'
               }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Dedicated Admin Portal Switcher Box */}
        {user?.role === 'admin' && (
          <div className="mt-6 pt-4 border-t border-surface-4 space-y-1.5">
            <p className="text-[10px] text-muted-light font-bold uppercase tracking-wider px-2 mb-2">⚡ Portal Switcher</p>

            <div className="grid grid-cols-1 gap-1.5 bg-surface-2/60 p-2 rounded-xl border border-surface-4 text-xs font-medium">
              <NavLink
                to="/dashboard"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-surface-3'}`
                }
              >
                <Gauge size={16} className="text-red-400" />
                <span>1. Cổng Cứu Hộ HQ</span>
              </NavLink>

              <NavLink
                to="/operator"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-surface-3'}`
                }
              >
                <Suitcase size={16} className="text-emerald-400" />
                <span>2. Cổng Operator Tour</span>
              </NavLink>

              <NavLink
                to="/"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-surface-3'}`
                }
              >
                <Globe size={16} className="text-sky-400" />
                <span>3. Trang Chủ Công Cộng</span>
              </NavLink>

              <NavLink
                to="/dashboard/trails"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-surface-3'}`
                }
              >
                <Compass size={16} className="text-purple-400" />
                <span>4. Cung Đường An Toàn</span>
              </NavLink>

              <NavLink
                to="/dashboard/portal"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-300 hover:bg-surface-3'}`
                }
              >
                <Users size={16} className="text-pink-400" />
                <span>5. Web Trekker Cá Nhân</span>
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-surface-4 pt-4 mt-4">
        <div className="px-2 mb-3">
          <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Đang đăng nhập với</p>
          <p className="text-xs font-bold text-white truncate mt-0.5">{user?.name || 'Admin HQ'}</p>
          <span className="text-[10px] text-emerald-400 font-mono capitalize inline-block bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded mt-1">
            Role: {user?.role}
          </span>
        </div>
        <button
          onClick={() => {
            if (onClose) onClose();
            logout();
          }}
          className="btn-ghost w-full justify-start text-xs font-semibold text-slate-300 hover:text-red-400"
        >
          <SignOut size={16} />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-[220px] min-h-screen bg-surface-1 border-r border-surface-4 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Content */}
          <div className="relative w-[260px] max-w-[80vw] bg-surface-1 border-r border-surface-4 shadow-2xl z-10 flex flex-col h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
