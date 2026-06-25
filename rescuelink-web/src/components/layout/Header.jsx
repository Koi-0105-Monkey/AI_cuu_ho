import { Bell } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ title, liveCount = 0 }) {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-surface-4 bg-surface-1/80 backdrop-blur-md
                       flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-white font-semibold text-base">{title}</h1>
        {liveCount > 0 && (
          <span className="badge bg-emergency-600/20 text-emergency-400 border border-emergency-600/30 text-[11px]">
            <span className="live-dot" />
            {liveCount} đang mở
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative btn-ghost p-2 text-muted-light">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-surface-4">
          <div className="w-7 h-7 rounded-full bg-emergency-600/30 flex items-center justify-center">
            <span className="text-emergency-400 text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
            <p className="text-xs text-muted leading-none mt-0.5 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
