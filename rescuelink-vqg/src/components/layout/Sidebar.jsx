import { NavLink } from 'react-router-dom';
import { Gauge, Warning, MapPin, Tree, SignOut } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/',          icon: Gauge,   label: 'Giám Sát Vùng' },
  { to: '/incidents', icon: Warning, label: 'Báo Cáo SOS' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-[230px] min-h-screen bg-[#070e0a] border-r border-[#142a1e]
                      flex flex-col py-6 px-4 shrink-0">
      {/* VQG Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
          <Tree size={18} weight="fill" className="text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">
          VQG <span className="text-emerald-400">RescuePortal</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold
               transition-all duration-150 cursor-pointer
               ${isActive
                 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                 : 'text-slate-400 hover:text-white hover:bg-[#0b140f]'
               }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Authority User */}
      <div className="border-t border-[#142a1e] pt-4 mt-4">
        <div className="px-2 mb-3">
          <p className="text-[10px] text-slate-500 font-bold uppercase">Thẩm Quyền</p>
          <p className="text-xs font-medium text-white truncate">{user?.name || 'Vườn Quốc Gia'}</p>
          <p className="text-[10px] text-slate-400 truncate">{user?.phone}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-red-950/20 transition-all"
        >
          <SignOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
